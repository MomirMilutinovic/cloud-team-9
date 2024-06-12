import traceback
import json
import uuid
import time
import os
import boto3
import base64



bucket_name = os.environ['BUCKET_NAME']
table_name = os.environ['TABLE_NAME']
dynamodb = boto3.resource('dynamodb')
s3 = boto3.client('s3')

def start_movie_upload(event, context):
    try:
        request_body = json.loads(base64.b64decode(event['body']).decode('utf-8'))
        name = request_body['name']
        timestamp = int(time.time())
        director = request_body['director']
        actors = request_body['actors']
        year = request_body['year']
        id = uuid.uuid4()

        table = dynamodb.Table(table_name)
        # Put item into table
        response = table.put_item(
            Item={
                'id': str(id),
                'name': name,
                'director': director,
                'actors': actors,
                'year': year,
                'timestamp': timestamp,
                'pending': True
            }
        )

        presigned_url = s3.generate_presigned_url('put_object', Params={
            'Bucket': bucket_name,
            'Key': str(id),
            "Expires": 3600
        }, HttpMethod="put")

        request_body['id'] = id
        response_body = {
                'movie': json.dumps(request_body, default=str),
                'uploadUrl': presigned_url

        }
        return {
            'statusCode': 201,
            'body': json.dumps(response_body, default=str),
            'isBase64Encoded': False 
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