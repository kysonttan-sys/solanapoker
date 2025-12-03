import { PrismaClient } from '@prisma/client';

// Prevent multiple instances in development due to hot reloading
declare global {
  var prisma: PrismaClient | undefined;
}

export const db = global.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.prisma = db;
}