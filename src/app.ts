import express, { type Express, type Request, type Response } from "express";
import { authRoutes } from "./module/auth/regestration/regestration.route";
import cors from "cors";
import cookieParser from "cookie-parser";
import { logUser } from "./module/auth/login/login.route";
import { studentRoutes } from "./module/student/student.route";
import { facultyRoutes } from "./module/faculty/faculty.route";

const app: Express = express();

// middleware
app.use(express.json());

app.use(
  cors({
    origin: "*",
    credentials: true,
  }),
);

app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// root route
app.get("/", (req: Request, res: Response) => {
  res.send("<h1>AI Agentic University Backend</h1>");
});

app.use("/", authRoutes);
app.use("/auth", logUser);
app.use("/students", studentRoutes);
app.use("/api/v1/students", studentRoutes);
app.use("/faculty", facultyRoutes);
app.use("/api/v1/faculty", facultyRoutes);

export default app;
