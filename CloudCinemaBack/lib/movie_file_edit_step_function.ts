
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';
import { LambdaDestination } from 'aws-cdk-lib/aws-s3-notifications';
import path = require('path');

export interface MovieFileEditStepFunctionProps {
    movieSourceBucket: s3.Bucket,
    transcodingQueue: sqs.Queue,
    isMovieUploaded: lambda.Function,
    cleanUpFailedUpload: lambda.Function,
    deleteMovieFromS3: lambda.Function,
    sendMovieUploadTaskResult: lambda.Function,
    sendTranscodeFailTaskResult: lambda.Function,
    transcodeMovie: lambda.Function,
    task_token_table: dynamodb.Table,
    outputBucket: s3.Bucket
}

export class MovieFileEditStepFunction extends Construct {
    public readonly stateMachine: sfn.StateMachine;
    public readonly isMovieUploaded: lambda.Function;
    public readonly reinstateOldVersion: lambda.Function;
    public readonly removeTaskToken: lambda.Function;

    constructor(scope: Construct, id: string, props: MovieFileEditStepFunctionProps) {
        super(scope, id);
        const movieSourceBucket = props.movieSourceBucket;
        const transcodingQueue = props.transcodingQueue;
        const deleteMovieFromS3 = props.deleteMovieFromS3;

        const task_token_table = props.task_token_table;


        // Define Lambdas
        this.isMovieUploaded = props.isMovieUploaded;

        this.removeTaskToken = new lambda.Function(this, 'RemoveUploadTaskTokenFunction', {
            runtime: lambda.Runtime.PYTHON_3_9,
            handler: 'remove_upload_task_token.remove_upload_task_token', 
            code: lambda.Code.fromAsset(path.join(__dirname,'../functions')),
            timeout: cdk.Duration.seconds(30)
        });

        this.reinstateOldVersion = new lambda.Function(this, 'ReinstateOldVersionFunction', {
            runtime: lambda.Runtime.PYTHON_3_9,
            handler: 'reinstate_old_version.reinstate_old_version', 
            code: lambda.Code.fromAsset(path.join(__dirname,'../functions')),
            timeout: cdk.Duration.seconds(30)
        });

        const markNewAsCurrent = new lambda.Function(this, 'MarkNewAsCurrentFunction', {
            runtime: lambda.Runtime.PYTHON_3_9,
            handler: 'mark_new_file_as_current.mark_new_file_as_current',
            code: lambda.Code.fromAsset(path.join(__dirname, '../functions')),
            timeout: cdk.Duration.seconds(30)
        });

        // Grant permissions to lambdas
        task_token_table.grantReadWriteData(this.removeTaskToken);
        this.removeTaskToken.addEnvironment('TASK_TOKEN_TABLE_NAME', task_token_table.tableName);

        movieSourceBucket.grantReadWrite(this.reinstateOldVersion);
        this.reinstateOldVersion.addEnvironment('BUCKET_NAME', movieSourceBucket.bucketName);

        props.outputBucket.grantReadWrite(markNewAsCurrent);
        markNewAsCurrent.addEnvironment('OUTPUT_BUCKET_NAME', props.outputBucket.bucketName);
        movieSourceBucket.grantReadWrite(markNewAsCurrent);
        markNewAsCurrent.addEnvironment('BUCKET_NAME', movieSourceBucket.bucketName);

        // Define step function
        const definition = new tasks.LambdaInvoke(this, 'IsMovieUploadedTask', {
            lambdaFunction: this.isMovieUploaded,
            integrationPattern: sfn.IntegrationPattern.WAIT_FOR_TASK_TOKEN,
            payload: sfn.TaskInput.fromObject({
                taskToken: sfn.JsonPath.taskToken,
                'movieDetails': {
                    "id.$": "States.Format('new_{}', $.id)"
                },
            }),
            taskTimeout: sfn.Timeout.duration(cdk.Duration.minutes(1)),
            resultPath: '$.taskResult'
        });
        const removeTaskTokenTask = new tasks.LambdaInvoke(this, 'RemoveTaskTokenTask', {
            lambdaFunction: this.removeTaskToken,
            payload: sfn.TaskInput.fromObject({
                'movieDetails.$': '$',
            }),
            resultPath: '$.taskResult'
        });
        definition.addCatch(removeTaskTokenTask, {
            resultPath: "$.movieDetails"
        });

        const enqueueTranscodeTask = new tasks.SqsSendMessage(this,
            'EnqueueTranscodeTask',
            {
                queue: transcodingQueue,
                messageBody: sfn.TaskInput.fromObject({
                    'movieDetails': {
                        "id.$": "States.Format('new_{}', $.id)"
                    },
                    taskToken: sfn.JsonPath.taskToken 
                }),
                integrationPattern: sfn.IntegrationPattern.WAIT_FOR_TASK_TOKEN,
                resultPath: '$.transcodeTask',
                taskTimeout: sfn.Timeout.duration(cdk.Duration.minutes(10))
            },
        );
        const reinstateOldVersionCatch = new tasks.LambdaInvoke(this, 'ReinstateOldVersionCatch', {
            lambdaFunction: this.reinstateOldVersion,
            payload: sfn.TaskInput.fromObject({
                'movieDetails.$': '$',
            }),
            taskTimeout: sfn.Timeout.duration(cdk.Duration.minutes(1)),
            resultPath: '$.taskResult'
        });
        removeTaskTokenTask.next(
            reinstateOldVersionCatch
        ).next(new sfn.Fail(this, 'UploadFail'));
        definition.next(
            enqueueTranscodeTask
        );
        enqueueTranscodeTask.addCatch(reinstateOldVersionCatch, {
            errors: ['States.ALL'],
            resultPath: "$.catchResult"
        })

        const deleteOldMovieFromS3Task = new tasks.LambdaInvoke(this, 'DeleteOldMovieFromS3', {
            lambdaFunction: deleteMovieFromS3,
            payload: sfn.TaskInput.fromObject({
                'movieDetails': {
                    "id.$": "States.Format('{}-old', $.id)"
                }
            }),
            resultPath: '$.taskResult'
        });
        enqueueTranscodeTask.next(
            deleteOldMovieFromS3Task
        );

        const markNewAsCurrentTask = new tasks.LambdaInvoke(this, 'MarkNewAsCurrentTask', {
            lambdaFunction: markNewAsCurrent,
            payload: sfn.TaskInput.fromObject({
                'movieDetails.$': '$',
            }),
            resultPath: '$.taskResult'
        });
        deleteOldMovieFromS3Task.next(
            markNewAsCurrentTask
        );

        this.stateMachine = new sfn.StateMachine(this, 'MovieFileEditStateMachine', {
            definitionBody: sfn.DefinitionBody.fromChainable(definition)
        });

        this.stateMachine.grantTaskResponse(props.sendMovieUploadTaskResult);
        this.stateMachine.grantTaskResponse(props.sendTranscodeFailTaskResult);
        this.stateMachine.grantTaskResponse(props.transcodeMovie);
    }
}