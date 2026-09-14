import express, { type Express, type Request, type Response } from "express";
import { authRoutes } from "./module/auth/regestration/regestration.route";

const app: Express = express();

app.use(express.json());

app.use("/", authRoutes);

export default app;
