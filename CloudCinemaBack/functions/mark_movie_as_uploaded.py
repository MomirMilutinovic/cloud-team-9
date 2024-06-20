import traceback
import os
import boto3

movie_table_name = os.environ['TABLE_NAME']
dynamodb = boto3.resource('dynamodb')

def mark_movie_as_uploaded(event, context):
    try:
        id = event['movieDetails']['id']
        timestamp = int(event['movieDetails']['timestamp'])
        movie_table = dynamodb.Table(movie_table_name)

        movie_table.update_item(
            Key={
                'id': id,
                'timestamp': timestamp
            },
            UpdateExpression="set pending = :p",
            ExpressionAttributeValues={":p": False},
            ReturnValues="UPDATED_NEW",
        )

        return
    except Exception as e:
        print("#EXCEPTION")
        print(e)
        print(traceback.format_exc())
        raise e