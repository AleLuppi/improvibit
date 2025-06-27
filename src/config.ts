import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

export default {
  // AI tasks, managed by the bot
  TASKS_PATH_AI: resolve(process.cwd(), ".ai-tasks.md"),
  // User-defined tasks
  TASKS_PATH_USER: resolve(process.cwd(), "tasks.md"),
} as const;
