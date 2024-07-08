
import traceback
import json
import os
import boto3
import time


state_machine_arn = os.environ['STATE_MACHINE_ARN']
s3 = boto3.client('s3')
bucket_name = os.environ['BUCKET_NAME']
output_bucket_name = os.environ['OUTPUT_BUCKET_NAME']
sf = boto3.client('stepfunctions')
s3_resource = boto3.resource('s3')


def start_movie_file_edit(event, context):
    try:
        if event['httpMethod'] == 'OPTIONS':
            return {
                'statusCode': 204,
                'headers': {
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
                    'Access-Control-Allow-Methods': 'OPTIONS,GET,PUT,POST,DELETE',
                    'Access-Control-Allow-Origin': '*' 
                },
            }

        request_body = json.loads(event['body'])
        id = request_body['id']
        timestamp = int(time.time())

        s3_resource.Object(bucket_name, id+'-old').copy_from(CopySource=f'{bucket_name}/{id}')
        s3_resource.Object(bucket_name, id).delete()

        presigned_url = s3.generate_presigned_url('put_object', Params={
            'Bucket': bucket_name,
            'Key': 'new_' + str(id),
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
            'statusCode': 200,
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
        print(e)
        print(traceback.format_exc())
        print('#BODY')
        print(event['body'])
        return {
            'statusCode': 500,
            'body': 'Error: {}'.format(str(e)),
            'headers': {
                'Access-Control-Allow-Origin':'*',
                'Access-Control-Allow-Methods': 'PUT,OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'
            }
        }
    