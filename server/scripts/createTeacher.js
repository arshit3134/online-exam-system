/*
 * Secure teacher provisioning (the ONLY way to create teacher accounts besides SEED_TEACHER_* env vars).
 *
 *   npm run create-teacher -- --name "Jane Doe" --email jane@school.edu --password "S0mething-Strong"
 *   (or set TEACHER_NAME / TEACHER_EMAIL / TEACHER_PASSWORD env vars)
 *
 * With an existing account: add --promote to upgrade it to a teacher.
 */
const mongoose = require('mongoose');
const env = require('../config/env');
const User = require('../models/User');

const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};

(async () => {
  const name = arg('name') || process.env.TEACHER_NAME;
  const email = (arg('email') || process.env.TEACHER_EMAIL || '').toLowerCase();
  const password = arg('password') || process.env.TEACHER_PASSWORD;
  const promote = process.argv.includes('--promote');

  if (!name || !email || !password) {
    console.error('Usage: npm run create-teacher -- --name "Jane" --email jane@school.edu --password "Strong-Pass-1"');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('Password must be at least 8 characters');
    process.exit(1);
  }

  await mongoose.connect(env.MONGODB_URI);
  const existing = await User.findOne({ email });
  if (existing) {
    if (existing.role === 'teacher') console.log(`ℹ️  ${email} is already a teacher.`);
    else if (promote) {
      existing.role = 'teacher';
      await existing.save();
      console.log(`✅ ${email} promoted to teacher.`);
    } else console.log(`⚠️  ${email} exists as a candidate. Re-run with --promote to upgrade it.`);
  } else {
    await User.create({ name, email, password, role: 'teacher' });
    console.log(`✅ Teacher created: ${email}`);
  }
  await mongoose.disconnect();
})().catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});
