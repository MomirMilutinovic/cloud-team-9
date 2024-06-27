import traceback
import os
import boto3


table_name = os.environ['MOVIE_TABLE_NAME']
dynamodb = boto3.resource('dynamodb')
step_functions = boto3.client('stepfunctions')


def delete_one(event, context):
    try:
        id = event['movieDetails']['id']
        timestamp = event['movieDetails']['timestamp']

        table = dynamodb.Table(table_name)

        table.delete_item(
            Key={
                "id": id,
                "timestamp": int(timestamp)
            }
        )

        return {
                'status': 'SUCCEEDED',
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin':'https://cloud-cinema-front-bucket.s3.amazonaws.com'
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
