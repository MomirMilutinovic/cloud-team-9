import boto3
import os
import magic
import datetime
import traceback
import json

bucket_name = os.environ['BUCKET_NAME']
table_name = os.environ['TABLE_NAME']
dynamodb = boto3.resource('dynamodb')
s3 = boto3.client('s3')

def update_file_metadata(event, context):
    try:
        body = json.loads(event['Records'][0]['Sns']['Message']) 
        id = body['Records'][0]['s3']['object']['key']
        if id.startswith('new_') or id.endswith('old'):
            print('Not writing metadata for temporary files')
            return

        response = s3.get_object(Bucket=bucket_name, Key=id)
        file_content = response['Body'].read()
        mime = magic.from_buffer(file_content, mime=True)
        file_size = response['ContentLength']
        metadata = s3.head_object(Bucket=bucket_name, Key=id)['Metadata']
        print(metadata)
        file_info_table = dynamodb.Table(table_name)
        
        if file_info_table.get_item(Key={'id': id}).get('Item', None) is not None:
            print('File existed, updating')
            file_info_table.update_item(
                Key={'id': id},
                UpdateExpression="SET file_size = :val1, mime = :val2, last_update = :val3",
                ExpressionAttributeValues={':val1': file_size, ':val2': mime, ':val3': str(datetime.datetime.now())}
            )
        else:
            print('New file, adding new entry')
            file_info_table.put_item(
                Item={
                    'id': id,
                    'file_size': file_size,
                    'mime': mime,
                    'creation_date': str(datetime.datetime.now()),
                    'last_update': str(datetime.datetime.now())
                }
            )


    except Exception as e:
        print("#EXCEPTION")
        print(e)
        print(traceback.format_exc())
        print("#BODY")
        print(event)