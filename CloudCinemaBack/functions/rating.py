import os
import boto3
import json
import uuid
import time
from boto3.dynamodb.conditions import Attr, Key
import traceback

table_name = os.environ['TABLE_NAME']
history_table_name = os.environ['WATCH_HISTORY_TABLE_NAME']
index_name=os.environ['INDEX_NAME']
dynamodb = boto3.resource('dynamodb')


def rate(event, context):
    try:
        request_body = json.loads(event['body'])
        # type = request_body['type']
        email = request_body['email']
        movie_id = request_body['movie_id']
        rate = int(request_body['rate'])
        actors = request_body['actors']
        genres = request_body['genres']
        # attr = request_body['attributes']
        id = uuid.uuid4()
        timestamp = int(time.time())

        table = dynamodb.Table(table_name)
        history_table = dynamodb.Table(history_table_name)

        response=history_table.query(IndexName=index_name,
                                     KeyConditionExpression=Key('email').eq(email),
                                     ProjectionExpression='movie_id'
                                    )
        movie_ids = [item['movie_id'] for item in response['Items']]
        if movie_id not in movie_ids:
            return {
            'statusCode': 404,
            'headers': {
                'Access-Control-Allow-Origin':'*'
            },
        }

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