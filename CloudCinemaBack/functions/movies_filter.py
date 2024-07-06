import json
import os
import boto3
import traceback
from boto3.dynamodb.conditions import Attr, Key


table_name = os.environ['TABLE_NAME']
search_table_name = os.environ['SEARCH_TABLE_NAME']
title_index_name=os.environ['TITLE_INDEX_NAME'] 
director_index_name=os.environ['DIRECTOR_INDEX_NAME']
actors_index_name=os.environ['ACTORS_INDEX_NAME']
genres_index_name=os.environ['GENRES_INDEX_NAME']



def get_all(event, context):
    try:
        movie_name = event['queryStringParameters']['movie_name']
        actors = event['queryStringParameters']['actors']
        genres = event['queryStringParameters']['genres']
        director=event['queryStringParameters']['director']
        dynamodb = boto3.resource('dynamodb')
        table=dynamodb.Table(table_name)
        search_table=dynamodb.Table(search_table_name)

        if movie_name=='' and actors=='' and genres=='' and director=='':
            response=table.scan()
            return create_response(response['Items'])

        # actors.sort()
        # genres.sort()
        # actors_list=",".join(actors)
        # genres_list=",".join(genres)

        name_results = set()
        director_results = set()
        actors_results = set()
        genres_results = set()
        
        if movie_name:
            response = table.query(
                IndexName=title_index_name,
                KeyConditionExpression=Key('name').eq(movie_name)
            )
            if 'Items' in response and len(response['Items']) > 0:
                name_results = {(item['id'], item['timestamp']) for item in response['Items']}
            else:
                return create_response([])
        
        if director:
            response = table.query(
                IndexName=director_index_name,
                KeyConditionExpression=Key('director').eq(director)
            )
            if 'Items' in response and len(response['Items']) > 0:
                director_results = {(item['id'], item['timestamp']) for item in response['Items']}
            else:
                return create_response([])
        
        if actors:
            response = search_table.query(
                IndexName=actors_index_name,
                KeyConditionExpression=Key('actors').eq(actors)
            )
            if 'Items' in response and len(response['Items']) > 0:
                actors_results = {(item['id'], item['timestamp']) for item in response['Items']}
            else:
                return create_response([])
        
        if genres:
            response = search_table.query(
                IndexName=genres_index_name,
                KeyConditionExpression=Key('genres').eq(genres)
            )
            if 'Items' in response and len(response['Items']) > 0:
                genres_results = {(item['id'], item['timestamp']) for item in response['Items']}
            else:
                return create_response([])

        all_results = [name_results, director_results, actors_results, genres_results]
        filtered_results = set.intersection(*filter(None, all_results))

        results=[]

        for item in filtered_results:
            response = table.get_item(Key={
                'id': item[0],
                'timestamp':int(item[1])
            })
            if 'Item' in response:
                results.append(response['Item'])
    
        return create_response(results)

    except Exception as e:
        print(e)
        print(traceback.format_exc())
        print('#BODY')
        print(event['body'])
        return {
            'statusCode': 500,
            'body': json.dumps(str(e))
        }

def create_response(data):
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'OPTIONS,GET,PUT,POST,DELETE',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps(data, default=str)
    }

