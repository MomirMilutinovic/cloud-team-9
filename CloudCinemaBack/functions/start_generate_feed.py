import traceback
import json
import os
import boto3
import base64


# watch_history_table_name = os.environ['TABLE_WATCH_HISTORY_NAME']
# rating_table_name = os.environ['TABLE_RATING_NAME']
# subscription_table_name = os.environ['TABLE_SUBSCRIPTION_NAME']
# download_table_name = os.environ['TABLE_DOWNLOAD_INFO_NAME']

dynamodb = boto3.resource('dynamodb')
state_machine_arn = os.environ['STATE_MACHINE_ARN']
step_function = boto3.client('stepfunctions')

def update_feed(event, context):
    try:
        for record in event['Records']:
            if record['eventName'] == 'INSERT':
                new_image = record['dynamodb']['NewImage']
                email = new_image.get('email', {}).get('S', '')

                step_function_input = {
                    'email': email,
                }

                step_function.start_execution(
                    stateMachineArn = state_machine_arn,
                    input = json.dumps(step_function_input, default=str)
                )

                return {
                    'statusCode': 201,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'DELETE,OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'
                    }
                }
    
    except Exception as e:
        print('##EXCEPTION')
        print(e)
        print(traceback.format_exc())
        print('#BODY')
        print(event['body'])
        return {
            'statusCode': 500,
            'body': 'Error: {}'.format(str(e))
        }


