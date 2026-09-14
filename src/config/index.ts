import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env") });

export default {
  port: Number(process.env.PORT),
  database_url: process.env.DATABASE_URL,
  app_url: process.env.APP_URL,
  redis_host: process.env.REDIS_HOST,
  redis_port: process.env.REDIS_PORT,
  redis_user: process.env.REDIS_USER,
  redis_password: process.env.REDIS_PASSWORD,
  emailSender: process.env.EMAIL_SENDER,
  emailSenderPassword: process.env.APP_PASSWORD,
};
