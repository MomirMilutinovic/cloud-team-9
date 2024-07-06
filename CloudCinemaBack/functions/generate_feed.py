import os
import boto3
import json
import logging


table_feed_name = os.environ['TABLE_FEED_NAME']
dynamodb = boto3.resource('dynamodb')


def generate(event, context):
    try:

        combined_dict = {}

        email=""
        for result in event:
            email = result['email']
            movie_score = result.get('movie_score', {}).get('Payload', {}).get('movie_score', {})

            for movie_id, score in movie_score.items():
                if movie_id in combined_dict:
                    combined_dict[movie_id] += score  
                else:
                    combined_dict[movie_id] = score

        # result = sorted(combined_dict.items(), key=lambda x:x[1])[:10]
        result = sorted(combined_dict.items(), key=lambda x:x[1], reverse=True)

        # ids=result.keys()
        id = [item[0] for item in result]


        table=dynamodb.Table(table_feed_name)
        response = table.get_item(Key={'email': email})

        if 'Item' in response:
            response = table.update_item(
                Key={
                    'email': email
                },
                UpdateExpression='SET #id = :id',
                ExpressionAttributeNames={
                    '#id': 'id'
                },
                ExpressionAttributeValues={
                    ':id': id
                },
                ReturnValues='ALL_NEW'
            )
    
        else:
            response = table.put_item(
            Item={
                'email': email,
                'id': id
            }
        )
            
        return

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