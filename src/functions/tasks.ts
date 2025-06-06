import { readFiles } from "./fileReader";
import { writeFile } from "./fileWriter";
import config from "src/config";

async function readTasks(): Promise<{ ai: string; user: string }> {
  const aiTasks = readFiles(config.TASKS_PATH_AI);
  const userTasks = readFiles(config.TASKS_PATH_USER);

  const tasks = (await Promise.all([aiTasks, userTasks])).map((res) =>
    res.length === 0 ? "" : res[0].content,
  );

  return { ai: tasks[0], user: tasks[1] };
}

async function updateTasks(tasks: string): Promise<boolean> {
  try {
    // Write AI tasks
    await writeFile(config.TASKS_PATH_AI, tasks);

    // Clear user tasks
    await writeFile(config.TASKS_PATH_USER, "");
  } catch (error) {
    console.error("Error writing tasks:", error);
    return false;
  }
  return true;
}

export { readTasks, updateTasks };
