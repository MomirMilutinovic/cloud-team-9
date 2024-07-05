import os
import boto3
import json
import uuid
import time
import traceback


table_name = os.environ['TABLE_NAME']
dynamodb = boto3.resource('dynamodb')


def put_item(event, context):
    try:
        request_body = json.loads(event['body'])
        email = request_body['email']
        # movie_id = request_body['movie_id']
        # movie_timestamp = request_body['movie_id']
        genres = request_body['genres']
        actors = request_body['actors']

        id = uuid.uuid4()
        timestamp = int(time.time())

        table = dynamodb.Table(table_name)
        response = table.put_item(
            Item={
                'id': str(id),
                'timestamp': timestamp,
                'email': email,
                'genres': genres,
                'actors':  actors
            }
        )
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin':'*'
            },
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