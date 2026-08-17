#!/usr/bin/env tsx
import 'reflect-metadata';
import * as path from 'path';
require('dotenv').config({ path: path.resolve(__dirname, '../.env.development') });
import { S3Client, ListBucketsCommand, HeadBucketCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env['R2_ACCOUNT_ID']}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId:     process.env['R2_ACCESS_KEY']!,
    secretAccessKey: process.env['R2_SECRET_KEY']!,
  },
});

(async () => {
  console.log('Bucket env:', process.env['R2_BUCKET_NAME']);
  console.log('Account env:', process.env['R2_ACCOUNT_ID']);
  console.log('Key first 6:', process.env['R2_ACCESS_KEY']?.slice(0,6));

  try {
    const lb = await client.send(new ListBucketsCommand({}));
    console.log('ListBuckets OK. Buckets:', (lb.Buckets||[]).map((b: any) => b.Name).join(', '));
  } catch (e: any) {
    console.log('ListBuckets ERROR:', e.name, e.message);
  }

  try {
    const hb = await client.send(new HeadBucketCommand({ Bucket: process.env['R2_BUCKET_NAME']! }));
    console.log('HeadBucket OK', hb.$metadata.httpStatusCode);
  } catch (e: any) {
    console.log('HeadBucket ERROR:', e.name, e.message, e?.$response?.statusCode);
  }

  try {
    const lo = await client.send(new ListObjectsV2Command({ Bucket: process.env['R2_BUCKET_NAME']!, MaxKeys: 5 }));
    console.log('ListObjects OK. KeyCount=', lo.KeyCount);
  } catch (e: any) {
    console.log('ListObjects ERROR:', e.name, e.message);
  }
})();
