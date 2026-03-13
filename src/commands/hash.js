import { resolvePath } from "../utils/pathResolver.js";
import { createReadStream } from "fs";
import { writeFile } from "fs/promises";
import { pipeline } from "stream/promises";
import { access } from "fs/promises";
import crypto from "crypto";

const SUPPORTED_ALGORITHMS = ["sha256", "md5", "sha512"];

export const calculateHash = async (currentDirectory, options) => {
  const { input, algorithm = "sha256", save } = options;

  if (!input) {
    throw new Error("Invalid input");
  }

  if (!SUPPORTED_ALGORITHMS.includes(algorithm)) {
    throw new Error("Operation failed");
  }

  const inputPath = resolvePath(currentDirectory, input);

  try {
    await access(inputPath);
  } catch {
    throw new Error("Operation failed");
  }

  const readStream = createReadStream(inputPath);
  const hashStream = crypto.createHash(algorithm);

  try {
    await pipeline(readStream, hashStream);

    const resultHash = hashStream.digest("hex");

    console.log(`${algorithm}: ${resultHash}`);

    if (save) {
      const savePath = `${inputPath}.${algorithm}`;
      await writeFile(savePath, resultHash, "utf8");
    }
  } catch (err) {
    throw new Error("Operation failed");
  }
};
