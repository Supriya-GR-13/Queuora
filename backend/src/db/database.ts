import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function testDatabaseConnection() {
  try {
    const result = await pool.query("SELECT NOW()");
    console.log("Queuora PostgreSQL connected ✅");
    console.log("Database time:", result.rows[0].now);
  } catch (error) {
    console.error("PostgreSQL connection failed ❌", error);
    process.exit(1);
  }
}