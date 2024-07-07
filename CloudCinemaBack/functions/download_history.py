import json
import os
import boto3
import uuid
import time
import traceback

dynamodb = boto3.resource('dynamodb')
download_table_name = os.environ['DOWNLOAD_TABLE_NAME']

def update_download_history(event, context):
    try:
        request_body = json.loads(event['body'])
        email = request_body['email']
        actors = request_body['actors']
        genres = request_body['genres']
        movie_id = request_body['movie_id']

        table = dynamodb.Table(download_table_name)

        id = uuid.uuid4()
        timestamp = int(time.time())

        response = table.put_item(
            Item={
                'id': str(id),
                'timestamp': timestamp,
                'email': email,
                'genres': genres,
                'actors':  actors,
                'movie_id':movie_id
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