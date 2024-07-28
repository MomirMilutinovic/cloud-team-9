import traceback
import os
import boto3

bucket_name = os.environ['BUCKET_NAME']
table_name = os.environ['TABLE_NAME']
dynamodb = boto3.resource('dynamodb')
s3 = boto3.client('s3')
step_functions = boto3.client('stepfunctions')

def is_movie_uploaded(event, context):
    try:
        id = event['movieDetails']['id']
        task_token = event['taskToken']

        task_token_table = dynamodb.Table(table_name)
        task_token_table.put_item(
            Item={
                'movieId': id,
                'taskToken': task_token
            }
        )

    except Exception as e:
        print("#EXCEPTION")
        print(e)
        print(traceback.format_exc())