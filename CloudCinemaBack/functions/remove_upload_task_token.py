import traceback
import os
import boto3

task_token_table_name = os.environ['TASK_TOKEN_TABLE_NAME']
dynamodb = boto3.resource('dynamodb')

def remove_upload_task_token(event, context):
    try:
        id = event['movieDetails']['id']
        task_token_table = dynamodb.Table(task_token_table_name)

        task_token_table.delete_item(Key={
            'movieId': id
        })

        return
    except Exception as e:
        print("#EXCEPTION")
        print(e)
        print(traceback.format_exc())
        raise e