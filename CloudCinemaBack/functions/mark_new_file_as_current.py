import boto3
import os

s3 = boto3.client('s3')
s3_resource = boto3.resource('s3')
output_bucket_name = os.environ['OUTPUT_BUCKET_NAME']
input_bucket_name = os.environ['BUCKET_NAME']

def fix_m3u8(key):
    response = s3.get_object(Bucket=output_bucket_name, Key=key)
    hls_playlist = response['Body'].read().decode('utf-8')

    new_content = hls_playlist.replace('new_', '')

    s3.put_object(Bucket=output_bucket_name, Key=key, Body=new_content.encode('utf-8'))

def mark_new_file_as_current(event, context):
    try:
        id = event['movieDetails']['id']


        output_bucket = s3_resource.Bucket(output_bucket_name)
        for obj in output_bucket.objects.filter(Prefix='new_'+id):
            if obj.key.endswith('.m3u8'):
                fix_m3u8(obj.key)

            s3_resource.Object(output_bucket_name, obj.key[len('new_'):]).copy_from(CopySource=f'{output_bucket_name}/{obj.key}')
            s3_resource.Object(output_bucket_name, obj.key).delete()

        s3_resource.Object(input_bucket_name, id).copy_from(CopySource=f'{input_bucket_name}/new_{id}')
        
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
        return {
            'status': 'FAILED',
            'statusCode': 500,
            'body': 'Error: {}'.format(str(e))
        }

