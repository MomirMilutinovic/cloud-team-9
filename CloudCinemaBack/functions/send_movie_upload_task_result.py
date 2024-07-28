import traceback
import os
import boto3
import json

bucket_name = os.environ['BUCKET_NAME']
table_name = os.environ['TABLE_NAME']
dynamodb = boto3.resource('dynamodb')
s3 = boto3.client('s3')
step_functions = boto3.client('stepfunctions')

def send_movie_upload_task_result(event, context):
    try:
        body = json.loads(event['Records'][0]['Sns']['Message']) 
        id = body['Records'][0]['s3']['object']['key']

        task_token_table = dynamodb.Table(table_name)
        task_token = task_token_table.get_item(
            Key={
                'movieId': id
            }
        )

        step_functions.send_task_success(
            taskToken=task_token['Item']['taskToken'],
            output='{"movieId": "' + id + '"}'
        )

        task_token_table.delete_item(
            Key={
                'movieId': id
            }
        )
    except Exception as e:
        print("#EXCEPTION")
        print(e)
        print(traceback.format_exc())
        print("#BODY")
        print(event)
