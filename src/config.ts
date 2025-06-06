import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

export default {
  TASKS_PATH_AI: ".ai-tasks.txt",
  TASKS_PATH_USER: "tasks.txt",
} as const;
