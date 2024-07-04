import os
import boto3
from boto3.dynamodb.conditions import Attr
import json


table_info_name = os.environ['MOVIE_TABLE_NAME']
table_rating_name = os.environ['MOVIE_RATING_TABLE_NAME']
dynamodb = boto3.resource('dynamodb')


def from_rating(event, context):
    try:
        email = event['email']['email']

        table_rating = dynamodb.Table(table_rating_name)
        table_info= dynamodb.Table(table_info_name)

        response = table_rating.scan(
            FilterExpression=Attr('email').eq(email)
        )
        items = response['Items']
        items = sorted(items, key=lambda x: x['timestamp'], reverse=True)[:3]

        genres = []
        actors = []

        for item in items:
            if item['type'] == 'Actor':
                actors.extend(item['attr'])
            if item['type'] == 'Genre': genres.extend(item['attr'])

        all_movies_items = table_info.scan()
        
        all_movies = all_movies_items['Items']

        movie_score = {}

        for movie in all_movies:
            score = len(set(movie['actors']).intersection(set(actors))) * 10
            score += len(set(movie['genres']).intersection(set(genres))) * 10
            movie_score[movie['id']] = 0

        # # movie_score = sorted(movie_score.items(), key=lambda x:x[1])

        # response = {
        #     'email': email,
        #     'movie_score': movie_score
        # }

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