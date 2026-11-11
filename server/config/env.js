require('dotenv').config();
const { z } = require('zod');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_DAYS: z.coerce.number().min(1).max(90).default(7),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).optional(),
  SUBMIT_GRACE_SECONDS: z.coerce.number().min(0).max(120).default(15),
  SEED_TEACHER_NAME: z.string().optional(),
  SEED_TEACHER_EMAIL: z.string().optional(),
  SEED_TEACHER_PASSWORD: z.string().optional(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ Invalid environment configuration:');
  parsed.error.issues.forEach((i) => console.error(`  - ${i.path.join('.')}: ${i.message}`));
  process.exit(1);
}

const e = parsed.data;
const isProd = e.NODE_ENV === 'production';

module.exports = {
  ...e,
  isProd,
  isTest: e.NODE_ENV === 'test',
  clientOrigins: e.CLIENT_URL.split(',').map((s) => s.trim().replace(/\/$/, '')).filter(Boolean),
  cookieSameSite: e.COOKIE_SAME_SITE || (isProd ? 'none' : 'lax'),
};
