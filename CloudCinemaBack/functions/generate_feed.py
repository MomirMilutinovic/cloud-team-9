import os
import boto3
import json
import logging


table_feed_name = os.environ['TABLE_FEED_NAME']
dynamodb = boto3.resource('dynamodb')


def generate(event, context):
    try:
    # Extract parallelResults from the event

        # parallel_results = event.get('parallelResults', [])
        
        # email = event[0]['email']

        # dict1 = event[0]['movie_score']['Payload']['movie_score']
        # dict2 = event[1]['movie_score']['Payload']['movie_score']
        # dict3 = event[2]['movie_score']['Payload']['movie_score']

        # dict2 = parallel_results[1]['movie_score']
        # dict3 = parallel_results[2]['movie_score']

        # parallel = event['parallelResults']
        # parallel = event.get('parallelResults', [])
            # Extract email if not already set
        
        # email = event['email']

        # print("debug")
        # print(parallel)
        # logging.debug(parallel)
            
        # Extract movie scores from the nested structure
        # dict1 = parallel[0]['movie_score']['Payload']['movie_score']
        # dict2 = parallel[1]['movie_score']['Payload']['movie_score']
        # dict3 = parallel[2]['movie_score']['Payload']['movie_score']

        combined_dict = {}

        # for key in dict1.keys():
        #     combined_dict[key] = dict1[key] + dict2[key] + dict3[key]
        email=""
        for result in event:
            email = result['email']
        # Extract the movie_score payload
            movie_score = result.get('movie_score', {}).get('Payload', {}).get('movie_score', {})

            # Merge the scores into combined_scores
            for movie_id, score in movie_score.items():
                if movie_id in combined_dict:
                    combined_dict[movie_id] += score  # Sum the scores
                else:
                    combined_dict[movie_id] = score

        # result = sorted(combined_dict.items(), key=lambda x:x[1])[:10]
        result = sorted(combined_dict.items(), key=lambda x:x[1], reverse=True)

        # ids=result.keys()
        ids = [item[0] for item in result]


        table=dynamodb.Table(table_feed_name)
        response = table.get_item(Key={'email': email})

        if 'Item' in response:
            update_expression = "SET email = :email, id:ids"
            expression_attribute_values = {
            ':email': email,
            ':ids': ids
            }

            table.update_item(
                Key={'email': email},
                UpdateExpression=update_expression,
                ExpressionAttributeValues=expression_attribute_values
            )
        else:
            response = table.put_item(
            Item={
                'email': email,
                'id': ids
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