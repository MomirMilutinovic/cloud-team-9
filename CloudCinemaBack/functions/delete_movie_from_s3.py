import os
import boto3


bucket_name = os.environ['BUCKET_NAME']
output_bucket_name = os.environ['OUTPUT_BUCKET_NAME']
s3 = boto3.client('s3')
s3_resource = boto3.resource('s3')


def delete_one(event, context):
    try:
        id = event['movieDetails']['id']

        output_bucket = s3_resource.Bucket(output_bucket_name)
        output_bucket.objects.filter(Prefix=id).delete()

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