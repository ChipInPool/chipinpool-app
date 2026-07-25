/**
 * One-time migration: encrypt pre-existing plaintext sensitive fields at rest.
 *
 * After you deploy the field-encryption code and set ENCRYPTION_KEY, run this
 * once to encrypt rows that were written before encryption was enabled:
 *
 *   ENCRYPTION_KEY=<64-hex-or-base64-32-bytes> DATABASE_URL=... \
 *     npx tsx scripts/encrypt-existing-data.ts
 *
 * It is idempotent and safe to re-run: values already in the "enc:v1:" envelope
 * are skipped, so a second run is a no-op. It reads/writes raw DB values
 * directly (bypassing the storage layer) so nothing is double-encrypted.
 */
import { eq } from 'drizzle-orm';
import { db, pool } from '../server/db';
import { bankAccounts, users } from '../shared/schema';
import { encryptField, isEncrypted, isEncryptionEnabled } from '../server/encryption';

async function main() {
  if (!isEncryptionEnabled()) {
    console.error('ENCRYPTION_KEY is not set. Set it before running this migration.');
    process.exit(1);
  }

  let bankFields = 0;
  let userTokens = 0;

  // Bank accounts: accountNumber, routingNumber, plaidAccessToken
  const accounts = await db.select().from(bankAccounts);
  for (const acct of accounts) {
    const updates: Record<string, string> = {};
    if (acct.accountNumber && !isEncrypted(acct.accountNumber)) {
      updates.accountNumber = encryptField(acct.accountNumber) as string;
    }
    if (acct.routingNumber && !isEncrypted(acct.routingNumber)) {
      updates.routingNumber = encryptField(acct.routingNumber) as string;
    }
    if (acct.plaidAccessToken && !isEncrypted(acct.plaidAccessToken)) {
      updates.plaidAccessToken = encryptField(acct.plaidAccessToken) as string;
    }
    if (Object.keys(updates).length > 0) {
      await db.update(bankAccounts).set(updates).where(eq(bankAccounts.id, acct.id));
      bankFields += Object.keys(updates).length;
    }
  }

  // Users: plaidAccessToken
  const allUsers = await db.select().from(users);
  for (const u of allUsers) {
    if (u.plaidAccessToken && !isEncrypted(u.plaidAccessToken)) {
      await db.update(users)
        .set({ plaidAccessToken: encryptField(u.plaidAccessToken) as string })
        .where(eq(users.id, u.id));
      userTokens += 1;
    }
  }

  console.log(`Encrypted ${bankFields} bank-account field(s) across ${accounts.length} account(s).`);
  console.log(`Encrypted ${userTokens} user Plaid token(s).`);
  console.log('Migration complete.');
}

main()
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
