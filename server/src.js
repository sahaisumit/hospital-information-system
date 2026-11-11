import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/database.js";
import routes from "./routes/index.js";

dotenv.config();
const app = express();

app.use((req, res, next) => {
  console.log("REQUEST:", req.method, req.url);
  console.log("ORIGIN:", req.headers.origin);
  next();
});

app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://[::1]:5173",
      ];

      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
  }),
);

// Lab report uploads are base64 encoded in JSON; cap requests below MongoDB's
// 16 MB document limit while allowing an 8 MB source file.
app.use(express.json({
  limit: "12mb",
  verify(req, res, buffer) {
    if (req.originalUrl === "/api/billing-ops/razorpay-webhook") req.rawBody = Buffer.from(buffer);
  },
}));

app.use("/api", routes);

const port = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(port, () => {
    console.log(`HIS API running on ${port}`);
  });
});
