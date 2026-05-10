import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { mkdirSync } from "fs";
import { config } from "./config/index.js";
import uploadRouter from "./routes/upload.js";
import chatRouter from "./routes/chat.js";
import { errorHandler } from "./middleware/errorHandler.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
mkdirSync(path.join(__dirname, "../../uploads"), { recursive: true });

const app = express();
//updated for production
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
}));
app.options("*", cors());
app.use(express.json());

// Health check
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// Routes
app.use("/api/upload", uploadRouter);
app.use("/api/chat", chatRouter);

// Error handler
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`🚀 Server running on http://localhost:${config.port}`);
});