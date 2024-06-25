import json
import os
import boto3
import base64
from boto3.dynamodb.conditions import Attr


table_name = os.environ['TABLE_NAME']

def get_all(event, context):
    movies = []
    movie_name = event['queryStringParameters']['movie_name']
    actor = event['queryStringParameters']['actor']
    genre = event['queryStringParameters']['genre']
    dynamodb = boto3.resource('dynamodb')
    table=dynamodb.Table(table_name)


    filter_expressions = []

    if movie_name:
        filter_expressions.append(Attr('name').contains(movie_name))
    
    if actor:
        filter_expressions.append(Attr('actors').contains(actor))
    
    if genre:
        filter_expressions.append(Attr('genres').contains(genre))

    combined_filter_expression = None

    if filter_expressions:
        combined_filter_expression = filter_expressions[0]
        for expression in filter_expressions[1:]:
            combined_filter_expression = combined_filter_expression & expression

    scan_kwargs = {}

    if combined_filter_expression:
        scan_kwargs["FilterExpression"] = combined_filter_expression

    try:
        done = False
        start_key = None
        while not done:
            if start_key:
                scan_kwargs["ExclusiveStartKey"] = start_key
            response = table.scan(**scan_kwargs)
            movies.extend(response.get("Items", []))
            start_key = response.get("LastEvaluatedKey", None)
            done = start_key is None

        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin':'https://cloud-cinema-front-bucket.s3.amazonaws.com'
            },
            'body': json.dumps(movies,default=str)
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps(str(e))
        }

