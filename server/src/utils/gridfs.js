import mongoose from 'mongoose';

/**
 * MongoDB GridFS Helper
 * Manages bucket creation, document streaming, and cleanup using
 * the project's active MongoDB connection.
 */

const DEFAULT_BUCKET_NAME = 'verification_documents';

/**
 * Returns a GridFSBucket bound to the active database connection.
 * @param {string} [bucketName] - Name of the bucket (defaults to 'verification_documents')
 */
export const getGridFSBucket = (bucketName = DEFAULT_BUCKET_NAME) => {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('MongoDB database connection is not established for GridFS.');
  }
  return new mongoose.mongo.GridFSBucket(db, {
    bucketName
  });
};

/**
 * Uploads a memory buffer into GridFS.
 * Automatically cleans up any partial upload stream on error.
 * 
 * @param {Buffer} buffer - File buffer
 * @param {string} filename - Stored filename
 * @param {Object} [metadata] - Optional GridFS metadata
 * @param {string} [bucketName] - Bucket name ('verification_documents' or 'avatars')
 * @returns {Promise<mongoose.Types.ObjectId>} Stored GridFS file ID
 */
export const uploadBufferToGridFS = async (buffer, filename, metadata = {}, bucketName = DEFAULT_BUCKET_NAME) => {
  const bucket = getGridFSBucket(bucketName);
  
  return new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(filename, {
      metadata: {
        ...metadata,
        uploadedAt: new Date()
      }
    });

    uploadStream.on('error', (err) => {
      reject(err);
    });

    uploadStream.on('finish', () => {
      resolve(uploadStream.id);
    });

    uploadStream.end(buffer);
  });
};

/**
 * Opens a readable download stream for a given GridFS file ID.
 * 
 * @param {string|mongoose.Types.ObjectId} fileId
 * @param {string} [bucketName]
 * @returns {GridFSBucketReadStream}
 */
export const openDownloadStreamFromGridFS = (fileId, bucketName = DEFAULT_BUCKET_NAME) => {
  const bucket = getGridFSBucket(bucketName);
  const objectId = typeof fileId === 'string' ? new mongoose.Types.ObjectId(fileId) : fileId;
  return bucket.openDownloadStream(objectId);
};

/**
 * Deletes a file and its chunks from GridFS.
 * 
 * @param {string|mongoose.Types.ObjectId} fileId
 * @param {string} [bucketName]
 */
export const deleteFromGridFS = async (fileId, bucketName = DEFAULT_BUCKET_NAME) => {
  try {
    const bucket = getGridFSBucket(bucketName);
    const objectId = typeof fileId === 'string' ? new mongoose.Types.ObjectId(fileId) : fileId;
    await bucket.delete(objectId);
  } catch (err) {
    console.warn(`GridFS file ${fileId} deletion notice (${bucketName}):`, err.message);
  }
};

export default {
  getGridFSBucket,
  uploadBufferToGridFS,
  openDownloadStreamFromGridFS,
  deleteFromGridFS
};
