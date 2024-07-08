import * as cdk from 'aws-cdk-lib';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';
import { LambdaDestination } from 'aws-cdk-lib/aws-s3-notifications';
import path = require('path');
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';

export interface MovieUploadStepFunctionProps {
    movieSourceBucket: s3.Bucket,
    movieTable: Table,
    movieOutputBucket: s3.Bucket
}

export class MovieUploadStepFunction extends Construct {
    public readonly stateMachine: sfn.StateMachine;
    public readonly isMovieUploaded: lambda.Function;
    public readonly cleanUpFailedUpload: lambda.Function;
    public readonly markMovieAsUploaded: lambda.Function;
    public readonly deleteMovieFromS3: lambda.Function;
    public readonly sendMovieUploadTaskResult: lambda.Function;
    public readonly sendTranscodeFailTaskResult: lambda.Function;
    public readonly transcodeMovie: lambda.Function;
    public readonly task_token_table: dynamodb.Table;
    public readonly transcodingQueue: sqs.Queue;

    constructor(scope: Construct, id: string, props: MovieUploadStepFunctionProps) {
        super(scope, id);
        const movieTable = props.movieTable;
        const movieSourceBucket = props.movieSourceBucket;
        const movieOutputBucket = props.movieOutputBucket;

        const task_token_table = new dynamodb.Table(this, 'MovieUploadTaskTokenTable', {
            tableName: 'movie-upload-task-token-table', 
            partitionKey: { name: 'movieId', type: dynamodb.AttributeType.STRING},
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            readCapacity:1,            //u grupi pise da treba da se stave read i write na 1 da ne bi naplacivao
            writeCapacity:1
        });               


        const deadLetterQueue = new sqs.Queue(this, 'dead-letter-queue', {
            retentionPeriod: cdk.Duration.minutes(30)
        });
        const transcodingQueue = new sqs.Queue(this, 'transcoding-queue', {
            visibilityTimeout: cdk.Duration.minutes(6),
            retentionPeriod: cdk.Duration.minutes(30),
            deadLetterQueue: {
                maxReceiveCount: 3,
                queue: deadLetterQueue
            }
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
        const deleteMovieFromS3 = new lambda.Function(this, 'DeleteMovieFromS3CatchFunction', {
            runtime: lambda.Runtime.PYTHON_3_9,
            handler: 'delete_movie_from_s3.delete_one', 
            code: lambda.Code.fromAsset(path.join(__dirname,'../functions')),
            timeout: cdk.Duration.seconds(30)
        });
        const sendTranscodeFailTaskResult = new lambda.Function(this, 'SendTranscodeFailTaskResultFunction', {
            runtime: lambda.Runtime.PYTHON_3_9,
            handler: 'send_transcode_fail_task_result.send_transcode_fail_task_result',
            code: lambda.Code.fromAsset(path.join(__dirname, '../functions')),
            timeout: cdk.Duration.seconds(30)
        });


        const ffmegLayer = new lambda.LayerVersion(this, 'ffmpeg-layer', {
            layerVersionName: 'ffmpeg',
            compatibleRuntimes: [lambda.Runtime.PYTHON_3_8],
            code: lambda.AssetCode.fromAsset('layers/ffmpeg')
          });
        const transcodeMovie = new lambda.Function(this, 'TranscodeMovieFunction', {
            runtime: lambda.Runtime.PYTHON_3_8, // python-ffmpeg-video-streaming does not work on python versions newer than 3.8
            handler: 'transcode.transcode',
            code: lambda.Code.fromAsset(path.join(__dirname, '../functions'),{
                bundling: {
                    image: lambda.Runtime.PYTHON_3_8.bundlingImage,
                    command: [
                        'bash', '-c', 'pip install --no-cache python-ffmpeg-video-streaming gevent -t /asset-output && rsync -r . /asset-output'
                    ]
                }
            }),
            timeout: cdk.Duration.minutes(5),
            layers: [ffmegLayer],
            memorySize: 3008
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

        movieSourceBucket.grantReadWrite(deleteMovieFromS3);
        movieOutputBucket.grantReadWrite(deleteMovieFromS3);
        deleteMovieFromS3.addEnvironment('BUCKET_NAME', movieSourceBucket.bucketName);
        deleteMovieFromS3.addEnvironment('OUTPUT_BUCKET_NAME', movieOutputBucket.bucketName);

        movieSourceBucket.grantRead(transcodeMovie);
        movieOutputBucket.grantWrite(transcodeMovie);
        transcodeMovie.addEnvironment('INPUT_BUCKET', movieSourceBucket.bucketName)
        transcodeMovie.addEnvironment('OUTPUT_BUCKET', movieOutputBucket.bucketName)

        // Hook up lambdas for transcoding to sqs queues
        transcodeMovie.addEventSource(new SqsEventSource(transcodingQueue, {
            batchSize: 1
        }));
        sendTranscodeFailTaskResult.addEventSource(new SqsEventSource(deadLetterQueue, {
            batchSize: 1
        }));


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

        const enqueueTranscodeTask = new tasks.SqsSendMessage(this,
            'EnqueueTranscodeTask',
            {
                queue: transcodingQueue,
                messageBody: sfn.TaskInput.fromObject({
                    'movieDetails.$': '$',
                    taskToken: sfn.JsonPath.taskToken 
                }),
                integrationPattern: sfn.IntegrationPattern.WAIT_FOR_TASK_TOKEN,
                resultPath: '$.transcodeTask',
                taskTimeout: sfn.Timeout.duration(cdk.Duration.minutes(10))
            },
        );
        const deleteFromS3Catch = new tasks.LambdaInvoke(this, 'DeleteFromS3Catch', {
            lambdaFunction: deleteMovieFromS3,
            payload: sfn.TaskInput.fromObject({
                'movieDetails.$': '$',
            }),
            taskTimeout: sfn.Timeout.duration(cdk.Duration.minutes(1)),
            resultPath: '$.taskResult'
        });
        deleteFromS3Catch.next(cleanUpFailedUploadTask);
        definition.next(
            enqueueTranscodeTask
        );
        enqueueTranscodeTask.addCatch(deleteFromS3Catch, {
            errors: ['States.ALL'],
            resultPath: "$.catchResult"
        })

        const markMovieAsUploadedTask = new tasks.LambdaInvoke(this, 'MarkMovieAsUploadedTask', {
            lambdaFunction: this.markMovieAsUploaded,
            payload: sfn.TaskInput.fromObject({
                'movieDetails.$': '$',
            }),
            resultPath: '$.taskResult'
        });
        enqueueTranscodeTask.next(
            markMovieAsUploadedTask
        );

        this.stateMachine = new sfn.StateMachine(this, 'MovieUploadStateMachine', {
            definitionBody: sfn.DefinitionBody.fromChainable(definition)
        });
        movieSourceBucket.addEventNotification(s3.EventType.OBJECT_CREATED, new LambdaDestination(sendMovieUploadTaskResult));
        this.stateMachine.grantTaskResponse(sendMovieUploadTaskResult);
        this.stateMachine.grantTaskResponse(sendTranscodeFailTaskResult);
        this.stateMachine.grantTaskResponse(transcodeMovie);
        task_token_table.grantReadWriteData(sendMovieUploadTaskResult)


        this.deleteMovieFromS3 = deleteMovieFromS3;
        this.sendMovieUploadTaskResult = sendMovieUploadTaskResult
        this.sendTranscodeFailTaskResult = sendTranscodeFailTaskResult;
        this.transcodeMovie = transcodeMovie;
        this.task_token_table = task_token_table;
        this.transcodingQueue = transcodingQueue;
    }
}