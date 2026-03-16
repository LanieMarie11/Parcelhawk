import 'dotenv/config';
import postgres from 'postgres';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is not set. Please set it in your .env file.');
  process.exit(1);
}

const sql = postgres(databaseUrl, { max: 1 });

async function main() {
  try {
    await sql`
      INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at") VALUES
        ('0000_third_colossus', (EXTRACT(EPOCH FROM now()) * 1000)::bigint),
        ('0001_misty_gamma_corps', (EXTRACT(EPOCH FROM now()) * 1000)::bigint),
        ('0002_broken_dracula', (EXTRACT(EPOCH FROM now()) * 1000)::bigint),
        ('0003_complete_thanos', (EXTRACT(EPOCH FROM now()) * 1000)::bigint),
        ('0004_classy_maggott', (EXTRACT(EPOCH FROM now()) * 1000)::bigint)
      ON CONFLICT DO NOTHING;
    `;
    console.log('Baseline entries inserted (or already present).');
  } catch (err) {
    console.error('Failed to baseline drizzle migrations:', err);
    process.exit(1);
  } finally {
    await sql.end({ timeout: 5_000 });
  }
}

main();

