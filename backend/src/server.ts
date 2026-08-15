import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { startScheduler } from "./scheduler";

import { testDatabaseConnection } from "./db/database";
import { initDatabase } from "./db/initDatabase";
import authRoutes from "./routes/authRoutes";
import emailRoutes from "./routes/emailRoutes";

import "./workers/emailWorker";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/emails", emailRoutes);

app.get("/", (_req, res) => {
  res.json({
    message: "Queuora API is running",
  });
});

const PORT = Number(process.env.PORT) || 5000;

app.listen(PORT, async () => {
  try {
    await testDatabaseConnection();
    await initDatabase();
startScheduler();

    console.log(`Queuora server running on http://localhost:${PORT}`);
  } catch (error) {
    console.error("Queuora startup failed:", error);
    process.exit(1);
  }
});