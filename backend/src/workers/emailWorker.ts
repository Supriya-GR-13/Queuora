import { Worker } from "bullmq";
import IORedis from "ioredis";
import nodemailer from "nodemailer";
import { Resend } from "resend";
import dotenv from "dotenv";
import { pool } from "../db/database";

dotenv.config();

const redisConnection = new IORedis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
});


const resend = new Resend(process.env.RESEND_API_KEY);
const worker = new Worker(
  "emailQueue",
  async (job) => {
    console.log("📨 Processing email job:", job.id);

    const { emailJobId } = job.data;

    if (!emailJobId) {
      throw new Error("Missing emailJobId");
    }

    const result = await pool.query(
      `SELECT * FROM email_jobs WHERE id = $1`,
      [emailJobId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Email job not found: ${emailJobId}`);
    }

    const emailJob = result.rows[0];

    await pool.query(
      `
      UPDATE email_jobs
      SET status = 'processing',
          updated_at = NOW()
      WHERE id = $1
      `,
      [emailJobId]
    );

    try {
     
const { data: info, error } = await resend.emails.send({
  from: "Queuora <onboarding@resend.dev>",
  to: [emailJob.recipient],
  subject: emailJob.subject,
  text: emailJob.body,
});

if (error) {
  throw new Error(error.message);
}
      await pool.query(
        `
        UPDATE email_jobs
        SET status = 'sent',
            sent_at = NOW(),
            updated_at = NOW(),
            error_message = NULL
        WHERE id = $1
        `,
        [emailJobId]
      );

      console.log("Email sent successfully!");
console.log("Message ID:", info?.id);

return {
  messageId: info?.id,
};
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      await pool.query(
        `
        UPDATE email_jobs
        SET status = 'failed',
            error_message = $2,
            updated_at = NOW()
        WHERE id = $1
        `,
        [emailJobId, errorMessage]
      );

      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: Number(process.env.WORKER_CONCURRENCY) || 5,
  }
);

worker.on("completed", (job) => {
  console.log(`✅ Job ${job.id} completed`);
});

worker.on("failed", (job, error) => {
  console.error(`❌ Job ${job?.id} failed:`, error.message);
});

console.log("🚀 Queuora email worker started");