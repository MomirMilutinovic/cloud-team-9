import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import path = require('path');
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { MovieUploadStepFunction } from './movie_upload_step_function';
import { MovieDeleteStepFunction } from './movie_delete_step_function';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambdaNodeJs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import { DynamoEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import * as iam from 'aws-cdk-lib/aws-iam';

export class CloudCinemaBackStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Preuzeto sa: https://bobbyhadz.com/blog/aws-cdk-cognito-user-pool-example
    const userPool = new cognito.UserPool(this, 'userpool', {
      userPoolName: 'cinema-user-pool',
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
      },
      autoVerify: {
        email: true,
      },
      standardAttributes: {
        givenName: {
          required: true,
          mutable: true,
        },
        familyName: {
          required: true,
          mutable: true,
        },
      },
      customAttributes: {
        // Samo string custom atributi su podrzani (https://bobbyhadz.com/blog/aws-cognito-user-attributes)
        isAdmin: new cognito.StringAttribute({mutable: true}),
      },
      passwordPolicy: {
        minLength: 6,
        requireLowercase: true,
        requireDigits: true,
        requireUppercase: false,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const domain = userPool.addDomain('CognitoDomain', {
      cognitoDomain: {
        domainPrefix: 'ftn-cloud-cinema-team-9',
      },
    });

    const standardCognitoAttributes = {
      givenName: true,
      familyName: true,
      email: true,
      emailVerified: true,
      address: true,
      birthdate: true,
      gender: true,
      locale: true,
      middleName: true,
      fullname: true,
      nickname: true,
      phoneNumber: true,
      phoneNumberVerified: true,
      profilePicture: true,
      preferredUsername: true,
      profilePage: true,
      timezone: true,
      lastUpdateTime: true,
      website: true,
    };
    
    const clientReadAttributes = new cognito.ClientAttributes()
      .withStandardAttributes(standardCognitoAttributes)
      .withCustomAttributes(...['isAdmin']);
    
    const clientWriteAttributes = new cognito.ClientAttributes()
      .withStandardAttributes({
        ...standardCognitoAttributes,
        emailVerified: false,
        phoneNumberVerified: false,
      })
    
    const userPoolClient = new cognito.UserPoolClient(this, 'web-client', {
      userPool,
      authFlows: {
        adminUserPassword: true,
        custom: true,
        userSrp: true,
        userPassword: true
      },
      oAuth: {
        flows: {
          implicitCodeGrant: true,
          authorizationCodeGrant: true
        },
        callbackUrls: [
          'https://cloud-cinema-front-bucket.s3.amazonaws.com/index.html',
          'http://localhost:4200'
        ],
        logoutUrls: [
          'https://cloud-cinema-front-bucket.s3.amazonaws.com/index.html',
          'http://localhost:4200'
        ]
      },
      supportedIdentityProviders: [
        cognito.UserPoolClientIdentityProvider.COGNITO,
      ],
      readAttributes: clientReadAttributes,
      writeAttributes: clientWriteAttributes,
    });

    const signInUrl = domain.signInUrl(userPoolClient, {
      redirectUri: 'https://cloud-cinema-front-bucket.s3.amazonaws.com/index.html', // must be a URL configured under 'callbackUrls' with the client
    });

    new cdk.CfnOutput(this, 'userPoolId', {
      value: userPool.userPoolId,
    });
    new cdk.CfnOutput(this, 'userPoolClientId', {
      value: userPoolClient.userPoolClientId,
    });
    new cdk.CfnOutput(this, 'signInUrl', {
      value: signInUrl,
    });

    const userAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(this,
      'user-pool-authorizer',
      {
        cognitoUserPools: [userPool] 
      },
    );

    const authorizeAdminFunction = new lambdaNodeJs.NodejsFunction(this, 'AuthorizeAdminFunction', {
      runtime: lambda.Runtime.NODEJS_LATEST,
      handler: 'handler', 
      entry: path.join(__dirname,'../functions/admin_authorizer.js'),
      timeout: cdk.Duration.seconds(30),
      bundling: {
        nodeModules: ['aws-jwt-verify']
      },
      depsLockFilePath: path.join(__dirname, "../package-lock.json"),
    });
    authorizeAdminFunction.addEnvironment('USER_POOL_ID', userPool.userPoolId);
    authorizeAdminFunction.addEnvironment('CLIENT_ID', userPoolClient.userPoolClientId);

    const adminAuthorizer = new apigateway.TokenAuthorizer(this, 'admin-authorizer', {
      handler: authorizeAdminFunction
    });


    const bucket = new s3.Bucket(this, 'CloudCinemaMoviesBucket', {
      bucketName: 'cloud-cinema-movies-bucket-us', 
      versioned: true, 
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true
    });
    bucket.addCorsRule({
      allowedOrigins: ['*'], 
      allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.DELETE],
      allowedHeaders: ['*']
    }); 

    const ouptutBucket = new s3.Bucket(this, 'CloudCinemaMoviesTranscodedBucket', {
      bucketName: 'cloud-cinema-movies-transcoded-bucket-us', 
      versioned: true, 
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      publicReadAccess: true,
      blockPublicAccess: {
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false,
      },
    });
    ouptutBucket.addCorsRule({
      allowedOrigins: ['*'],
      allowedMethods: [s3.HttpMethods.GET],
      allowedHeaders: ['*']
    });


    const movie_info_table = new dynamodb.Table(this, 'CloudCinemaMovieInfoTable', {
      tableName: 'cloud-cinema-movie-info', 
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING},
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      readCapacity:1,           
      writeCapacity:1,
      stream:dynamodb.StreamViewType.NEW_IMAGE
    }); 
    
    const movie_search_table = new dynamodb.Table(this, 'CloudCinemaMovieSearchTable', {
      tableName: 'cloud-cinema-movie-search', 
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING},
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      readCapacity:1,
      writeCapacity:1
    });

    const movieUploadStepFunction = new MovieUploadStepFunction(this, 'MovieUploadStepFunction', {
      movieSourceBucket: bucket,
      movieTable: movie_info_table,
      movieOutputBucket: ouptutBucket
    });

    const movieDeleteStepFunction = new MovieDeleteStepFunction(this, 'MovieDeleteStepFunction', {
      movieSourceBucket: bucket,
      movieTable: movie_info_table,
      movieOutputBucket: ouptutBucket
    });

    const getMovie = new lambda.Function(this, 'GetMovieFunction', {
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: 'get_movie.get_one', 
      code: lambda.Code.fromAsset(path.join(__dirname,'../functions')),
      timeout: cdk.Duration.seconds(30)
    });

    getMovie.addEnvironment("BUCKET_NAME", bucket.bucketName)
    bucket.grantRead(getMovie);

    const getMovieInfo = new lambda.Function(this, 'GetMovieInfoFunction', {
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: 'get_movies_info.get_one', 
      code: lambda.Code.fromAsset(path.join(__dirname,'../functions')),
      timeout: cdk.Duration.seconds(30)
    });

    getMovieInfo.addEnvironment("TABLE_NAME", movie_info_table.tableName)
    movie_info_table.grantReadData(getMovieInfo);

    const startMovieUpload = new lambda.Function(this, 'StartMovieUploadFunction', {
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: 'start_movie_upload.start_movie_upload', 
      code: lambda.Code.fromAsset(path.join(__dirname,'../functions')),
      timeout: cdk.Duration.seconds(30)
    });

    startMovieUpload.addEnvironment("BUCKET_NAME", bucket.bucketName)
    startMovieUpload.addEnvironment("TABLE_NAME", movie_info_table.tableName)
    startMovieUpload.addEnvironment("SEARCH_TABLE_NAME", movie_search_table.tableName)

    bucket.grantWrite(startMovieUpload);
    movie_info_table.grantWriteData(startMovieUpload);
    movie_search_table.grantWriteData(startMovieUpload);


    movie_search_table.addGlobalSecondaryIndex({
      indexName: 'SearchIndex',
      partitionKey: { name: 'attributes', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    const searchMovies = new lambda.Function(this, 'SearchMoviesFunction', {
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: 'movies_search.get_all', 
      code: lambda.Code.fromAsset(path.join(__dirname,'../functions')),
      timeout: cdk.Duration.seconds(30)
    });

    searchMovies.addEnvironment("TABLE_NAME", movie_info_table.tableName)
    movie_info_table.grantReadData(searchMovies);

    searchMovies.addEnvironment("SEARCH_TABLE_NAME", movie_search_table.tableName)
    movie_info_table.grantReadData(searchMovies);


    const startMovieDelete = new lambda.Function(this, 'StartMovieDeleteFunction', {
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: 'start_delete_movie.start_delete_movie', 
      code: lambda.Code.fromAsset(path.join(__dirname,'../functions')),
      timeout: cdk.Duration.seconds(30)
    });

    startMovieDelete.addEnvironment("TABLE_NAME", movie_info_table.tableName)
    movie_info_table.grantReadData(startMovieDelete);


    const editMovieInfo = new lambda.Function(this, 'EditMovieInfoFunction', {
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: 'edit_movie_info.edit_one', 
      code: lambda.Code.fromAsset(path.join(__dirname,'../functions')),
      timeout: cdk.Duration.seconds(30)
    });

    editMovieInfo.addEnvironment("TABLE_NAME", movie_info_table.tableName)
    movie_info_table.grantReadData(editMovieInfo);
    movie_info_table.grantWriteData(editMovieInfo);


    const api = new apigateway.RestApi(this, 'GetMovieApi', {
      restApiName: 'Get Movie Service',
      description: 'This service gets movies.',
      defaultCorsPreflightOptions:
      {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'Access-Control-Allow-Headers',
          'Access-Control-Allow-Methods'
        ],
        allowCredentials: true
      },
    });

    const moviesBase = api.root.addResource('movies');
    const moviesDownload = moviesBase.addResource('download').addResource('{movie_id}');
    const getMovieIntegration = new apigateway.LambdaIntegration(getMovie);
    moviesDownload.addMethod('GET', getMovieIntegration, { 
      authorizer: userAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO 
    });

    const movieInfoBase = api.root.addResource('movie_info')
    const getMovieInfoIntegration = new apigateway.LambdaIntegration(getMovieInfo);
    movieInfoBase.addMethod('GET', getMovieInfoIntegration, {
      authorizer: userAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO 
    });

    const editMovieInfoIntegration = new apigateway.LambdaIntegration(editMovieInfo);
    movieInfoBase.addMethod('PUT', editMovieInfoIntegration, {
      authorizer: adminAuthorizer
    });

    const startMovieUploadIntegration = new apigateway.LambdaIntegration(startMovieUpload);
    moviesBase.addMethod('POST', startMovieUploadIntegration, {
      authorizer: adminAuthorizer,
    })

    const startMovieDeleteIntegration = new apigateway.LambdaIntegration(startMovieDelete);
    moviesBase.addMethod('DELETE', startMovieDeleteIntegration, {
      authorizer: adminAuthorizer,
    })

    const cfnMovieUploadStepFunction = movieUploadStepFunction.stateMachine.node.defaultChild as sfn.CfnStateMachine;
    startMovieUpload.addEnvironment('STATE_MACHINE_ARN', cfnMovieUploadStepFunction.attrArn);
    movieUploadStepFunction.stateMachine.grantStartExecution(startMovieUpload);


    const cfnMovieDeleteStepFunction = movieDeleteStepFunction.stateMachine.node.defaultChild as sfn.CfnStateMachine;
    startMovieDelete.addEnvironment('STATE_MACHINE_ARN', cfnMovieDeleteStepFunction.attrArn);
    movieDeleteStepFunction.stateMachine.grantStartExecution(startMovieDelete);

    const getMoviesInfo = new lambda.Function(this, 'GetMoviesInfoFunction', {
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: 'get_movies_info.get_all', 
      code: lambda.Code.fromAsset(path.join(__dirname,'../functions')),
      timeout: cdk.Duration.seconds(30)
    });

    getMoviesInfo.addEnvironment("TABLE_NAME", movie_info_table.tableName)
    movie_info_table.grantReadData(getMoviesInfo);

    const moviesInfoBase = api.root.addResource('movies_info')
    const getMoviesInfoIntegration = new apigateway.LambdaIntegration(getMoviesInfo);
    moviesInfoBase.addMethod('GET', getMoviesInfoIntegration, {
      authorizer: userAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO 
    });

    const moviesSearch = moviesBase.addResource('search');
    const searchMovieIntegration = new apigateway.LambdaIntegration(searchMovies);
    moviesSearch.addMethod('GET', searchMovieIntegration);


    // const movieTopic = new sns.Topic(this, 'MovieTopic', {
    //   displayName: 'SNS topic for movie notification'
    // });

    // movieTopic.addSubscription(new subscriptions.EmailSubscription('travelbee.team22@gmail.com'));

    const publish = new lambda.Function(this, 'Publish', {
      runtime: lambda.Runtime.PYTHON_3_9,
      code: lambda.Code.fromAsset(path.join(__dirname,'../functions')),
      handler: 'notifications.publish',
    });

    const subscribe = new lambda.Function(this, 'Subscribe', {
      runtime: lambda.Runtime.PYTHON_3_9,
      code: lambda.Code.fromAsset(path.join(__dirname,'../functions')),
      handler: 'notifications.subscribe',
    });

    // publish.addEnvironment("SNS_ARN", movieTopic.topicArn)
    // subscribe.addEnvironment("SNS_ARN", movieTopic.topicArn)

    // movieTopic.grantPublish(publish)

    // movieTopic.addToResourcePolicy(new iam.PolicyStatement({
    //   actions: ['sns:Subscribe','sns:ListSubscriptionsByTopic'],
    //   resources: [movieTopic.topicArn],
    //   principals: [new iam.ServicePrincipal('lambda.amazonaws.com')],
    //   effect: iam.Effect.ALLOW,
    // }));

    subscribe.addToRolePolicy(new iam.PolicyStatement({
      actions: ['sns:Subscribe', 'sns:ListTopics','sns:CreateTopic','sns:ListSubscriptionsByTopic','sns:ListSubscriptions'],
      resources: ['*'],
      effect: iam.Effect.ALLOW,
    }));
    publish.addToRolePolicy(new iam.PolicyStatement({
      actions: ['sns:Publish', 'sns:ListTopics','sns:CreateTopic','sns:ListSubscriptionsByTopic','sns:ListSubscriptions'],
      resources: ['*'],
      effect: iam.Effect.ALLOW
    }));


    const snsBase = api.root.addResource('subscribe')

    const subscribeInfoIntegration = new apigateway.LambdaIntegration(subscribe);
    snsBase.addMethod('POST', subscribeInfoIntegration, {
      authorizer: userAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO 
    });

    publish.addEventSource(new DynamoEventSource(movie_info_table, {
      startingPosition: lambda.StartingPosition.LATEST,
      batchSize: 100,
      retryAttempts: 1,
    }));
  }
}
