import multer from 'multer';
import path from 'path';
import { MAX_FILE_SIZE } from '../utils/fileValidation.js';

// Memory storage keeps buffer in memory so we can validate magic bytes before GridFS upload
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (!allowedExtensions.includes(ext)) {
    return cb(
      new Error('Unsupported file extension. Allowed formats are PDF, JPEG, and PNG.')
    );
  }

  cb(null, true);
};

export const documentUpload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE, // 5 MB
    files: 1
  },
  fileFilter
});

/**
 * Express error handling wrapper for Multer upload middleware
 */
export const handleUploadMiddleware = (req, res, next) => {
  const upload = documentUpload.single('document');

  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          error: 'Document file size exceeds the 5 MB maximum limit.'
        });
      }
      return res.status(400).json({
        success: false,
        error: `File upload error: ${err.message}`
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        error: err.message || 'File upload failed.'
      });
    }
    next();
  });
};

export default handleUploadMiddleware;

/**
 * Avatar image upload configuration (memory buffer, max 5MB, JPG/PNG/WebP only)
 */
const avatarFileFilter = (req, file, cb) => {
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (!allowedExtensions.includes(ext)) {
    return cb(
      new Error('Unsupported image format. Allowed formats are JPEG, PNG, and WebP.')
    );
  }

  cb(null, true);
};

export const avatarUpload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
    files: 1
  },
  fileFilter: avatarFileFilter
});

/**
 * Express error handling wrapper for Multer avatar upload middleware
 */
export const handleAvatarUploadMiddleware = (req, res, next) => {
  const upload = avatarUpload.single('avatar');

  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          error: 'Image file size exceeds the 5 MB maximum limit.'
        });
      }
      return res.status(400).json({
        success: false,
        error: `Avatar upload error: ${err.message}`
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        error: err.message || 'Avatar upload failed.'
      });
    }
    next();
  });
};

