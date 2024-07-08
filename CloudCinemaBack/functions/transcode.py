import gevent.monkey
gevent.monkey.patch_all()
import traceback
import os
import boto3
import json
import atexit
import ffmpeg_streaming, time, sys, datetime
from ffmpeg_streaming import Formats, S3, CloudManager


step_functions = boto3.client('stepfunctions')
input_bucket = os.environ['INPUT_BUCKET']
output_bucket = os.environ['OUTPUT_BUCKET']

def monitor(ffmpeg, duration, time_, time_left, process):
    per = round(time_ / duration * 100)
    if per % 25 != 0 and per != 0:
        return

    sys.stdout.write(
        "\rTranscoding...(%s%%) %s left [%s%s]" %
        (per, datetime.timedelta(seconds=int(time_left)), '#' * per, '-' * (100 - per))
    )
    sys.stdout.flush()

def send_successs(task_token, output):
    print("Transcoding finished successfully. Sending task success")
    step_functions.send_task_success(
        taskToken=task_token,
        output=json.dumps(output)
    )

def transcode(event, context):
    try:
        message_body = event['Records'][0]['body']
        message = json.loads(message_body)
        task_token = message['taskToken']
        movie_id = message['movieDetails']['id']
        atexit.register(send_successs, task_token, "Task completed successfully!")

        s3 = S3(region_name='us-east-1')
        print('Movie to transcode:', movie_id)
        video = ffmpeg_streaming.input(s3, bucket_name=input_bucket, key=movie_id)

        hls = video.hls(Formats.h264())
        hls.auto_generate_representations(ffprobe_bin="/opt/bin/ffprobe")

        save_to_s3 = CloudManager(filename=movie_id+'.m3u8').add(s3, bucket_name=output_bucket)

        hls.output(clouds=save_to_s3, ffmpeg_bin="/opt/bin/ffmpeg", monitor=monitor)

        atexit._run_exitfuncs()
        atexit.unregister(send_successs)
        atexit.unregister(hls.finish_up)

    except Exception as e:
        print("#EXCEPTION")
        print(e)
        print(traceback.format_exc())
        print("#BODY")
        print(event['Records'][0]['body'])
        raise e