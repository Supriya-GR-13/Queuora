import { pool } from "./db/database";
import { emailQueue } from "./queues/emailQueue";

const SCHEDULER_INTERVAL = 5000;

let schedulerRunning = false;

async function scheduleDueEmails() {
  if (schedulerRunning) {
    return;
  }

  schedulerRunning = true;

  try {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const result = await client.query(`
        SELECT id
        FROM email_jobs
        WHERE status = 'scheduled'
          AND scheduled_at <= NOW()
        ORDER BY scheduled_at ASC
        LIMIT 20
        FOR UPDATE SKIP LOCKED
      `);

      for (const emailJob of result.rows) {
        await client.query(
          `
          UPDATE email_jobs
          SET status = 'processing',
              updated_at = NOW()
          WHERE id = $1
          `,
          [emailJob.id]
        );

        await emailQueue.add(
          "send-email",
          {
            emailJobId: emailJob.id,
          },
          {
            jobId: emailJob.id,
            removeOnComplete: false,
            removeOnFail: false,
          }
        );

        console.log(
          `📅 Scheduler queued email job: ${emailJob.id}`
        );
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("❌ Scheduler error:", error);
  } finally {
    schedulerRunning = false;
  }
}

export function startScheduler() {
  console.log("⏰ Queuora scheduler started");

  scheduleDueEmails();

  setInterval(scheduleDueEmails, SCHEDULER_INTERVAL);
}