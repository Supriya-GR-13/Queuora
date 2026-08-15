import { Worker } from "bullmq";
import IORedis from "ioredis";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { pool } from "../db/database";

dotenv.config();

const redisConnection = new IORedis({
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: Number(process.env.REDIS_PORT) || 6379,
  maxRetriesPerRequest: null,
});

const transporter = nodemailer.createTransport({
  host: process.env.ETHEREAL_HOST || "smtp.ethereal.email",
  port: Number(process.env.ETHEREAL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.ETHEREAL_USER,
    pass: process.env.ETHEREAL_PASSWORD,
  },
});

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
      const info = await transporter.sendMail({
        from: `"Queuora" <${emailJob.sender_email || process.env.ETHEREAL_USER}>`,
        to: emailJob.recipient,
        subject: emailJob.subject,
        text: emailJob.body,
      });

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

      console.log("✅ Email sent!");
      console.log("Message ID:", info.messageId);
      console.log(
        "Preview URL:",
        nodemailer.getTestMessageUrl(info)
      );

      return {
        messageId: info.messageId,
        previewUrl: nodemailer.getTestMessageUrl(info),
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