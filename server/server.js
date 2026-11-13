const env = require('./config/env');
const connectDB = require('./config/db');
const app = require('./app');
const User = require('./models/User');
const { sweepExpired } = require('./services/attemptService');

async function seedTeacherFromEnv() {
  const { SEED_TEACHER_EMAIL: email, SEED_TEACHER_PASSWORD: password, SEED_TEACHER_NAME: name } = env;
  if (!email || !password) return;
  const exists = await User.exists({ email: email.toLowerCase() });
  if (exists) return;
  await User.create({ name: name || 'Teacher', email, password, role: 'teacher' });
  console.log(`🎓 Seeded teacher account: ${email} (remove SEED_TEACHER_* env vars now)`);
}

async function main() {
  await connectDB();
  await seedTeacherFromEnv();

  const server = app.listen(env.PORT, () => console.log(`🚀 API listening on :${env.PORT} (${env.NODE_ENV})`));

  const timer = setInterval(() => sweepExpired().catch((e) => console.error('sweep error', e.message)), 30 * 1000);
  timer.unref();

  const shutdown = (sig) => {
    console.log(`${sig} received, shutting down`);
    clearInterval(timer);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
process.on('unhandledRejection', (err) => console.error('Unhandled rejection:', err));
