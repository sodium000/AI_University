import { createClient } from "redis";
import config from "../../config";
import crypto from "crypto";

export const client = createClient({
  username: config.redis_user,
  password: config.redis_password,
  socket: {
    host: config.redis_host,
    port: Number(config.redis_port),
  },
});

export const generateOTP = (): string => {
  return crypto.randomInt(100000, 1000000).toString();
};
