import traceback
import json
import os
import boto3
import base64


table_name = os.environ['TABLE_NAME']
search_table_name = os.environ['SEARCH_TABLE_NAME']
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
        genres = request_body['genres']
        episode = request_body['episode']
        description = request_body['description']


        table = dynamodb.Table(table_name)
        search_table = dynamodb.Table(search_table_name)

        response = table.update_item(
            Key={
                'id': id,
                'timestamp': timestamp
            },
            UpdateExpression='SET #name = :name, #director = :director, #actors = :actors, #year = :year, #genres = :genres, #episode = :episode, #description = :description',
            ExpressionAttributeNames={
                '#name': 'name',
                '#director': 'director',
                '#actors': 'actors',
                '#year': 'year',
                '#genres': 'genres',
                '#episode': 'episode',
                '#description':'description'
            },
            ExpressionAttributeValues={
                ':name': name,
                ':director': director,
                ':actors': actors,
                ':year': year,
                ':genres': genres,
                ':episode': episode,
                ':description':description
            },
            ReturnValues='ALL_NEW'
        )
        
        actors.sort()
        genres.sort()
        actors_list=",".join(actors)
        genres_list=",".join(genres)
        attributes=name+","+actors_list+","+director+","+genres_list+","+description
        response = search_table.update_item(
            Key={
                'id': id,
                'timestamp': timestamp
            },
            UpdateExpression='SET #attributes = :attributes, #actors = :actors, #genres = :genres',
            ExpressionAttributeNames={
                '#attributes': 'attributes',
                '#actors': 'actors',
                '#genres': 'genres',
            },
            ExpressionAttributeValues={
                ':attributes': attributes,
                ':actors': actors_list,
                ':genres': genres_list,
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
            'body': 'Error: {}'.format(str(e)),
            'headers': {
                'Access-Control-Allow-Origin':'*',
                'Access-Control-Allow-Methods': 'PUT,OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'
            }
        }
    