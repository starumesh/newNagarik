import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env, isR2Configured } from "@/lib/env";

function r2Client() {
  if (!isR2Configured()) {
    throw new Error("Cloudflare R2 is not configured.");
  }
  return new S3Client({
    region: "auto",
    endpoint: `https://${env.r2AccountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.r2AccessKeyId,
      secretAccessKey: env.r2SecretAccessKey,
    },
  });
}

export async function presignListingUpload(key: string, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: env.r2BucketName,
    Key: key,
    ContentType: contentType,
  });
  const uploadUrl = await getSignedUrl(r2Client(), command, { expiresIn: 60 * 5 });
  const publicUrl = env.r2PublicBaseUrl
    ? `${env.r2PublicBaseUrl.replace(/\/$/, "")}/${key}`
    : `https://${env.r2BucketName}.${env.r2AccountId}.r2.cloudflarestorage.com/${key}`;
  return { uploadUrl, publicUrl, key };
}
