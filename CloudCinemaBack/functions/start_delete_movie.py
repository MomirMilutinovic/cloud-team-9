import traceback
import json
import uuid
import time
import os
import boto3
import base64


state_machine_arn = os.environ['STATE_MACHINE_ARN']
step_function = boto3.client('stepfunctions')
table_name = os.environ['TABLE_NAME']
dynamodb = boto3.resource('dynamodb')


def start_delete_movie(event, context):
    try:
        
        id = event['queryStringParameters']['movie_id']
        timestamp = event['queryStringParameters']['timestamp']
        # request_body = json.loads(base64.b64decode(event['body']).decode('utf-8'))
        # id = request_body['id']
        # timestamp = request_body['timestamp']

        movie_table = dynamodb.Table(table_name)

        response = movie_table.get_item(Key={
            'id': id,
            'timestamp':int(timestamp)
        })

        item = response['Item']

        step_function_input = {
            'id': str(id),
            'name': item.get('name'),
            'director': item.get('director'),
            'actors': item.get('actors'),
            'genres': item.get('genres'),
            'episode': item.get('episode'),
            'year': item.get('year'),
            'timestamp': int(timestamp),
        }

        step_function.start_execution(
            stateMachineArn = state_machine_arn,
            input = json.dumps(step_function_input, default=str)
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