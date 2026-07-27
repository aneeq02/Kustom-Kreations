import AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

const s3 = new AWS.S3({
  accessKeyId: process.env.S3_ACCESS_KEY,
  secretAccessKey: process.env.S3_SECRET_KEY,
  region: process.env.S3_REGION,
  ...(process.env.S3_ENDPOINT ? { endpoint: process.env.S3_ENDPOINT } : {}),
});

const BUCKET = process.env.S3_BUCKET!;

export async function uploadToS3(
  buffer: Buffer,
  mimeType: string,
  folder: 'uploads' | 'print-files' | 'vouchers' = 'uploads'
): Promise<string> {
  const ext = mimeType.split('/')[1] || 'jpg';
  const key = `${folder}/${uuidv4()}.${ext}`;
  await s3.putObject({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
    ACL: 'private',
  }).promise();
  return key;
}

export function getSignedUrl(key: string, expiresSeconds = 3600): string {
  return s3.getSignedUrl('getObject', {
    Bucket: BUCKET,
    Key: key,
    Expires: expiresSeconds,
  });
}

export async function deleteFromS3(key: string): Promise<void> {
  await s3.deleteObject({ Bucket: BUCKET, Key: key }).promise();
}
