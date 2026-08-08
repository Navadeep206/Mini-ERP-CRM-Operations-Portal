import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

// Export other business logic services here
export default prisma;
