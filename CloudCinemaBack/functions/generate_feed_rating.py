import os
import boto3
from boto3.dynamodb.conditions import Attr, Key
import json


table_info_name = os.environ['MOVIE_TABLE_NAME']
index_name=os.environ['INDEX_NAME']
table_rating_name = os.environ['MOVIE_RATING_TABLE_NAME']
dynamodb = boto3.resource('dynamodb')


def from_rating(event, context):
    try:
        email = event['email']['email']

        table_rating = dynamodb.Table(table_rating_name)
        table_info= dynamodb.Table(table_info_name)

        response = table_rating.query(
            IndexName=index_name,
            KeyConditionExpression=Key('email').eq(email))

        items = response['Items']
        items = sorted(items, key=lambda x: x['timestamp'], reverse=True)[:4]

        genres = []
        actors = []

        all_movies_items = table_info.scan()
        
        all_movies = all_movies_items['Items']

        movie_score = {}

        rate=0

        for movie in all_movies:
            movie_score[movie['id']] = 0
            for item in items:
                if item['type'] == 'Actor':
                    actors.extend(item['attr'])
                    rate=int(item['rate'])
                    if rate<3:
                        score = len(set(movie['actors']).intersection(set(actors))) * (-2)/rate
                    else:
                        score = len(set(movie['actors']).intersection(set(actors)))*2*rate

                if item['type'] == 'Genre': 
                    genres.extend(item['attr'])
                    rate=item['rate']
                    if rate<3:
                        score = len(set(movie['genres']).intersection(set(genres))) * (-2)/rate
                    else:
                        score = len(set(movie['genres']).intersection(set(genres)))*2*rate

                movie_score[movie['id']] += int(score)
    
        # print("Rate actors")
        # print(actors)

        # all_movies_items = table_info.scan()
        
        # all_movies = all_movies_items['Items']

        # movie_score = {}

        # for movie in all_movies:
        #     score = len(set(movie['actors']).intersection(set(actors))) * 10
        #     score += len(set(movie['genres']).intersection(set(genres))) * 10
        #     movie_score[movie['id']] = score

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