import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import { glob } from "glob";

const execAsync = promisify(exec);

async function isIgnoredByGit(filePath: string): Promise<boolean> {
  try {
    await execAsync(`git check-ignore "${filePath}"`);
    return true;
  } catch (e) {
    return false;
  }
}

async function listFiles(inputPath: string): Promise<string[]> {
  // If path is a directory, scan all files in it
  const isDir = await fs
    .stat(inputPath)
    .then((stat) => stat.isDirectory())
    .catch(() => false);
  if (isDir) inputPath = path.join(inputPath, "**/*");
  const filePaths = await glob(inputPath, {
    nodir: true,
    windowsPathsNoEscape: true,
  });

  return filePaths;
}

async function readFiles(
  inputPath: string,
): Promise<{ path: string; content: string }[]> {
  const filePaths = new Set<string>();
  const results: { path: string; content: string }[] = [];

  const allFiles = await listFiles(inputPath);

  // Do not allow ignored files:
  // - they have no effect on the repo
  // - they may include sensitive data
  for (const oneFile of allFiles) {
    const ignored = await isIgnoredByGit(oneFile);
    if (!ignored) filePaths.add(oneFile);
  }

  // Read content of each file
  for (const filePath of filePaths) {
    try {
      const content = await fs.readFile(filePath, "utf-8");
      results.push({ path: filePath, content });
    } catch (err) {
      console.warn(`Warning: Failed to read file ${filePath}`, err);
    }
  }

  return results;
}

export { listFiles, readFiles };
