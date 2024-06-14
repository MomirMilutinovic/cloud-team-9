import traceback
import os
import boto3

movie_table_name = os.environ['MOVIE_TABLE_NAME']
task_token_table_name = os.environ['TASK_TOKEN_TABLE_NAME']
dynamodb = boto3.resource('dynamodb')

def clean_up_failed_upload(event, context):
    try:
        id = event['movieDetails']['id']
        timestamp = int(event['movieDetails']['timestamp'])
        task_token_table = dynamodb.Table(task_token_table_name)
        movie_table = dynamodb.Table(movie_table_name)

        task_token_table.delete_item(Key={
            'movieId': id
        })

        movie_table.delete_item(Key={
            'id': id,
            'timestamp': timestamp
        })

        return
    except Exception as e:
        print("#EXCEPTION")
        print(e)
        print(traceback.format_exc())
        raise e