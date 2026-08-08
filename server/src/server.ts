import app from './app';
import { config } from './config';

const PORT = config.port;

const server = app.listen(PORT, () => {
  console.log(`=============================================`);
  console.log(`  Server is running in [${config.env}] mode`);
  console.log(`  Listening on port: http://localhost:${PORT}`);
  console.log(`  Health Check: http://localhost:${PORT}/api/health`);
  console.log(`=============================================`);
});

process.on('unhandledRejection', (reason: Error) => {
  console.error('UNHANDLED REJECTION! Shutting down server...');
  console.error(reason.name, reason.message);
  server.close(() => {
    process.exit(1);
  });
});

process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('💥 Process terminated!');
  });
});
