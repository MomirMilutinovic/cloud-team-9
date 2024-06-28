import traceback
import os
import boto3
import json


step_functions = boto3.client('stepfunctions')

def send_transcode_fail_task_result(event, context):
    try:
        message_body = event['Records'][0]['body']
        message = json.loads(message_body)
        task_token = message['taskToken']

        step_functions.send_task_failure(
            taskToken=task_token,
            error='TranscodeFailed',
            cause='Transcode failed'
        )

    except Exception as e:
        print("#EXCEPTION")
        print(e)
        print(traceback.format_exc())
u