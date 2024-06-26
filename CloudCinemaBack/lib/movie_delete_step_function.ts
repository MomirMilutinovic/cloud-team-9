import * as cdk from 'aws-cdk-lib';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Construct } from 'constructs';
import path = require('path');
import { Duration } from 'aws-cdk-lib';


export interface MovieDeleteStepFunctionProps {
    movieSourceBucket: s3.Bucket,
    movieTable: Table
}

export class MovieDeleteStepFunction extends Construct {
    public readonly stateMachine: sfn.StateMachine;
    public readonly deleteMovieFromS3: lambda.Function;
    public readonly deleteMovieFromDynamoDB: lambda.Function;

    constructor(scope: Construct, id: string, props: MovieDeleteStepFunctionProps) {
        super(scope, id);
        const movieTable = props.movieTable;
        const movieSourceBucket = props.movieSourceBucket;            

        // Define Lambdas
        this.deleteMovieFromS3 = new lambda.Function(this, 'DeleteMovieFromS3Function', {
            runtime: lambda.Runtime.PYTHON_3_9,
            handler: 'delete_movie_from_s3.delete_one', 
            code: lambda.Code.fromAsset(path.join(__dirname,'../functions')),
            timeout: cdk.Duration.seconds(30)
        });

        this.deleteMovieFromDynamoDB = new lambda.Function(this, 'DeleteMovieFromDynamoDBFunction', {
            runtime: lambda.Runtime.PYTHON_3_9,
            handler: 'delete_movie_from_dynamodb.delete_one', 
            code: lambda.Code.fromAsset(path.join(__dirname,'../functions')),
            timeout: cdk.Duration.seconds(30)
        });

        // Grant permissions to lambdas
        movieSourceBucket.grantDelete(this.deleteMovieFromS3);
        this.deleteMovieFromS3.addEnvironment('BUCKET_NAME', movieSourceBucket.bucketName);

        movieTable.grantFullAccess(this.deleteMovieFromDynamoDB)
        this.deleteMovieFromDynamoDB.addEnvironment('MOVIE_TABLE_NAME', movieTable.tableName);

        // define tasks
        const deleteFromS3 = new tasks.LambdaInvoke(this, 'Delete from S3', {
            lambdaFunction: this.deleteMovieFromS3,
            payload: sfn.TaskInput.fromObject({
                'movieDetails.$': '$',
            }),
            taskTimeout: sfn.Timeout.duration(cdk.Duration.minutes(1)),
            resultPath: '$.movieDetails'
          });
        // deleteFromS3.addRetry({
        // maxAttempts: 1,
        // interval: cdk.Duration.seconds(1),
        // backoffRate: 2,
        // errors: ['Lambda.ServiceException', 'Lambda.AWSLambdaException', 'Lambda.SdkClientException'],
        // });
      
        const deleteFromDynamo = new tasks.LambdaInvoke(this, 'Delete from Dynamo', {
            lambdaFunction: this.deleteMovieFromDynamoDB,
            payload: sfn.TaskInput.fromObject({
                'movieDetails.$': '$',
            }),
            taskTimeout: sfn.Timeout.duration(cdk.Duration.minutes(1)),
            // resultPath: '$.movieDetails'
        })
        // deleteFromDynamo.addRetry({
        //     maxAttempts: 1,
        //     interval: cdk.Duration.seconds(1),
        //     backoffRate: 2,
        //     errors: ['Lambda.ServiceException', 'Lambda.AWSLambdaException', 'Lambda.SdkClientException'],
        //   });

        // const jobFailed = new sfn.Fail(this, 'Job Failed', {
        //     cause: 'AWS Batch Job Failed',
        //     error: 'DescribeJob returned FAILED',
        //   });
          
        // const jobSucceeded = new sfn.Succeed(this, 'Job Succeeded');

        // const rollbackDeleteFromS3Task = new tasks.LambdaInvoke(this, 'RollbackDeleteFromS3Task', {
        //     lambdaFunction: this.deleteMovieFromS3,
        // });
      
        // const rollbackDeleteFromDynamoTask = new tasks.LambdaInvoke(this, 'RollbackDeleteFromDynamoTask', {
        //     lambdaFunction: this.deleteMovieFromDynamoDB,
        // });


        // Define step function
        const definition = deleteFromS3
            .next(deleteFromDynamo)
            // .next(new sfn.Choice(this, 'Job Complete?')
            //     // Look at the "status" field
            //     .when(sfn.Condition.stringEquals('$.status', 'FAILED'), jobFailed)
            //     .otherwise(jobSucceeded));


        this.stateMachine = new sfn.StateMachine(this, 'MovieDeleteStateMachine', {
            definitionBody: sfn.DefinitionBody.fromChainable(definition),
            timeout: Duration.minutes(3),
        });
    }
}