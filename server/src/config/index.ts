import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

const requiredEnv = ['DATABASE_URL', 'JWT_SECRET'];
for (const envName of requiredEnv) {
  if (!process.env[envName]) {
    throw new Error(`CRITICAL STARTUP ERROR: Required environment variable "${envName}" is missing.`);
  }
}

export const config = {
  port: parseInt(process.env.PORT || '5001', 10),
  env: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL as string,
  jwtSecret: process.env.JWT_SECRET as string,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
};
