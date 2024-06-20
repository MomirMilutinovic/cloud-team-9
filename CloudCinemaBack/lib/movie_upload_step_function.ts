import * as cdk from 'aws-cdk-lib';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import { LambdaDestination } from 'aws-cdk-lib/aws-s3-notifications';
import path = require('path');

export interface MovieUploadStepFunctionProps {
    movieSourceBucket: s3.Bucket,
    movieTable: Table
}

export class MovieUploadStepFunction extends Construct {
    public readonly stateMachine: sfn.StateMachine;
    public readonly isMovieUploaded: lambda.Function;
    public readonly cleanUpFailedUpload: lambda.Function;
    public readonly markMovieAsUploaded: lambda.Function;

    constructor(scope: Construct, id: string, props: MovieUploadStepFunctionProps) {
        super(scope, id);
        const movieTable = props.movieTable;
        const movieSourceBucket = props.movieSourceBucket;

        const task_token_table = new dynamodb.Table(this, 'MovieUploadTaskTokenTable', {
            tableName: 'movie-upload-task-token-table', 
            partitionKey: { name: 'movieId', type: dynamodb.AttributeType.STRING},
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            readCapacity:1,            //u grupi pise da treba da se stave read i write na 1 da ne bi naplacivao
            writeCapacity:1
        });               

        // Define Lambdas
        this.isMovieUploaded = new lambda.Function(this, 'IsMovieUploadedFunction', {
            runtime: lambda.Runtime.PYTHON_3_9,
            handler: 'is_movie_uploaded.is_movie_uploaded', 
            code: lambda.Code.fromAsset(path.join(__dirname,'../functions')),
            timeout: cdk.Duration.seconds(30)
        });
        this.cleanUpFailedUpload = new lambda.Function(this, 'CleanUpOrphanedMovieDetailsAndTaskTokenFunction', {
            runtime: lambda.Runtime.PYTHON_3_9,
            handler: 'clean_up_failed_upload.clean_up_failed_upload', 
            code: lambda.Code.fromAsset(path.join(__dirname,'../functions')),
            timeout: cdk.Duration.seconds(30)
        });
        this.markMovieAsUploaded = new lambda.Function(this, 'MarkMovieAsUploadedFunction', {
            runtime: lambda.Runtime.PYTHON_3_9,
            handler: 'mark_movie_as_uploaded.mark_movie_as_uploaded', 
            code: lambda.Code.fromAsset(path.join(__dirname,'../functions')),
            timeout: cdk.Duration.seconds(30)
        });

        const sendMovieUploadTaskResult = new lambda.Function(this, 'SendMovieUploadTaskResultFunction', {
            runtime: lambda.Runtime.PYTHON_3_9,
            handler: 'send_movie_upload_task_result.send_movie_upload_task_result', 
            code: lambda.Code.fromAsset(path.join(__dirname,'../functions')),
            timeout: cdk.Duration.seconds(30)
        });


        // Grant permissions to lambdas
        movieSourceBucket.grantRead(this.isMovieUploaded);
        task_token_table.grantWriteData(this.isMovieUploaded);
        this.isMovieUploaded.addEnvironment('BUCKET_NAME', movieSourceBucket.bucketName);
        this.isMovieUploaded.addEnvironment('TABLE_NAME', task_token_table.tableName);

        task_token_table.grantReadWriteData(this.cleanUpFailedUpload);
        movieTable.grantReadWriteData(this.cleanUpFailedUpload)
        this.cleanUpFailedUpload.addEnvironment('MOVIE_TABLE_NAME', movieTable.tableName);
        this.cleanUpFailedUpload.addEnvironment('TASK_TOKEN_TABLE_NAME', task_token_table.tableName);

        movieTable.grantReadWriteData(this.markMovieAsUploaded);
        this.markMovieAsUploaded.addEnvironment('TABLE_NAME', movieTable.tableName);

        sendMovieUploadTaskResult.addEnvironment('BUCKET_NAME', movieSourceBucket.bucketName)
        sendMovieUploadTaskResult.addEnvironment('TABLE_NAME', task_token_table.tableName);


        // Define step function
        const definition = new tasks.LambdaInvoke(this, 'IsMovieUploadedTask', {
            lambdaFunction: this.isMovieUploaded,
            integrationPattern: sfn.IntegrationPattern.WAIT_FOR_TASK_TOKEN,
            payload: sfn.TaskInput.fromObject({
                taskToken: sfn.JsonPath.taskToken,
                'movieDetails.$': '$',
            }),
            taskTimeout: sfn.Timeout.duration(cdk.Duration.minutes(1)),
            resultPath: '$.taskResult'
        });
        const cleanUpFailedUploadTask = new tasks.LambdaInvoke(this, 'CleanUpOrphanedMovieDetailsAndTaskTokenTask', {
            lambdaFunction: this.cleanUpFailedUpload,
            payload: sfn.TaskInput.fromObject({
                'movieDetails.$': '$',
            }),
        }).next(new sfn.Fail(this, 'UploadFail'));
        definition.addCatch(cleanUpFailedUploadTask, {
            resultPath: "$.movieDetails"
        });

        const markMovieAsUploadedTask = new tasks.LambdaInvoke(this, 'MarkMovieAsUploadedTask', {
            lambdaFunction: this.markMovieAsUploaded,
            payload: sfn.TaskInput.fromObject({
                'movieDetails.$': '$',
            }),
            resultPath: '$.taskResult'
        });
        definition.next(
            markMovieAsUploadedTask
        );

        this.stateMachine = new sfn.StateMachine(this, 'MovieUploadStateMachine', {
            definitionBody: sfn.DefinitionBody.fromChainable(definition)
        });
        movieSourceBucket.addEventNotification(s3.EventType.OBJECT_CREATED, new LambdaDestination(sendMovieUploadTaskResult));
        this.stateMachine.grantTaskResponse(sendMovieUploadTaskResult);
        task_token_table.grantReadWriteData(sendMovieUploadTaskResult)
    }
}