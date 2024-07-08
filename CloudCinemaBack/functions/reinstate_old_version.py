import boto3
import os
import traceback

bucket_name = os.environ['BUCKET_NAME']
s3 = boto3.client('s3')
s3_resource = boto3.resource('s3')

def reinstate_old_version(event, context):
    try:
        id = event['movieDetails']['id']
        s3_resource.Object(bucket_name, id).copy_from(CopySource=f'{bucket_name}/{id}-old')
        s3_resource.Object(bucket_name, id+'-old').delete()
        s3_resource.Object(bucket_name, 'new_'+ id).delete()

        return
    except Exception as e:
        print("#EXCEPTION")
        print(e)
        print(traceback.format_exc())
        raise e

