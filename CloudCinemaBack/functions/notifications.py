import os
import boto3
import traceback
import json


client = boto3.client("sns")
topic = os.environ["SNS_ARN"]
    

# def publish(event, context):
#     try:
#         message = "Hello from lambda!"
#         subject = "From  Lambda"

#         client.publish(
#             TopicArn=topic, Message=message, Subject=subject)
        
#         return {'statusCode': 200,
#             'headers': {
#             'Content-Type': 'application/json',
#             'Access-Control-Allow-Origin':'*',
#             'Access-Control-Allow-Methods': 'PUT,OPTIONS',
#             'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'
#         }}

#     except Exception as e:
#         print("#EXCEPTION")
#         print(e)
#         print(traceback.format_exc())


def publish(event, context):
    try:
        for record in event['Records']:
            if record['eventName'] == 'INSERT':
                new_image = record['dynamodb']['NewImage']

                actor = new_image.get('actors', {}).get('L', [])
                director = new_image.get('director', {}).get('S', '')
                genre = new_image.get('genres', {}).get('L', [])

                message = f"New movie added: {new_image.get('name', {}).get('S', '')}"

                sns_attributes = {
                    'actors': {'DataType': 'String', 'StringValue': json.dumps(actor)},
                    'director': {'DataType': 'String', 'StringValue': director},
                    'genres': {'DataType': 'String', 'StringValue': json.dumps(genre)}
                }

                client.publish(
                    TopicArn=topic,
                    Message=message,
                    MessageAttributes=sns_attributes
                )

            return {
                'statusCode': 200,
                'body': json.dumps('Messages sent successfully')
            }
        
    except Exception as e:
        print(e)
        print(traceback.format_exc())
        print('#BODY')
        print(event['body'])
        return {
            'statusCode': 500,
            'body': 'Error: {}'.format(str(e)),
        }


def subscribe(event, context):
    try:
        body = json.loads(event['body'])
        email = body['email']
        actors = body.get('actors')
        director = body.get('director')
        genres = body.get('genres')

        filter_policy = {}
        if actors:
            filter_policy['actors'] = actors
        if director:
            filter_policy['director'] = [director]
        if genres:
            filter_policy['genres'] = genres


        subscriptions = client.list_subscriptions_by_topic(TopicArn=topic)
        existing_subscription = None
        for subscription in subscriptions.get('Subscriptions', []):
            if subscription['Endpoint'] == email:
                existing_subscription = subscription
                break

        if existing_subscription:
            subscription_arn = existing_subscription['SubscriptionArn']
            current_attributes = client.get_subscription_attributes(SubscriptionArn=subscription_arn)['Attributes']
            current_filter_policy = json.loads(current_attributes.get('FilterPolicy', '{}'))

            new_filter_policy = {**current_filter_policy, **filter_policy}

            client.set_subscription_attributes(
                SubscriptionArn=subscription_arn,
                AttributeName='FilterPolicy',
                AttributeValue=json.dumps(new_filter_policy) 
            )
            return {
                'statusCode': 200,
                'body': json.dumps({
                    'message': 'Subscription filter policy updated successfully',
                    'subscriptionArn': subscription_arn
                }),
                'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin':'*',
                'Access-Control-Allow-Methods': 'POST,OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'
            }}

        else:
            subscription = client.subscribe(
                TopicArn=topic,
                Protocol='email',
                Endpoint=email,
                Attributes={
                    'FilterPolicy': json.dumps(filter_policy)
                }
            )

        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Subscription created successfully',
                'subscription_arn': subscription['SubscriptionArn']
            }),
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin':'*',
                'Access-Control-Allow-Methods': 'POST,OPTIONS',
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
        }
        