import path from "path";

export const resolvePath = (currentDirectory, targetPath) =>
  path.resolve(currentDirectory, targetPath);
