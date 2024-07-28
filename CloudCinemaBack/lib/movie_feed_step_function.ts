import * as cdk from 'aws-cdk-lib';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Construct } from 'constructs';
import path = require('path');
import { Duration } from 'aws-cdk-lib';


export interface MovieFeedStepFunctionProps {
    movieDownloadTable: Table,
    movieRatingTable: Table,
    movieSubscriptionTable: Table,
    movieInfoTable: Table,
    movieFeedTable: Table
}

export class MovieGenerateFeedStepFunction extends Construct {
    public readonly stateMachine: sfn.StateMachine;
    public readonly feedFromRating: lambda.Function;
    public readonly feedFromSubcription: lambda.Function;
    public readonly feedFromDownload: lambda.Function;
    public readonly createResultFeed: lambda.Function;


    constructor(scope: Construct, id: string, props: MovieFeedStepFunctionProps) {
        super(scope, id);
        const movieInfoTable = props.movieInfoTable;
        const movieDownloadTable = props.movieDownloadTable;
        const movieRatingTable = props.movieRatingTable;
        const movieSubscriptionTable = props.movieSubscriptionTable;
        const movieFeedTable = props.movieFeedTable;



        // Define Lambdas
        this.feedFromSubcription = new lambda.Function(this, 'GenerateFeedFromSubFunction', {
            runtime: lambda.Runtime.PYTHON_3_9,
            handler: 'generate_feed_subscription.from_subscription', 
            code: lambda.Code.fromAsset(path.join(__dirname,'../functions')),
            timeout: cdk.Duration.seconds(30)
        });

        this.feedFromRating = new lambda.Function(this, 'GenerateFeedFromRatingFunction', {
            runtime: lambda.Runtime.PYTHON_3_9,
            handler: 'generate_feed_rating.from_rating',
            code: lambda.Code.fromAsset(path.join(__dirname,'../functions')),
            timeout: cdk.Duration.seconds(30)
        });

        this.feedFromDownload = new lambda.Function(this, 'GenerateFeedFromDownloadFunction', {
            runtime: lambda.Runtime.PYTHON_3_9,
            handler: 'generate_feed_download.from_download', 
            code: lambda.Code.fromAsset(path.join(__dirname,'../functions')),
            timeout: cdk.Duration.seconds(30)
        });

        this.createResultFeed = new lambda.Function(this, 'GenerateResultFeedFunction', {
            runtime: lambda.Runtime.PYTHON_3_9,
            handler: 'generate_feed.generate', 
            code: lambda.Code.fromAsset(path.join(__dirname,'../functions')),
            timeout: cdk.Duration.seconds(30)
        });
        

        // Grant permissions to lambdas
        movieDownloadTable.grantFullAccess(this.feedFromDownload)
        movieInfoTable.grantFullAccess(this.feedFromDownload)

        movieRatingTable.grantFullAccess(this.feedFromRating)
        movieInfoTable.grantFullAccess(this.feedFromRating)
        
        movieSubscriptionTable.grantFullAccess(this.feedFromSubcription)
        movieInfoTable.grantFullAccess(this.feedFromSubcription)

        movieFeedTable.grantReadWriteData(this.createResultFeed)
        
        this.feedFromDownload.addEnvironment('MOVIE_TABLE_NAME', movieInfoTable.tableName);
        this.feedFromDownload.addEnvironment('INDEX_NAME', 'DownloadHistoryIndex');
        this.feedFromDownload.addEnvironment('MOVIE_DOWNLOAD_TABLE_NAME', movieDownloadTable.tableName);

        this.feedFromRating.addEnvironment('MOVIE_TABLE_NAME', movieInfoTable.tableName);
        this.feedFromRating.addEnvironment('INDEX_NAME', 'RatingIndex');
        this.feedFromRating.addEnvironment('MOVIE_RATING_TABLE_NAME', movieRatingTable.tableName);

        this.feedFromSubcription.addEnvironment('MOVIE_TABLE_NAME', movieInfoTable.tableName);
        this.feedFromSubcription.addEnvironment('INDEX_NAME', 'SubscriptionIndex');
        this.feedFromSubcription.addEnvironment('MOVIE_SUB_TABLE_NAME', movieSubscriptionTable.tableName);

        this.createResultFeed.addEnvironment('TABLE_FEED_NAME', movieFeedTable.tableName);

        // define tasks
        const ratingTask = new tasks.LambdaInvoke(this, 'Generate feed by rating', {
            lambdaFunction: this.feedFromRating,
            taskTimeout: sfn.Timeout.duration(cdk.Duration.minutes(1)),
            payload: sfn.TaskInput.fromObject({
                'email.$': '$',
            }),
            resultPath: '$.movie_score'
        })

        const downloadTask = new tasks.LambdaInvoke(this, 'Generate feed by download', {
            lambdaFunction: this.feedFromDownload,
            taskTimeout: sfn.Timeout.duration(cdk.Duration.minutes(1)),
            payload: sfn.TaskInput.fromObject({
                'email.$': '$',
            }),
            resultPath: '$.movie_score'
        });
    
        const subscriptionTask = new tasks.LambdaInvoke(this, 'Generate feed by subscription', {
            lambdaFunction: this.feedFromSubcription,
            taskTimeout: sfn.Timeout.duration(cdk.Duration.minutes(1)),
            payload: sfn.TaskInput.fromObject({
                'email.$': '$',
            }),
            resultPath: '$.movie_score'
        });

        const parallelState = new sfn.Parallel(this, 'Parallel State', {
            resultPath: '$.parallelResults'  // Collect results from each branch into parallelResults
          });
          parallelState.branch(ratingTask);
          parallelState.branch(downloadTask);
          parallelState.branch(subscriptionTask);


        const generateFeedTask = new tasks.LambdaInvoke(this, 'Process Results', {
            lambdaFunction: this.createResultFeed,
            inputPath: '$.parallelResults',
            taskTimeout: sfn.Timeout.duration(cdk.Duration.minutes(1))
            // outputPath: '$.Payload'
        });

        // Define step function
        const definition = parallelState.next(generateFeedTask);


        this.stateMachine = new sfn.StateMachine(this, 'MovieDeleteStateMachine', {
            definitionBody: sfn.DefinitionBody.fromChainable(definition),
            timeout: Duration.minutes(3),
        });
    }
}