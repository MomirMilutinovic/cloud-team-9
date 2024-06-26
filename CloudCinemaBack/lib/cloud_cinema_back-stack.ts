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



export class CloudCinemaBackStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

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
      binaryMediaTypes:['*/*'],
      defaultCorsPreflightOptions:
      {
        allowOrigins:["https://cloud-cinema-front-bucket.s3.amazonaws.com"],
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type','Authorization', 'X-Amz-Date', 'X-Api-Key', 'X-Amz-Security-Token']
      }
    });

    const moviesBase = api.root.addResource('movies');
    const moviesDownload = moviesBase.addResource('download').addResource('{movie_id}');
    const getMovieIntegration = new apigateway.LambdaIntegration(getMovie);
    moviesDownload.addMethod('GET', getMovieIntegration);

    const movieInfoBase = api.root.addResource('movie_info')
    const getMovieInfoIntegration = new apigateway.LambdaIntegration(getMovieInfo);
    movieInfoBase.addMethod('GET', getMovieInfoIntegration);

    const editMovieInfoIntegration = new apigateway.LambdaIntegration(editMovieInfo);
    movieInfoBase.addMethod('PUT', editMovieInfoIntegration);

    const startMovieUploadIntegration = new apigateway.LambdaIntegration(startMovieUpload);
    moviesBase.addMethod('POST', startMovieUploadIntegration)

    const startMovieDeleteIntegration = new apigateway.LambdaIntegration(startMovieDelete);
    moviesBase.addMethod('DELETE', startMovieDeleteIntegration)

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
    moviesInfoBase.addMethod('GET', getMoviesInfoIntegration);
  }
}
