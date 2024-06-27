import json
import os
import boto3
import base64
from boto3.dynamodb.conditions import Attr, Key


table_name = os.environ['TABLE_NAME']
search_table_name = os.environ['SEARCH_TABLE_NAME']


def get_all(event, context):
    params = event['queryStringParameters']['params']
    dynamodb = boto3.resource('dynamodb')
    search_table=dynamodb.Table(search_table_name)
    table=dynamodb.Table(table_name)

    try:
        response = search_table.query(
            KeyConditionExpression=Key('attributes').eq(params),
            ProjectionExpression='id')
            
        movie_ids = response['Items']
        found_movies=[]
        for id in movie_ids:
            second_response = table.get_item(Key={'id': id})
            movie = second_response['Item']
            found_movies.append(movie)
        
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin':'https://cloud-cinema-front-bucket.s3.amazonaws.com'
            },
            'body': json.dumps(found_movies,default=str)
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps(str(e))
        }

