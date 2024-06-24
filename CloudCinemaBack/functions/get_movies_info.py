import json
import os
import boto3



table_name = os.environ['TABLE_NAME']


def get_all(event, context):
    try:
        dynamodb = boto3.client('dynamodb')
        response=dynamodb.scan(TableName=table_name)
        return {
            'statusCode': 200,
            'body': json.dumps(response['Items'],default=str),
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
    

def get_one(event, context):
    try:
        dynamodb = boto3.resource('dynamodb')
        movie_id = event['queryStringParameters']['movie_id']
        timestamp = event['queryStringParameters']['timestamp']

        movie_table = dynamodb.Table(table_name)
        response = movie_table.get_item(Key={
                'id': movie_id,
                'timestamp':int(timestamp)
            })
                                    

        return {
            'statusCode': 200,
            'body': json.dumps(response['Item'], default=str),
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