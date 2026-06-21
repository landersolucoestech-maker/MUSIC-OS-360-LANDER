#!/usr/bin/env tsx
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

type Region = 'auto' | 'us-east-1';

function loadEnv(path: string) {
  const text = readFileSync(path, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([^#=]+?)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const key = match[1].trim();
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function mask(value?: string) {
  if (!value) return 'MISSING';
  return `${value.slice(0, 6)}...len=${value.length}`;
}

function same(a?: string, b?: string) {
  return Boolean(a && b && a === b);
}

function client(region: Region, forcePathStyle: boolean) {
  return new S3Client({
    region,
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    forcePathStyle,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID ?? process.env.R2_ACCESS_KEY ?? '',
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? process.env.R2_SECRET_KEY ?? '',
    },
  });
}

function errInfo(err: unknown) {
  const e = err as { name?: string; message?: string; Code?: string; $metadata?: Record<string, unknown> };
  return {
    name: e.name ?? 'Error',
    code: e.Code ?? null,
    message: e.message ?? String(err),
    metadata: e.$metadata ?? null,
  };
}

async function sdkCycle(region: Region, forcePathStyle: boolean) {
  const c = client(region, forcePathStyle);
  const bucket = process.env.R2_BUCKET_NAME!;
  const key = `diag/deep/sdk-${region}-path-${forcePathStyle}-${Date.now()}.txt`;
  const body = Buffer.from('hello', 'utf8');
  const out: Record<string, unknown> = { region, forcePathStyle, key };

  for (const [label, command] of [
    ['headBucket', new HeadBucketCommand({ Bucket: bucket })],
    ['listObjects', new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 1 })],
    ['put', new PutObjectCommand({ Bucket: bucket, Key: key, Body: body })],
    ['head', new HeadObjectCommand({ Bucket: bucket, Key: key })],
    ['get', new GetObjectCommand({ Bucket: bucket, Key: key })],
    ['delete', new DeleteObjectCommand({ Bucket: bucket, Key: key })],
    ['headAfterDelete', new HeadObjectCommand({ Bucket: bucket, Key: key })],
  ] as const) {
    try {
      const res = await c.send(command);
      out[label] = { ok: true, metadata: res.$metadata };
      if (label === 'get' && 'Body' in res && res.Body) {
        const stream = res.Body as { transformToString?: () => Promise<string> };
        out.getBody = stream.transformToString ? await stream.transformToString() : 'BODY_PRESENT';
      }
    } catch (err) {
      out[label] = { ok: false, error: errInfo(err) };
      if (label === 'put') break;
    }
  }
  return out;
}

async function putFetch(url: string, headers?: Record<string, string>) {
  const res = await fetch(url, { method: 'PUT', body: Buffer.from('hello', 'utf8'), headers });
  return {
    status: res.status,
    ok: res.ok,
    cfRay: res.headers.get('cf-ray'),
    date: res.headers.get('date'),
    body: res.ok ? 'OK' : (await res.text()).slice(0, 500),
  };
}

function putCurl(url: string, headers: string[] = []) {
  try {
    const args = ['-sS', '-i', '-X', 'PUT'];
    for (const h of headers) args.push('-H', h);
    args.push('--data-binary', 'hello', url);
    const raw = execFileSync('curl.exe', args, { encoding: 'utf8', maxBuffer: 1024 * 1024 });
    return raw
      .split(/\r?\n/)
      .filter((line) => /^HTTP\/|^cf-ray:|^date:|^x-amz|^<Error>|^<Code>|^<Message>/.test(line))
      .join('\n')
      .slice(0, 1500);
  } catch (err) {
    return errInfo(err);
  }
}

async function putAxios(url: string) {
  try {
    const mod = await import('axios');
    const res = await mod.default.put(url, Buffer.from('hello', 'utf8'), {
      validateStatus: () => true,
      headers: {},
    });
    return {
      status: res.status,
      cfRay: res.headers?.['cf-ray'] ?? null,
      body: typeof res.data === 'string' ? res.data.slice(0, 500) : res.data,
    };
  } catch (err) {
    return { skipped: true, reason: 'axios not installed or unavailable', error: errInfo(err) };
  }
}

async function presignMatrix(region: Region, forcePathStyle: boolean) {
  const c = client(region, forcePathStyle);
  const bucket = process.env.R2_BUCKET_NAME!;
  const base = `diag/deep/presign-${region}-path-${forcePathStyle}-${Date.now()}`;
  const variants = [
    { name: 'no_headers', command: new PutObjectCommand({ Bucket: bucket, Key: `${base}-min.txt` }), headers: {} },
    { name: 'content_type', command: new PutObjectCommand({ Bucket: bucket, Key: `${base}-ct.txt`, ContentType: 'text/plain' }), headers: { 'Content-Type': 'text/plain' } },
    { name: 'content_length', command: new PutObjectCommand({ Bucket: bucket, Key: `${base}-cl.txt`, ContentLength: 5 }), headers: { 'Content-Length': '5' } },
    {
      name: 'metadata',
      command: new PutObjectCommand({
        Bucket: bucket,
        Key: `${base}-meta.txt`,
        Metadata: { tenant_id: 'diag', user_id: 'diag' },
      }),
      headers: { 'x-amz-meta-tenant_id': 'diag', 'x-amz-meta-user_id': 'diag' },
    },
  ];
  const out: Record<string, unknown> = { region, forcePathStyle };
  for (const variant of variants) {
    try {
      const url = await getSignedUrl(c, variant.command, { expiresIn: 60 });
      out[variant.name] = {
        signedHeaders: new URL(url).searchParams.get('X-Amz-SignedHeaders'),
        fetch: await putFetch(url, variant.headers),
        curl: putCurl(url, Object.entries(variant.headers).map(([k, v]) => `${k}: ${v}`)),
        axios: variant.name === 'no_headers' ? await putAxios(url) : 'not-run',
      };
    } catch (err) {
      out[variant.name] = { error: errInfo(err) };
    }
  }
  return out;
}

async function clockCheck() {
  const local = new Date();
  const r = await fetch(`https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${process.env.R2_BUCKET_NAME}`, { method: 'HEAD' });
  const remoteDate = r.headers.get('date');
  const remote = remoteDate ? new Date(remoteDate) : null;
  return {
    localIso: local.toISOString(),
    timezoneOffsetMinutes: local.getTimezoneOffset(),
    remoteDate,
    driftMs: remote ? Math.abs(local.getTime() - remote.getTime()) : null,
    status: r.status,
    cfRay: r.headers.get('cf-ray'),
  };
}

async function main() {
  loadEnv(existsSync('apps/api/.env') ? 'apps/api/.env' : '.env');
  const config = {
    accountId: process.env.R2_ACCOUNT_ID,
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    bucket: process.env.R2_BUCKET_NAME,
    accessKeyId: mask(process.env.R2_ACCESS_KEY_ID),
    accessKeyAlias: mask(process.env.R2_ACCESS_KEY),
    secretAccessKey: mask(process.env.R2_SECRET_ACCESS_KEY),
    secretKeyAlias: mask(process.env.R2_SECRET_KEY),
    aliases: {
      access: same(process.env.R2_ACCESS_KEY_ID, process.env.R2_ACCESS_KEY),
      secret: same(process.env.R2_SECRET_ACCESS_KEY, process.env.R2_SECRET_KEY),
    },
  };
  console.log(JSON.stringify({ section: 'config', config }, null, 2));
  console.log(JSON.stringify({ section: 'clock', result: await clockCheck() }, null, 2));

  for (const region of ['auto', 'us-east-1'] as Region[]) {
    for (const forcePathStyle of [true, false]) {
      console.log(JSON.stringify({ section: 'sdk-cycle', result: await sdkCycle(region, forcePathStyle) }, null, 2));
      console.log(JSON.stringify({ section: 'presign', result: await presignMatrix(region, forcePathStyle) }, null, 2));
    }
  }
}

main().catch((err) => {
  console.error(JSON.stringify({ fatal: errInfo(err) }, null, 2));
  process.exit(1);
});
