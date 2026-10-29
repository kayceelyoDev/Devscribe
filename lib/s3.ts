import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { env } from "./env";

export const s3 = new S3Client({
  endpoint: env.S3_ENDPOINT,
  region: env.S3_REGION,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY,
    secretAccessKey: env.S3_SECRET_KEY,
  },
  forcePathStyle: true,
});

let bucketInitialized = false;
let isS3Available = true;

const LOCAL_STORAGE_DIR = path.join(process.cwd(), ".storage");

function getLocalFilePath(key: string) {
  // sanitize key
  const safeKey = key.replace(/[^a-zA-Z0-9_.-]/g, "_");
  return path.join(LOCAL_STORAGE_DIR, safeKey);
}

export async function ensureBucket() {
  if (bucketInitialized || !isS3Available) return;
  try {
    await s3.send(new HeadBucketCommand({ Bucket: env.S3_BUCKET_NAME }));
    bucketInitialized = true;
  } catch (err: any) {
    if (err?.name === "NotFound" || err?.$metadata?.httpStatusCode === 404) {
      try {
        await s3.send(new CreateBucketCommand({ Bucket: env.S3_BUCKET_NAME }));
        bucketInitialized = true;
      } catch {
        isS3Available = false;
      }
    } else {
      // MinIO server likely offline (laptop dev without Docker MinIO)
      isS3Available = false;
    }
  }
}

export async function uploadFileBuffer(buffer: Buffer, key: string, contentType: string) {
  await ensureBucket();

  if (isS3Available) {
    try {
      await s3.send(
        new PutObjectCommand({
          Bucket: env.S3_BUCKET_NAME,
          Key: key,
          Body: buffer,
          ContentType: contentType,
        }),
      );
      return key;
    } catch {
      isS3Available = false;
    }
  }

  // Graceful local fallback for laptop development without MinIO
  if (!fs.existsSync(LOCAL_STORAGE_DIR)) {
    fs.mkdirSync(LOCAL_STORAGE_DIR, { recursive: true });
  }

  const localPath = getLocalFilePath(key);
  fs.writeFileSync(localPath, buffer);
  return key;
}

export async function getFileStream(key: string) {
  await ensureBucket();

  if (isS3Available) {
    try {
      const response = await s3.send(
        new GetObjectCommand({
          Bucket: env.S3_BUCKET_NAME,
          Key: key,
        }),
      );

      if (response.Body) {
        return {
          body: response.Body as NodeJS.ReadableStream,
          contentType: response.ContentType ?? "application/octet-stream",
          contentDisposition: response.ContentDisposition ?? "inline",
        };
      }
    } catch {
      isS3Available = false;
    }
  }

  // Local fallback
  const localPath = getLocalFilePath(key);
  if (fs.existsSync(localPath)) {
    const fileStream = fs.createReadStream(localPath);
    return {
      body: fileStream as NodeJS.ReadableStream,
      contentType: "application/octet-stream",
      contentDisposition: "inline",
    };
  }

  throw new Error(`File not found for key ${key}`);
}

export async function deleteFileObject(key: string) {
  await ensureBucket();

  if (isS3Available) {
    try {
      await s3.send(
        new DeleteObjectCommand({
          Bucket: env.S3_BUCKET_NAME,
          Key: key,
        }),
      );
    } catch {
      isS3Available = false;
    }
  }

  const localPath = getLocalFilePath(key);
  if (fs.existsSync(localPath)) {
    try {
      fs.unlinkSync(localPath);
    } catch {
      // ignore
    }
  }
}
