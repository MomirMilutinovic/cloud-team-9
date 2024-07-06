import os
import boto3
from boto3.dynamodb.conditions import Attr, Key
import json
import logging

table_info_name = os.environ['MOVIE_TABLE_NAME']
index_name=os.environ['INDEX_NAME']
table_download_name = os.environ['MOVIE_DOWNLOAD_TABLE_NAME']
dynamodb = boto3.resource('dynamodb')


def from_download(event, context):
    try:
        email = event['email']['email']

        table_download = dynamodb.Table(table_download_name)
        table_info= dynamodb.Table(table_info_name)

        response = table_download.query(
            IndexName=index_name,
            KeyConditionExpression=Key('email').eq(email))

        items = response['Items'] # {'email', [genres], [actros], 'timestamp'} ,{'email', [genres], [actros], 'timestamp'}} , {'email', [genres], [actros], 'timestamp'}
        # items = sorted(items, key=lambda x: x['timestamp'], reverse=True)[:3]
        items = sorted(items, key=lambda x: x['timestamp'], reverse=True)[:3]

        genres = []
        actors = []

        for item in items:
            actors.extend(item['actors']) 
            genres.extend(item['genres'])


        all_movies_items = table_info.scan()
        
        all_movies = all_movies_items['Items']

        print("Download actors")
        print(actors)

        movie_score = {}

        for movie in all_movies:
            score = len(set(movie['actors']).intersection(set(actors))) * 5
            score += len(set(movie['genres']).intersection(set(genres))) * 5
            movie_score[movie['id']] = score

        # movie_score = sorted(movie_score, reverse=True)
        # movie_score = sorted(movie_score.items(), key=lambda x:x[1])

        response = {
            'email': email,
            'movie_score': movie_score
        }

        return {
            'movie_score': movie_score,

            # 'body': json.dumps(response, default=str),
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin':'*'
            },
        }

    except Exception as e:
        print('##EXCEPTION')
        print(e)
        print('#BODY')
        print(event['body'])
        return {
            'status': 'FAILED',
            'statusCode': 500,
            'body': 'Error: {}'.format(str(e))
        }