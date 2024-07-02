import traceback
import os
import boto3


table_name = os.environ['MOVIE_TABLE_NAME']
dynamodb = boto3.resource('dynamodb')

def clean_up(event, context):
    try:
        id = event['movieDetails']['id']
        timestamp = event['movieDetails']['timestamp']
        name = event['movieDetails']['name']
        actors = event['movieDetails']['actors']
        director = event['movieDetails']['director']
        year = event['movieDetails']['year']
        genres = event['movieDetails']['genres']
        episode = event['movieDetails']['episode']


        movie_table = dynamodb.Table(table_name)
        
        response = movie_table.put_item(
            Item={
                'id': str(id),
                'name': name,
                'director': director,
                'actors': actors,
                'year': year,
                'episode': episode,
                'genres': genres,
                'timestamp': int(timestamp),
                'pending': False
            }
        )

        return 
    
    except Exception as e:
        print("#EXCEPTION")
        print(e)
        print(traceback.format_exc())
        raise e





