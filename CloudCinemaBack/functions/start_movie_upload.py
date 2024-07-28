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
        description = request_body['description']
        timestamp = int(time.time())
        director = request_body['director']
        actors = request_body['actors']
        year = request_body['year']
        description = request_body['description']
        genres = request_body['genres']
        episode = request_body['episode']
        id = uuid.uuid4()

        table = dynamodb.Table(table_name)
        response = table.put_item(
            Item={
                'id': str(id),
                'name': name,
                'description': description,
                'director': director,
                'actors': actors,
                'genres':genres,
                'year': year,
                'episode': episode,
                'timestamp': timestamp,
                'pending': True,
            }
        )
        actors.sort()
        genres.sort()
        actors_list=",".join(actors)
        genres_list=",".join(genres)
        attributes=name+","+actors_list+","+director+","+genres_list+','+description
        search_table = dynamodb.Table(search_table_name)
        search_response = search_table.put_item(
            Item={
                'id': str(id),
                'attributes': attributes,
                'timestamp':timestamp,
                'actors':actors_list,
                'genres':genres_list
                }
        )

        presigned_url = s3.generate_presigned_url('put_object', Params={
            'Bucket': bucket_name,
            'Key': str(id),
            'Expires': 3600,
            'ContentType': 'application/octet-stream'
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
            'isBase64Encoded': False,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin':'*',
                'Access-Control-Allow-Methods': 'PUT,OPTIONS',
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