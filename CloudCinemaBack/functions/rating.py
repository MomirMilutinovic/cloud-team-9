import os
import boto3
import json
import uuid
import time
import traceback

table_name = os.environ['TABLE_NAME']
dynamodb = boto3.resource('dynamodb')


def rate(event, context):
    try:
        request_body = json.loads(event['body'])
        # type = request_body['type']
        email = request_body['email']
        rate = int(request_body['rate'])
        actors = request_body['actors']
        genres = request_body['genres']
        # attr = request_body['attributes']
        id = uuid.uuid4()
        timestamp = int(time.time())

        table = dynamodb.Table(table_name)
        response = table.put_item(
            Item={
                'id': str(id),
                'timestamp': timestamp,
                'email': email,
                'type': 'Actor',
                'rate': rate,
                'attr': actors
            }
        )
        id = uuid.uuid4()
        timestamp = int(time.time())
        response = table.put_item(
            Item={
                'id': str(id),
                'timestamp': timestamp,
                'email': email,
                'type': 'Genre',
                'rate': rate,
                'attr': genres
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