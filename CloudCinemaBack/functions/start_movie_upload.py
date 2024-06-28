import traceback
import json
import uuid
import time
import os
import boto3
import base64


bucket_name = os.environ['BUCKET_NAME']
table_name = os.environ['TABLE_NAME']
search_table_name=os.environ['SEARCH_TABLE_NAME']
state_machine_arn = os.environ['STATE_MACHINE_ARN']
dynamodb = boto3.resource('dynamodb')
s3 = boto3.client('s3')
sf = boto3.client('stepfunctions')

def start_movie_upload(event, context):
    try:
        request_body = json.loads(event['body'])
        name = request_body['name']
        timestamp = int(time.time())
        director = request_body['director']
        actors = request_body['actors']
        year = request_body['year']
        id = uuid.uuid4()

        table = dynamodb.Table(table_name)
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
        attributes=name+","+",".join(actors)+","+director   #namestiti da ide kao na frontu  name+","+actors+","+director+","+genres
        search_table = dynamodb.Table(search_table_name)
        search_response = search_table.put_item(
            Item={
                'id': str(id),
                'attributes': attributes,
                'timestamp':timestamp
                }
        )

        presigned_url = s3.generate_presigned_url('put_object', Params={
            'Bucket': bucket_name,
            'Key': str(id),
            'Expires': 3600,
        }, ExpiresIn=3600, HttpMethod="PUT")

        request_body['id'] = str(id)
        response_body = {
                'movie': json.dumps(request_body, default=str),
                'uploadUrl': presigned_url

        }

        step_function_input = {
            'id': str(id),
            'timestamp': timestamp
        }
        sf.start_execution(
            stateMachineArn = state_machine_arn,
            input = json.dumps(step_function_input)
        )

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