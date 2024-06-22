import json
import os
import boto3
import base64



bucket_name = os.environ['BUCKET_NAME']
s3 = boto3.client('s3')

def get_one(event, context):
    try:
        movie_name = event['pathParameters']['movie_name']
        presigned_url = s3.generate_presigned_url('get_object', Params={
            'Bucket': bucket_name,
            'Key': movie_name
        }, ExpiresIn=3600, HttpMethod="GET")
        return {
            'statusCode': 302,
            'headers': {
                'Access-Control-Allow-Origin':'https://cloud-cinema-front-bucket.s3.amazonaws.com',
                'Location': presigned_url,
            },
        }
    except Exception as e:
        return {
            'statusCode': 404,
            'body': 'Error: {}'.format(str(e))
        }

