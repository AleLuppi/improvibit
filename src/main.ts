import { genAI } from "src/providers";
import { readTasks } from "./functions/tasks";

(async () => {
  try {
    const tasks = await readTasks();

    const taskPrompt = `<AI TASKS>${tasks.ai}</AI TASKS>\n<USER TASKS>${tasks.user}</USER TASKS>`;

    const commitMessage = await genAI.workOnTasks(taskPrompt);
    return commitMessage;
  } catch (err) {
    console.error("Agent error:", err);
    process.exit(1);
  }
})();
