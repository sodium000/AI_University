import { Temporal } from "@js-temporal/polyfill";
(globalThis as any).Temporal = Temporal;
import app from "./app";
import config from "./config";
import { db } from "./prisma/db";
import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import { client } from "./lib/redis/redis";
import { transporter } from "./lib/nodmiller/nosmiller";

const port = config.port || 5000;

app.use(
  cors({
    origin: config.app_url,
    credentials: true,
  }),
);

app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

async function main() {
  try {
    // Connect to database
    await db.connect();
    console.log("Database connected successfully.");

    await client.connect();
    client.on("error", (err) => console.log("Redis Client Error", err));
    console.log("Redis connecting");

    await transporter.verify();
    console.log("Nodemailer Connected Successfully.");

    app.listen(port, () => {
      console.log(`Server is running at http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Error starting server:", error);
    await db.close();
    process.exit(1);
  }
}

main();
