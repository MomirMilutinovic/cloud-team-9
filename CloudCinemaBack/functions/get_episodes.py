import json
import os
import boto3
from boto3.dynamodb.conditions import Attr, Key
import traceback


table_name = os.environ['TABLE_NAME']
index_name=os.environ['INDEX_NAME']


def get_all(event, context):
    try:
        params = event['queryStringParameters']['series_name']
        dynamodb = boto3.resource('dynamodb')
        table=dynamodb.Table(table_name)
        response = table.query(
            IndexName=index_name,
            KeyConditionExpression=Key('name').eq(params))
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'OPTIONS,GET,PUT,POST,DELETE',
                'Access-Control-Allow-Origin': '*' 
            },
            'body': json.dumps(response["Items"],default=str)
        }
    except Exception as e:
        print(e)
        print(traceback.format_exc())
        print('#BODY')
        print(event['body'])
        return {
            'statusCode': 500,
            'body': json.dumps(str(e))
        }