#!/usr/bin/env tsx
/**
 * Usage:
 *  pnpm reset:password --email admin@example.com --password NewSecret123!
 *
 * If --password omitted, a random strong password will be generated and printed.
 */
import 'dotenv/config';
import { getPayload } from 'payload';
import payloadConfig from '../src/payload.config';
import crypto from 'crypto';

// Simple arg parser
const args = process.argv.slice(2);
function getArg(name: string): string | undefined {
  const idx = args.findIndex(a => a === `--${name}` || a.startsWith(`--${name}=`));
  if (idx === -1) return undefined;
  const direct = args[idx];
  if (direct.includes('=')) return direct.split('=')[1];
  return args[idx + 1];
}

const email = getArg('email');
let newPassword = getArg('password');

if (!email) {
  console.error('Missing required --email argument');
  process.exit(1);
}

if (!newPassword) {
  newPassword = crypto.randomBytes(12).toString('base64url');
}

async function run() {
  let server: any | null = null;
  try {
    server = await getPayload({
      config: payloadConfig,
    });

    const usersCollection = 'users';

    const existing = await server.find({
      collection: usersCollection,
      where: { email: { equals: email } },
      limit: 1,
    });

    if (existing.docs.length === 0) {
      console.error(`User with email ${email} not found.`);
      process.exit(1);
    }

    const user = existing.docs[0];

    await server.update({
      collection: usersCollection,
      id: user.id,
      data: { password: newPassword },
    });

    console.log('Password successfully reset.');
    console.log(`Email: ${email}`);
    console.log(`New Password: ${newPassword}`);
    console.log('IMPORTANT: Store this password securely and change it after logging in.');
  } catch (e) {
    console.error('Error resetting password:', e);
    process.exit(1);
  } finally {
    // Payload v3 with Next.js does not always need explicit shutdown here.
    process.exit(0);
  }
}

run();
