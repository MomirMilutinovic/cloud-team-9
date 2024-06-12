import json
import os
import boto3
import base64



bucket_name = os.environ['BUCKET_NAME']
s3 = boto3.client('s3')

def get_one(event, context):
    # TODO: Make this lambda send a redirect to a S3 presigned url from which the movie will be downloaded
    try:
        movie_name = event['pathParameters']['movie_name']
        response = s3.get_object(Bucket=bucket_name, Key=movie_name)
        data = response['Body'].read()
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'video/mp4',
                'Content-Disposition': f'attachment; filename="{movie_name}"'
            },
            'body':  base64.b64encode(data).decode('utf-8'),
            'isBase64Encoded': True 
        }
    except Exception as e:
        return {
            'statusCode': 404,
            'body': 'Error: {}'.format(str(e))
        }

