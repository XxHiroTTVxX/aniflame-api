import { startServer } from "./server";
import { closeRedisConnection } from "./utils/redis";

// Graceful shutdown handling
process.on('SIGINT', async () => {
  console.log('\nReceived SIGINT, shutting down gracefully...');
  await closeRedisConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nReceived SIGTERM, shutting down gracefully...');
  await closeRedisConnection();
  process.exit(0);
});

startServer();
