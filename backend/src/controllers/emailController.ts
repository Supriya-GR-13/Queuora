import { Request, Response } from "express";
import { pool } from "../db/database";
import { emailQueue } from "../queues/emailQueue";

export async function scheduleEmail(req: Request, res: Response) {
  try {
    const {
      recipient,
      subject,
      body,
      scheduledAt,
      senderEmail = null,
    } = req.body;

    if (!recipient || !subject || !body || !scheduledAt) {
      return res.status(400).json({
        message: "recipient, subject, body and scheduledAt are required",
      });
    }

    const scheduledDate = new Date(scheduledAt);

    if (Number.isNaN(scheduledDate.getTime())) {
      return res.status(400).json({
        message: "Invalid scheduledAt date",
      });
    }

    if (scheduledDate <= new Date()) {
      return res.status(400).json({
        message: "scheduledAt must be in the future",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO email_jobs
        (recipient, subject, body, sender_email, scheduled_at)
      VALUES
        ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [recipient, subject, body, senderEmail, scheduledDate]
    );

    const emailJob = result.rows[0];

    const delay = Math.max(
      0,
      scheduledDate.getTime() - Date.now()
    );

    await emailQueue.add(
      "send-email",
      {
        emailJobId: emailJob.id,
      },
      {
        jobId: emailJob.id,
        delay,
        removeOnComplete: false,
        removeOnFail: false,
      }
    );

    return res.status(201).json({
      message: "Email scheduled successfully",
      email: emailJob,
    });
  } catch (error) {
    console.error("Schedule email error:", error);

    return res.status(500).json({
      message: "Failed to schedule email",
    });
  }
}

/* GET ALL EMAILS */

export async function getEmails(_req: Request, res: Response) {
  try {
    const result = await pool.query(
      `
      SELECT
        id,
        recipient,
        subject,
        body,
        sender_email,
        scheduled_at,
        status,
        sent_at,
        error_message,
        created_at
      FROM email_jobs
      ORDER BY created_at DESC
      `
    );

    const emails = result.rows.map((email) => ({
      id: email.id,
      recipient: email.recipient,
      subject: email.subject,
      body: email.body,
      senderEmail: email.sender_email,
      scheduledAt: email.scheduled_at,
      status: email.status,
      sentAt: email.sent_at,
      errorMessage: email.error_message,
      createdAt: email.created_at,
    }));

    return res.json(emails);
  } catch (error) {
    console.error("Get emails error:", error);

    return res.status(500).json({
      message: "Failed to fetch emails",
    });
  }
}