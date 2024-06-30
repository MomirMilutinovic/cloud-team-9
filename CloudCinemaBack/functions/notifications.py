import os
import boto3
import traceback
import json


sns_client = boto3.client("sns")
    

def subscribe(event, context):
    try:
        body = json.loads(event['body'])
        genres = body.get('genres', [])
        actors = body.get('actors', [])
        director = body.get('director', '')
        email = body.get('email', '')

        if not email:
            raise ValueError('Email is required.')

        for genre in genres:
            topic_arn = get_or_create_topic(f'Genre-{genre}')
            subscribe_to_topic(topic_arn, email)

        for actor in actors:
            topic_arn = get_or_create_topic(f'Actor-{actor}')
            subscribe_to_topic(topic_arn, email)

        if director:
            topic_arn = get_or_create_topic(f'Director-{director}')
            subscribe_to_topic(topic_arn, email)

        return {
            'statusCode': 200,
            'body': json.dumps('Processing complete'),
            'headers': {
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
                    'Access-Control-Allow-Methods': 'OPTIONS,GET,PUT,POST,DELETE',
                    'Access-Control-Allow-Origin': '*' 
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
    

def get_or_create_topic(topic_name):
    topics = sns_client.list_topics()
    for topic in topics['Topics']:
        if topic_name in topic['TopicArn']:
            return topic['TopicArn']
    
    response = sns_client.create_topic(Name=topic_name)
    return response['TopicArn']

def get_existing_topic(topic_name):
    topics = sns_client.list_topics()
    for topic in topics['Topics']:
        if topic_name in topic['TopicArn']:
            return topic['TopicArn']
    return None

def subscribe_to_topic(topic_arn, email):
    subscriptions = sns_client.list_subscriptions_by_topic(TopicArn=topic_arn)
    for subscription in subscriptions['Subscriptions']:
        if subscription['Endpoint'] == email:
            return
    
    sns_client.subscribe(
        TopicArn=topic_arn,
        Protocol='email',
        Endpoint=email
    )


def publish(event, context):
    try:
        for record in event['Records']:
            if record['eventName'] == 'INSERT':
                new_image = record['dynamodb']['NewImage']

                genres = [attr['S'] for attr in new_image.get('genres', {}).get('L', [])]
                actors = [attr['S'] for attr in new_image.get('actors', {}).get('L', [])]
                director = new_image.get('director', {}).get('S', '')
                message_content =''  

                for genre in genres:
                    topic_arn = get_existing_topic(f'Genre-{genre}')
                    if topic_arn:
                        message_content=f'Movie with genre {genre} was uploaded!'
                        publish_message(topic_arn, message_content)

                for actor in actors:
                    topic_arn = get_existing_topic(f'Actor-{actor}')
                    if topic_arn:
                        message_content=f'Movie with actor {actor} was uploaded!'
                        publish_message(topic_arn, message_content)

                if director:
                    topic_arn = get_existing_topic(f'Director-{director}')
                    if topic_arn:
                        message_content=f'Movie with director:{director} was uploaded!'
                        publish_message(topic_arn, message_content)

        return {
            'statusCode': 200,
            'body': json.dumps({'message': 'Messages published successfully'}),
            'headers': {
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
                    'Access-Control-Allow-Methods': 'OPTIONS,GET,PUT,POST,DELETE',
                    'Access-Control-Allow-Origin': '*' 
                },
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


def publish_message(topic_arn, message_content):
        sns_client.publish(
            TopicArn=topic_arn,
            Message=message_content
        )