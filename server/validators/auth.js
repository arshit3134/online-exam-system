const { z } = require('zod');

const email = z.string().trim().toLowerCase().email('Enter a valid email address').max(254);

exports.registerBody = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  email,
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128)
    .regex(/[A-Za-z]/, 'Password must contain a letter')
    .regex(/\d/, 'Password must contain a number'),
});

exports.loginBody = z.object({
  email,
  password: z.string().min(1, 'Password is required').max(128),
  portal: z.enum(['teacher', 'candidate']).optional(),
});
