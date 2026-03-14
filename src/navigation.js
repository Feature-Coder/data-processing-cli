import fs from "fs/promises";
import path from "path";
import { resolvePath } from "./utils/pathResolver.js";

export const goUp = async (currentDirectory) => {
  return path.resolve(currentDirectory, "..");
};

export const goToDir = async (currentDirectory, targetPath) => {
  const newPath = resolvePath(currentDirectory, targetPath);

  const stats = await fs.stat(newPath);

  if (!stats.isDirectory()) {
    throw new Error("Not a directory");
  }

  return newPath;
};

export const listDir = async (currentDirectory) => {
  const items = await fs.readdir(currentDirectory, { withFileTypes: true });

  const folders = [];
  const files = [];

  for (const item of items) {
    if (item.isDirectory()) {
      folders.push({ name: item.name, type: "folder" });
    } else if (item.isFile()) {
      files.push({ name: item.name, type: "file" });
    }
  }

  const sortFn = (a, b) => a.name.localeCompare(b.name);

  folders.sort(sortFn);
  files.sort(sortFn);

  const maxLen = [...folders, ...files].reduce(
    (max, item) => Math.max(max, item.name.length),
    0,
  );

  for (const item of folders) {
    console.log(`${item.name.padEnd(maxLen)}  [folder]`);
  }
  for (const item of files) {
    console.log(`${item.name.padEnd(maxLen)}  [file]`);
  }
};
