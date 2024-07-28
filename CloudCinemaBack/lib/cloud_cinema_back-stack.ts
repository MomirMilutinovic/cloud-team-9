import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as sns from 'aws-cdk-lib/aws-sns';
import path = require('path');
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { MovieUploadStepFunction } from './movie_upload_step_function';
import { MovieDeleteStepFunction } from './movie_delete_step_function';
import { MovieGenerateFeedStepFunction } from './movie_feed_step_function';

import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambdaNodeJs from 'aws-cdk-lib/aws-lambda-nodejs';
import { DynamoEventSource, S3EventSource, SnsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import * as iam from 'aws-cdk-lib/aws-iam';
import { MovieFileEditStepFunction } from './movie_file_edit_step_function';
import { LambdaDestination, SnsDestination } from 'aws-cdk-lib/aws-s3-notifications';

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
      allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.DELETE, s3.HttpMethods.PUT],
      allowedHeaders: ['*']
    });

    const bucketTopic = new sns.Topic(this, 'BucketTopic', {
      displayName: 'Source bucket object creation topic',
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
    
    movie_info_table.addGlobalSecondaryIndex({
      indexName: 'TitleIndex',
      partitionKey: { name: 'name', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    movie_info_table.addGlobalSecondaryIndex({
      indexName: 'DirectorIndex',
      partitionKey: { name: 'director', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    movie_info_table.addGlobalSecondaryIndex({
      indexName: 'DescriptionIndex',
      partitionKey: { name: 'description', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    const watch_history_table = new dynamodb.Table(this, 'CloudCinemaWatchHistoryTable', {
      tableName: 'cloud-cinema-watch-history', 
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING},
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      readCapacity:1,           
      writeCapacity:1,
      stream:dynamodb.StreamViewType.NEW_IMAGE
    });
    
    watch_history_table.addGlobalSecondaryIndex({
      indexName: 'WatchHistoryIndex',
      partitionKey: { name: 'email', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    const rating_info_table = new dynamodb.Table(this, 'CloudCinemaRatingInfoTable', {
      tableName: 'cloud-cinema-rating-info', 
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING},
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      readCapacity:1,           
      writeCapacity:1,
      stream:dynamodb.StreamViewType.NEW_IMAGE
    });

    rating_info_table.addGlobalSecondaryIndex({
      indexName: 'RatingIndex',
      partitionKey: { name: 'email', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL
    });
     
    const movie_search_table = new dynamodb.Table(this, 'CloudCinemaMovieSearchTable', {
      tableName: 'cloud-cinema-movie-search', 
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING},
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      readCapacity:1,
      writeCapacity:1
    });

    movie_search_table.addGlobalSecondaryIndex({
      indexName: 'SearchIndex',
      partitionKey: { name: 'attributes', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    movie_search_table.addGlobalSecondaryIndex({
      indexName: 'ActorsIndex',
      partitionKey: { name: 'actors', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    movie_search_table.addGlobalSecondaryIndex({
      indexName: 'GenresIndex',
      partitionKey: { name: 'genres', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    const subscription_table = new dynamodb.Table(this, 'CloudCinemaSubscriptionTable', {
      tableName: 'cloud-cinema-subscription', 
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING},
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      readCapacity:1,
      writeCapacity:1,
      stream:dynamodb.StreamViewType.NEW_IMAGE

    });

    subscription_table.addGlobalSecondaryIndex({
      indexName: 'SubscriptionIndex',
      partitionKey: { name: 'email', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    const feed_info_table = new dynamodb.Table(this, 'CloudCinemaFeedInfoTable', {
      tableName: 'cloud-cinema-feed-info', 
      partitionKey: { name: 'email', type: dynamodb.AttributeType.STRING},
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      readCapacity:1,
      writeCapacity:1
    });

    const download_history_info_table = new dynamodb.Table(this, 'CloudCinemaDownloadHistoryInfoTable', {
      tableName: 'cloud-cinema-download-info', 
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING},
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      readCapacity:1,
      writeCapacity:1,
      stream:dynamodb.StreamViewType.NEW_IMAGE
    });
    
    download_history_info_table.addGlobalSecondaryIndex({
      indexName: 'DownloadHistoryIndex',
      partitionKey: { name: 'email', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    const movieUploadStepFunction = new MovieUploadStepFunction(this, 'MovieUploadStepFunction', {
      movieSourceBucket: bucket,
      movieTable: movie_info_table,
      movieOutputBucket: ouptutBucket,
      bucketTopic: bucketTopic
    });

    const movieDeleteStepFunction = new MovieDeleteStepFunction(this, 'MovieDeleteStepFunction', {
      movieSourceBucket: bucket,
      movieTable: movie_info_table,
      movieOutputBucket: ouptutBucket
    });

    const movieGenerateFeedStepFunction = new MovieGenerateFeedStepFunction(this, 'MovieGenerateFeedStepFunction', {
      movieDownloadTable: download_history_info_table,
      movieRatingTable: rating_info_table,
      movieSubscriptionTable: subscription_table,
      movieInfoTable: movie_info_table,
      movieFeedTable: feed_info_table
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
    getMovieInfo.addEnvironment("FEED_TABLE_NAME", feed_info_table.tableName)
    feed_info_table.grantReadData(getMovieInfo);

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

    const searchMovies = new lambda.Function(this, 'SearchMoviesFunction', {
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: 'movies_search.get_all', 
      code: lambda.Code.fromAsset(path.join(__dirname,'../functions')),
      timeout: cdk.Duration.seconds(30)
    });

    const scanMovies = new lambda.Function(this, 'ScanMoviesFunction', {
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: 'movies_filter.get_all', 
      code: lambda.Code.fromAsset(path.join(__dirname,'../functions')),
      timeout: cdk.Duration.seconds(30)
    });

    scanMovies.addEnvironment("TABLE_NAME", movie_info_table.tableName)
    movie_info_table.grantReadData(scanMovies);

    scanMovies.addEnvironment("SEARCH_TABLE_NAME", movie_search_table.tableName)
    movie_search_table.grantReadData(scanMovies);

    scanMovies.addEnvironment("TITLE_INDEX_NAME","TitleIndex")
    scanMovies.addEnvironment("DIRECTOR_INDEX_NAME","DirectorIndex")
    scanMovies.addEnvironment("ACTORS_INDEX_NAME","ActorsIndex")
    scanMovies.addEnvironment("GENRES_INDEX_NAME","GenresIndex")
    scanMovies.addEnvironment("DESCRIPTION_INDEX_NAME","DescriptionIndex")


    searchMovies.addEnvironment("TABLE_NAME", movie_info_table.tableName)
    movie_info_table.grantReadData(searchMovies);

    searchMovies.addEnvironment("SEARCH_TABLE_NAME", movie_search_table.tableName)
    movie_search_table.grantReadData(searchMovies);

    searchMovies.addEnvironment("INDEX_NAME","SearchIndex")


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
    editMovieInfo.addEnvironment("SEARCH_TABLE_NAME", movie_search_table.tableName)
    movie_search_table.grantWriteData(editMovieInfo);
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
    getMoviesInfo.addEnvironment("FEED_TABLE_NAME", feed_info_table.tableName)
    feed_info_table.grantReadData(getMoviesInfo);

    const moviesInfoBase = api.root.addResource('movies_info')
    const getMoviesInfoIntegration = new apigateway.LambdaIntegration(getMoviesInfo);
    moviesInfoBase.addMethod('GET', getMoviesInfoIntegration, {
      authorizer: userAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO 
    });

    const moviesSearch = moviesBase.addResource('search');
    const searchMovieIntegration = new apigateway.LambdaIntegration(searchMovies);
    moviesSearch.addMethod('GET', searchMovieIntegration,{
      authorizer: userAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO 
    });
    const moviesScan = moviesBase.addResource('scan');
    const scanMovieIntegration = new apigateway.LambdaIntegration(scanMovies);
    moviesScan.addMethod('GET', scanMovieIntegration,{
      authorizer: userAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO 
    });

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

    const deleteSubscriptions = new lambda.Function(this, 'DeleteSubscriptionFunction', {
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: 'notifications.delete_subscription',  
      code: lambda.Code.fromAsset(path.join(__dirname,'../functions')),
      timeout: cdk.Duration.seconds(30)
    });

    const getSubscriptions = new lambda.Function(this, 'GetSubscriptionFunction', {
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: 'notifications.get_subscriptions', 
      code: lambda.Code.fromAsset(path.join(__dirname,'../functions')),
      timeout: cdk.Duration.seconds(30)
    });

    subscription_table.grantWriteData(subscribe);
    subscription_table.grantFullAccess(deleteSubscriptions);
    subscription_table.grantReadData(getSubscriptions);

    subscribe.addEnvironment("SUBSCRIPTION_TABLE",subscription_table.tableName)
    publish.addEnvironment("SUBSCRIPTION_TABLE",subscription_table.tableName)
    deleteSubscriptions.addEnvironment("SUBSCRIPTION_TABLE",subscription_table.tableName)
    getSubscriptions.addEnvironment("SUBSCRIPTION_TABLE",subscription_table.tableName)

    deleteSubscriptions.addToRolePolicy(new iam.PolicyStatement({
      actions: ['sns:Unsubscribe','sns:ListTopics','sns:ListSubscriptionsByTopic'],
      resources: ['*'],
      effect: iam.Effect.ALLOW,
    }));

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
    
    const getSubscriptionsIntegration = new apigateway.LambdaIntegration(getSubscriptions);
    snsBase.addMethod('GET', getSubscriptionsIntegration, {
      authorizer: userAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO 
    });

    const deleteSubscriptionsIntegration = new apigateway.LambdaIntegration(deleteSubscriptions);
    snsBase.addMethod('DELETE', deleteSubscriptionsIntegration, {
      authorizer: userAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO 
    });

    publish.addEventSource(new DynamoEventSource(movie_info_table, {
      startingPosition: lambda.StartingPosition.LATEST,
      batchSize: 100,
      retryAttempts: 1,
    }));

    const rateMovie = new lambda.Function(this, 'RateMovieInfoFunction', {
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: 'rating.rate', 
      code: lambda.Code.fromAsset(path.join(__dirname,'../functions')),
      timeout: cdk.Duration.seconds(30)
    });

    const rateBase = api.root.addResource('rate');
    const rateMovieIntegration = new apigateway.LambdaIntegration(rateMovie);
    rateBase.addMethod('POST', rateMovieIntegration, { 
      authorizer: userAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO 
    });

    rateMovie.addEnvironment("TABLE_NAME", rating_info_table.tableName)
    rating_info_table.grantWriteData(rateMovie);
    rateMovie.addEnvironment("WATCH_HISTORY_TABLE_NAME", watch_history_table.tableName)
    rateMovie.addEnvironment("INDEX_NAME", 'WatchHistoryIndex')
    watch_history_table.grantReadData(rateMovie);


    const updateWatchHistory = new lambda.Function(this, 'UpdateWatchHistoryFunction', {
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: 'watch_history.put_item', 
      code: lambda.Code.fromAsset(path.join(__dirname,'../functions')),
      timeout: cdk.Duration.seconds(30)
    });

    const historyBase = api.root.addResource('update_watch_history');
    const watchHistoryIntegration = new apigateway.LambdaIntegration(updateWatchHistory);
    historyBase.addMethod('POST', watchHistoryIntegration, { 
      authorizer: userAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO 
    });

    updateWatchHistory.addEnvironment("TABLE_NAME", watch_history_table.tableName)
    watch_history_table.grantWriteData(updateWatchHistory);


    movie_info_table.addGlobalSecondaryIndex({
      indexName: 'EpisodesIndex',
      partitionKey: { name: 'name', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    const getEpisodes = new lambda.Function(this, 'GetEpisodesFunction', {
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: 'get_episodes.get_all', 
      code: lambda.Code.fromAsset(path.join(__dirname,'../functions')),
      timeout: cdk.Duration.seconds(30)
    });

    const episodes = moviesInfoBase.addResource('episodes');
    const getEpisodesIntegration = new apigateway.LambdaIntegration(getEpisodes);
    episodes.addMethod('GET', getEpisodesIntegration, { 
      authorizer: userAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO 
    });

    getEpisodes.addEnvironment("TABLE_NAME", movie_info_table.tableName)
    getEpisodes.addEnvironment("INDEX_NAME", "EpisodesIndex")
    movie_info_table.grantReadData(getEpisodes);

    const startGenerateFeed = new lambda.Function(this, 'GenerateFeedFunction', {
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: 'start_generate_feed.update_feed', 
      code: lambda.Code.fromAsset(path.join(__dirname,'../functions')),
      timeout: cdk.Duration.seconds(30)
    });

    const updateDownloadHistory = new lambda.Function(this, 'UpdateDownloadHistoryFunction', {
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: 'download_history.update_download_history', 
      code: lambda.Code.fromAsset(path.join(__dirname,'../functions')),
      timeout: cdk.Duration.seconds(30)
    });
    
    updateDownloadHistory.addEnvironment("DOWNLOAD_TABLE_NAME", download_history_info_table.tableName)
    download_history_info_table.grantWriteData(updateDownloadHistory);

    const downloadHistoryBase = api.root.addResource('update_download_history');
    const downloadHistoryIntegration = new apigateway.LambdaIntegration(updateDownloadHistory);
    downloadHistoryBase.addMethod('POST', downloadHistoryIntegration, { 
      authorizer: userAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO 
    });

    startGenerateFeed.addEventSource(new DynamoEventSource(watch_history_table, {
      startingPosition: lambda.StartingPosition.LATEST,
      batchSize: 100,
      retryAttempts: 1,
    }));
    startGenerateFeed.addEventSource(new DynamoEventSource(download_history_info_table, {
      startingPosition: lambda.StartingPosition.LATEST,
      batchSize: 100,
      retryAttempts: 1,
    }));
    startGenerateFeed.addEventSource(new DynamoEventSource(subscription_table, {
      startingPosition: lambda.StartingPosition.LATEST,
      batchSize: 100,
      retryAttempts: 1,
    }));
    startGenerateFeed.addEventSource(new DynamoEventSource(rating_info_table, {
      startingPosition: lambda.StartingPosition.LATEST,
      batchSize: 100,
      retryAttempts: 1,
    }));

    const cfnMovieGenerateFeedStepFunction = movieGenerateFeedStepFunction.stateMachine.node.defaultChild as sfn.CfnStateMachine;
    startGenerateFeed.addEnvironment('STATE_MACHINE_ARN', cfnMovieGenerateFeedStepFunction.attrArn);
    movieGenerateFeedStepFunction.stateMachine.grantStartExecution(startGenerateFeed);

    const movieFileEditStepFunction = new MovieFileEditStepFunction(this, 'MovieFileEditStepFunction', {
      cleanUpFailedUpload: movieUploadStepFunction.cleanUpFailedUpload,
      deleteMovieFromS3: movieUploadStepFunction.deleteMovieFromS3,
      movieSourceBucket: bucket,
      sendMovieUploadTaskResult: movieUploadStepFunction.sendMovieUploadTaskResult,
      sendTranscodeFailTaskResult: movieUploadStepFunction.sendTranscodeFailTaskResult,
      transcodeMovie: movieUploadStepFunction.transcodeMovie,
      task_token_table: movieUploadStepFunction.task_token_table,
      transcodingQueue: movieUploadStepFunction.transcodingQueue,
      isMovieUploaded: movieUploadStepFunction.isMovieUploaded,
      outputBucket: ouptutBucket
    });

    const cfnMovieFileEditStepFunction = movieFileEditStepFunction.stateMachine.node.defaultChild as sfn.CfnStateMachine;
    const startMovieFileEdit = new lambda.Function(this, 'StartMovieFileEditFunction', {
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: 'start_movie_file_edit.start_movie_file_edit',
      code: lambda.Code.fromAsset(path.join(__dirname, '../functions')),
      timeout: cdk.Duration.seconds(30)
    });

    startMovieFileEdit.addEnvironment('STATE_MACHINE_ARN', cfnMovieFileEditStepFunction.attrArn);
    movieFileEditStepFunction.stateMachine.grantStartExecution(startMovieFileEdit);
    startMovieFileEdit.addEnvironment('BUCKET_NAME', bucket.bucketName);
    startMovieFileEdit.addEnvironment('OUTPUT_BUCKET_NAME', ouptutBucket.bucketName);
    ouptutBucket.grantReadWrite(startMovieFileEdit);
    bucket.grantReadWrite(startMovieFileEdit);

    const startMovieFileEditIntegration = new apigateway.LambdaIntegration(startMovieFileEdit);
    const movieFileBase = api.root.addResource('movie_file');
    movieFileBase.addMethod('PUT', startMovieFileEditIntegration, {
      authorizer: adminAuthorizer
    });

    const file_info_table = new dynamodb.Table(this, 'CloudCinemaFileInfoTable', {
      tableName: 'cloud-cinema-file-info', 
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING},
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      readCapacity:1,           
      writeCapacity:1,
    });

    const updateFileMetadata = new lambda.Function(this, 'UpdateFileMetadataFunction', {
        runtime: lambda.Runtime.PYTHON_3_12, // python-ffmpeg-video-streaming does not work on python versions newer than 3.8
        handler: 'update_file_metadata.update_file_metadata',
        code: lambda.Code.fromAsset(path.join(__dirname, '../functions'),{
            bundling: {
                image: lambda.Runtime.PYTHON_3_12.bundlingImage,
                command: [
                    'bash', '-c', 'pip install --no-cache python-magic -t /asset-output && rsync -r . /asset-output'
                ]
            }
        }),
        timeout: cdk.Duration.minutes(1),
        memorySize: 128
    });

    bucket.grantRead(updateFileMetadata);
    file_info_table.grantReadWriteData(updateFileMetadata);
    updateFileMetadata.addEnvironment('BUCKET_NAME', bucket.bucketName);
    updateFileMetadata.addEnvironment('TABLE_NAME', file_info_table.tableName);
    bucket.addEventNotification(s3.EventType.OBJECT_CREATED, new SnsDestination(bucketTopic));
    const bucketEventSource = new SnsEventSource(bucketTopic);
    updateFileMetadata.addEventSource(bucketEventSource);
  }
}
