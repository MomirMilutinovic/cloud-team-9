import os
import boto3


bucket_name = os.environ['BUCKET_NAME']
s3 = boto3.client('s3')


def delete_one(event, context):
    try:
        id = event['movieDetails']['id']

        response = s3.delete_objects(
            Bucket=bucket_name,
            Delete={
                'Objects': [
                    {'Key': id}
                ]
            }
        )
        
        return {
            'status': 'SUCCEEDED',
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