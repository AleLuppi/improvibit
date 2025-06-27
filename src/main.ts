import { genAI } from "src/providers";
import { readTasks } from "./functions/tasks";
import { writeFile } from "fs/promises";

async function main() {
  try {
    const tasks = await readTasks();

    const taskPrompt = `<AI TASKS>${tasks.ai}</AI TASKS>\n<USER TASKS>${tasks.user}</USER TASKS>`;

    const commitMessage = await genAI.workOnTasks(taskPrompt);

    if (commitMessage) {
      // Write commit message the file path selected by running instance
      if (process.env.COMMIT_MESSAGE_FILE)
        await writeFile(
          process.env.COMMIT_MESSAGE_FILE,
          commitMessage.trim(),
          "utf8",
        );
    }
  } catch (err) {
    console.error("Agent error:", err);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
