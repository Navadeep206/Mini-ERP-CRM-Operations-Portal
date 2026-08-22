import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';
import path from 'path';

// Define allowed mime types and extensions for Excel
const ALLOWED_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
  'application/octet-stream', // sometimes sent by browsers for binary
];

const ALLOWED_EXTENSIONS = ['.xlsx', '.xls'];

// Setup Memory storage (process file in memory, do not store on disk)
const storage = multer.memoryStorage();

// File filter validator
const fileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  const fileExt = path.extname(file.originalname).toLowerCase();
  
  const isAllowedExt = ALLOWED_EXTENSIONS.includes(fileExt);
  const isAllowedMime = ALLOWED_MIME_TYPES.includes(file.mimetype);

  if (isAllowedExt && isAllowedMime) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Only Excel files (.xlsx, .xls) are permitted. Received extension: ${fileExt}, MIME: ${file.mimetype}`));
  }
};

// Configure Multer limits (5MB limit)
export const uploadExcel = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 Megabytes
    files: 1, // Only 1 file upload per request
  },
});
