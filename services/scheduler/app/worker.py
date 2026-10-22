import json
import os
import time
import boto3
from .models import SchedulingRequest
from .solver import solve


def run():
    request_url = os.environ["SCHEDULING_REQUEST_QUEUE_URL"]
    result_url = os.environ["SCHEDULING_RESULT_QUEUE_URL"]
    sqs = boto3.client("sqs", region_name=os.getenv("AWS_REGION", "ap-northeast-1"))
    while True:
        response = sqs.receive_message(QueueUrl=request_url, WaitTimeSeconds=20, MaxNumberOfMessages=1, VisibilityTimeout=60)
        for message in response.get("Messages", []):
            payload = SchedulingRequest.model_validate_json(message["Body"])
            result = solve(payload)
            sqs.send_message(QueueUrl=result_url, MessageBody=result.model_dump_json())
            sqs.delete_message(QueueUrl=request_url, ReceiptHandle=message["ReceiptHandle"])
        time.sleep(0.2)


if __name__ == "__main__":
    run()

