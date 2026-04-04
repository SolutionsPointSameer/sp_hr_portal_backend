const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const s3 = new S3Client({ region: process.env.AWS_REGION || "ap-south-1" });

async function getPresignedUploadUrl(bucket, key, contentType) {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(s3, command, { expiresIn: 900 }); // 15 min
}

async function getPresignedDownloadUrl(bucket, key) {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(s3, command, { expiresIn: 300 }); // 5 min
}

module.exports = { getPresignedUploadUrl, getPresignedDownloadUrl };
