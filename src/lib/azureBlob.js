const {
  BlobServiceClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
} = require("@azure/storage-blob");

/**
 * Returns a BlobServiceClient using the connection string stored in
 * AZURE_STORAGE_CONNECTION_STRING.
 */
function getServiceClient() {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error(
      "AZURE_STORAGE_CONNECTION_STRING environment variable is not set"
    );
  }
  return BlobServiceClient.fromConnectionString(connectionString);
}

/**
 * Upload a file buffer/stream directly to Azure Blob Storage.
 * @param {string} containerName  - Azure container name
 * @param {string} blobName       - Path inside the container (e.g. "employeeId/uuid-filename.pdf")
 * @param {Buffer|Readable} data  - File data
 * @param {string} contentType    - MIME type
 * @returns {string} Public / SAS URL of the uploaded blob
 */
async function uploadBlob(containerName, blobName, data, contentType) {
  const serviceClient = getServiceClient();
  const containerClient = serviceClient.getContainerClient(containerName);

  // Ensure container exists (idempotent)
  await containerClient.createIfNotExists();

  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  await blockBlobClient.upload(data, data.length ?? Buffer.byteLength(data), {
    blobHTTPHeaders: { blobContentType: contentType },
  });

  return blockBlobClient.url;
}

/**
 * Generate a short-lived SAS URL for uploading (PUT) a blob.
 * Expiry defaults to 15 minutes.
 * @returns {{ uploadUrl: string, blobUrl: string }}
 */
async function getSasUploadUrl(containerName, blobName, contentType, expiryMinutes = 15) {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error(
      "AZURE_STORAGE_CONNECTION_STRING environment variable is not set"
    );
  }

  // Parse account name and key from connection string
  const match = connectionString.match(
    /AccountName=([^;]+);.*AccountKey=([^;]+)/
  );
  if (!match) {
    throw new Error("Could not parse Azure Storage connection string");
  }
  const accountName = match[1];
  const accountKey = match[2];

  const sharedKeyCredential = new StorageSharedKeyCredential(
    accountName,
    accountKey
  );

  const expiresOn = new Date();
  expiresOn.setMinutes(expiresOn.getMinutes() + expiryMinutes);

  const sasToken = generateBlobSASQueryParameters(
    {
      containerName,
      blobName,
      permissions: BlobSASPermissions.parse("cw"), // create + write
      expiresOn,
      contentType,
    },
    sharedKeyCredential
  ).toString();

  const accountUrl = `https://${accountName}.blob.core.windows.net`;
  const blobUrl = `${accountUrl}/${containerName}/${blobName}`;
  const uploadUrl = `${blobUrl}?${sasToken}`;

  return { uploadUrl, blobUrl };
}

/**
 * Generate a short-lived SAS URL for reading (GET) a blob.
 * Expiry defaults to 5 minutes.
 */
async function getSasDownloadUrl(containerName, blobName, expiryMinutes = 5) {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error(
      "AZURE_STORAGE_CONNECTION_STRING environment variable is not set"
    );
  }

  const match = connectionString.match(
    /AccountName=([^;]+);.*AccountKey=([^;]+)/
  );
  if (!match) {
    throw new Error("Could not parse Azure Storage connection string");
  }
  const accountName = match[1];
  const accountKey = match[2];

  const sharedKeyCredential = new StorageSharedKeyCredential(
    accountName,
    accountKey
  );

  const expiresOn = new Date();
  expiresOn.setMinutes(expiresOn.getMinutes() + expiryMinutes);

  const sasToken = generateBlobSASQueryParameters(
    {
      containerName,
      blobName,
      permissions: BlobSASPermissions.parse("r"),
      expiresOn,
    },
    sharedKeyCredential
  ).toString();

  const accountUrl = `https://${accountName}.blob.core.windows.net`;
  return `${accountUrl}/${containerName}/${blobName}?${sasToken}`;
}

/**
 * Delete a blob by its full Azure URL or by containerName + blobName.
 */
async function deleteBlob(containerName, blobName) {
  const serviceClient = getServiceClient();
  const containerClient = serviceClient.getContainerClient(containerName);
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  await blockBlobClient.deleteIfExists();
}

module.exports = { uploadBlob, getSasUploadUrl, getSasDownloadUrl, deleteBlob };
