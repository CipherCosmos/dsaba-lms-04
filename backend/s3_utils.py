import boto3
from botocore.exceptions import NoCredentialsError, ClientError
import os
from datetime import timedelta
from io import BytesIO

s3_client = boto3.client(
    's3',
    aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
    aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
    region_name=os.getenv('AWS_DEFAULT_REGION', 'us-east-1')
)

BUCKET_NAME = os.getenv('S3_BUCKET_NAME')

def upload_to_s3(file_content: bytes, object_name: str, content_type: str = 'application/octet-stream') -> str:
    """
    Upload a file to S3 bucket.
    Returns the S3 URL.
    """
    if not BUCKET_NAME:
        raise ValueError("S3_BUCKET_NAME not set in environment")

    try:
        s3_client.put_object(
            Bucket=BUCKET_NAME,
            Key=object_name,
            Body=file_content,
            ContentType=content_type
        )
        return f"https://{BUCKET_NAME}.s3.amazonaws.com/{object_name}"
    except ClientError as e:
        print(f"Error uploading to S3: {e}")
        raise
    except NoCredentialsError:
        raise ValueError("AWS credentials not available")

def generate_presigned_url(object_name: str, expiration: int = 3600) -> str:
    """
    Generate a presigned URL for the S3 object.
    """
    if not BUCKET_NAME:
        raise ValueError("S3_BUCKET_NAME not set in environment")

    try:
        url = s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': BUCKET_NAME, 'Key': object_name},
            ExpiresIn=expiration
        )
        return url
    except ClientError as e:
        print(f"Error generating presigned URL: {e}")
        raise

def upload_report_to_s3(report_data: bytes, report_type: str, timestamp: str, format_type: str) -> str:
    """
    Specific function for uploading reports to S3.
    """
    object_name = f"reports/{report_type}/{timestamp}.{format_type}"
    content_type = 'application/pdf' if format_type == 'pdf' else 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    return upload_to_s3(report_data, object_name, content_type)