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
      supportedIdentityProviders: [
        cognito.UserPoolClientIdentityProvider.COGNITO,
      ],
      readAttributes: clientReadAttributes,
      writeAttributes: clientWriteAttributes,
    });

    new cdk.CfnOutput(this, 'userPoolId', {
      value: userPool.userPoolId,
    });
    new cdk.CfnOutput(this, 'userPoolClientId', {
      value: userPoolClient.userPoolClientId,
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


    const movie_info_table = new dynamodb.Table(this, 'CloudCinemaMovieInfoTable', {
      tableName: 'cloud-cinema-movie-info', 
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING},
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      readCapacity:1,           
      writeCapacity:1
    });      

    const movieUploadStepFunction = new MovieUploadStepFunction(this, 'MovieUploadStepFunction', {
      movieSourceBucket: bucket,
      movieTable: movie_info_table
    });

    const movieDeleteStepFunction = new MovieDeleteStepFunction(this, 'MovieDeleteStepFunction', {
      movieSourceBucket: bucket,
      movieTable: movie_info_table
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
    bucket.grantWrite(startMovieUpload);
    movie_info_table.grantWriteData(startMovieUpload);


    const startMovieDelete = new lambda.Function(this, 'StartMovieDeleteFunction', {
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: 'start_delete_movie.start_delete_movie', 
      code: lambda.Code.fromAsset(path.join(__dirname,'../functions')),
      timeout: cdk.Duration.seconds(30)
    });

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
        ],
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


  }
}
