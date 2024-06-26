import traceback
import json
import uuid
import time
import os
import boto3
import base64


table_name = os.environ['TABLE_NAME']
dynamodb = boto3.resource('dynamodb')


def edit_one(event, context):
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
        name = request_body['name']
        timestamp = int(request_body['timestamp'])
        director = request_body['director']
        actors = request_body['actors']
        year = int(request_body['year'])
        id = request_body['id']

        table = dynamodb.Table(table_name)

        response = table.update_item(
            Key={
                'id': id,
                'timestamp': timestamp
            },
            UpdateExpression='SET #name = :name, #director = :director, #actors = :actors, #year = :year',
            ExpressionAttributeNames={
                '#name': 'name',
                '#director': 'director',
                '#actors': 'actors',
                '#year': 'year'
            },
            ExpressionAttributeValues={
                ':name': name,
                ':director': director,
                ':actors': actors,
                ':year': year
            },
            ReturnValues='ALL_NEW'
        )

        updated_item = response.get('Attributes', {})

        return {
            'statusCode': 200,
            'body': json.dumps(updated_item, default=str),
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
            'body': 'Error: {}'.format(str(e))
        }
    


def edit_one3(event, context):
    return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin':'https://cloud-cinema-front-bucket.s3.amazonaws.com',
                'Access-Control-Allow-Methods': 'PUT,OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'
            }
        }