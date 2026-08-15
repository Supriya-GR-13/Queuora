import { pool } from "./database";

export async function initDatabase() {
  await pool.query(`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;

    CREATE TABLE IF NOT EXISTS email_jobs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

      recipient VARCHAR(320) NOT NULL,

      subject TEXT NOT NULL,

      body TEXT NOT NULL,

      sender_email VARCHAR(320),

      scheduled_at TIMESTAMPTZ NOT NULL,

      sent_at TIMESTAMPTZ,

      status VARCHAR(20) NOT NULL DEFAULT 'scheduled'
        CHECK (status IN ('scheduled', 'processing', 'sent', 'failed')),

      error_message TEXT,

      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_email_jobs_scheduled_at
      ON email_jobs(scheduled_at);

    CREATE INDEX IF NOT EXISTS idx_email_jobs_status
      ON email_jobs(status);
  `);

  console.log("Queuora database initialized ✅");
}