import json
import os
import boto3
from boto3.dynamodb.types import TypeDeserializer
import base64


table_name = os.environ['TABLE_NAME']
dynamodb = boto3.client('dynamodb')

def get_all(event, context):
    try:
        response=dynamodb.scan(TableName=table_name)
        return {
            'statusCode': 200,
            'body': json.dumps(response['Items']),
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin':'https://cloud-cinema-front-bucket.s3.amazonaws.com'
            },
        }
    except Exception as e:
        return {
            'statusCode': 404,
            'body': 'Error: {}'.format(str(e))
        }