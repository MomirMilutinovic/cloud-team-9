import json
import os
import boto3
from boto3.dynamodb.conditions import Attr, Key
import traceback


table_name = os.environ['TABLE_NAME']
feed_table_name = os.environ['FEED_TABLE_NAME']


def get_all(event, context):
    try:
        movies=[]
        dynamodb = boto3.resource('dynamodb')
        table = dynamodb.Table(table_name)

        feed_table = dynamodb.Table(feed_table_name)

        email = event['queryStringParameters']['email']

        response_feed = feed_table.get_item(Key={
            'email': email
        })

        if "Item" in response_feed: #ako je za korisnika vec generisan feed
            response = response_feed["Item"]
            
            movie_ids=response['id']

            for id in movie_ids:
                movie_response = table.query(
                    KeyConditionExpression=Key('id').eq(id))
                for item in movie_response['Items']: movies.append(item)

        else:
            response=table.scan()
            movies=response['Items']

        return {
            'statusCode': 200,
            'body': json.dumps(movies,default=str),
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
        }
    except Exception as e:
        print(e)
        print(traceback.format_exc())
        print('#BODY')
        print(event['body'])
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
                'Access-Control-Allow-Origin': '*'
            },
        }
    except Exception as e:
        print(e)
        print(traceback.format_exc())
        print('#BODY')
        print(event['body'])
        return {
            'statusCode': 404,
            'body': 'Error: {}'.format(str(e))
        }