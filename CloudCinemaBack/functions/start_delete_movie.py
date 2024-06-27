import traceback
import json
import uuid
import time
import os
import boto3
import base64


state_machine_arn = os.environ['STATE_MACHINE_ARN']
step_function = boto3.client('stepfunctions')


def start_delete_movie(event, context):
    try:
        
        id = event['queryStringParameters']['movie_id']
        timestamp = event['queryStringParameters']['timestamp']
        # request_body = json.loads(base64.b64decode(event['body']).decode('utf-8'))
        # id = request_body['id']
        # timestamp = request_body['timestamp']

        step_function_input = {
            'id': str(id),
            'timestamp': timestamp
        }

        step_function.start_execution(
            stateMachineArn = state_machine_arn,
            input = json.dumps(step_function_input)
        )

        return {
            'statusCode': 201,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'DELETE,OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'
            }
        }
    
    except Exception as e:
        print('##EXCEPTION')
        print(e)
        print(traceback.format_exc())
        print('#BODY')
        print(event['body'])
        return {
            'statusCode': 500,
            'body': 'Error: {}'.format(str(e))
        }