import app from './app';
import { config } from './config';
import { prisma } from './services';

const PORT = config.port;

const server = app.listen(PORT, () => {
  console.log(`=============================================`);
  console.log(`  Server is running in [${config.env}] mode`);
  console.log(`  Listening on port: http://localhost:${PORT}`);
  console.log(`  Health Check: http://localhost:${PORT}/api/health`);
  console.log(`=============================================`);
});

const gracefulShutdown = async (signal: string) => {
  console.log(`\n👋 ${signal} received. Starting graceful shutdown...`);
  server.close(async () => {
    console.log('Express HTTP server listener stopped accepting requests.');
    try {
      await prisma.$disconnect();
      console.log('Prisma database client disconnected cleanly.');
      process.exit(0);
    } catch (err) {
      console.error('Prisma connection disconnection failure:', err);
      process.exit(1);
    }
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason: Error) => {
  console.error('UNHANDLED REJECTION! Shutting down server...');
  console.error(reason.name, reason.message);
  server.close(() => {
    process.exit(1);
  });
});
