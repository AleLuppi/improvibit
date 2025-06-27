import { dirname, resolve } from "path";
import {
  mkdir,
  writeFile as fsWriteFile,
  rm,
  readdir,
  rmdir,
  copyFile as fsCopyFile,
} from "fs/promises";

/**
 * Ensures that the directory for the given file path exists.
 * If not, it creates all necessary parent folders.
 * @param filePath The full or relative file path
 */
async function makeDirectory(filePath: string): Promise<void> {
  const dir = dirname(resolve(process.cwd(), filePath));
  await mkdir(dir, { recursive: true });
}

/**
 * Writes the specified content to a file. Creates parent folders if needed.
 * @param path The file path to write to (relative to project root)
 * @param content The file contents
 */
async function writeFile(path: string, content: string): Promise<boolean> {
  const fullPath = resolve(process.cwd(), path);
  try {
    await makeDirectory(path);
    await fsWriteFile(fullPath, content, "utf8");
  } catch {
    console.error(`Failed to write file: ${fullPath}`);

    return false;
  }
  return true;
}

/**
 * Deletes a file from the local project. Does nothing if the file doesn't exist.
 * @param path The file path to delete (relative to project root)
 */
async function deleteFile(path: string): Promise<boolean> {
  const projectRoot = resolve(process.cwd());
  const fullPath = resolve(projectRoot, path);

  try {
    await rm(fullPath, { force: true });

    let currentDir = dirname(fullPath);

    // Clean up empty folders
    while (currentDir.startsWith(projectRoot) && currentDir !== projectRoot) {
      try {
        const entries = await readdir(currentDir);
        if (entries.length > 0) break;

        await rmdir(currentDir);
        currentDir = dirname(currentDir);
      } catch (err) {
        break; // Stop if rmdir fails (e.g. permission or not empty)
      }
    }
  } catch (err) {
    console.error(`Failed to delete file or clean folders: ${fullPath}`, err);

    return false;
  }
  return true;
}

/**
 * Moves a file to a new location.
 * Creates parent folders for the new location if needed.
 * @param src Source file path (relative to project root)
 * @param dst Destination file path (relative to project root)
 */
async function moveFile(src: string, dst: string): Promise<boolean> {
  const projectRoot = resolve(process.cwd());
  const fullFromPath = resolve(projectRoot, src);
  const fullToPath = resolve(projectRoot, dst);

  try {
    await makeDirectory(dst);
    await fsCopyFile(fullFromPath, fullToPath);
    const deleted = await deleteFile(src);
    if (!deleted) {
      console.error(`File copied but not deleted: ${fullFromPath}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error(
      `Failed to move file from ${fullFromPath} to ${fullToPath}`,
      err,
    );
    return false;
  }
}

export { makeDirectory, writeFile, deleteFile, moveFile };
