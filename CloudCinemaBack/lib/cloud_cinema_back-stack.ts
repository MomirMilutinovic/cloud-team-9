import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import path = require('path');
import * as apigateway from 'aws-cdk-lib/aws-apigateway';




// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class CloudCinemaBackStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const bucket = new s3.Bucket(this, 'CloudCinemaMoviesBucket', {
      bucketName: 'cloud-cinema-movies-bucket', 
      versioned: true, 
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    const movie_info_table = new dynamodb.Table(this, 'CloudCinemaMovieInfoTable', {
      tableName: 'cloud-cinema-movie-info', 
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING},
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      readCapacity:1,            //u grupi pise da treba da se stave read i write na 1 da ne bi naplacivao
      writeCapacity:1
    });               

    const getMovie = new lambda.Function(this, 'GetMovieFunction', {
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: 'get_movie.get_one', 
      code: lambda.Code.fromAsset(path.join(__dirname,'../functions')),
      timeout: cdk.Duration.seconds(30)
    });

    getMovie.addEnvironment("BUCKET_NAME",bucket.bucketName)
    bucket.grantRead(getMovie);

    const api = new apigateway.RestApi(this, 'GetMovieApi', {
      restApiName: 'Get Movie Service',
      description: 'This service gets movies.',
      binaryMediaTypes:['*/*']
    });

    const movies = api.root.addResource('movies').addResource('{movie_name}');
    const getMovieIntegration = new apigateway.LambdaIntegration(getMovie);
    movies.addMethod('GET', getMovieIntegration);




  }
}
