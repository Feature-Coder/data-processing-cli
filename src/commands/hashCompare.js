import { resolvePath } from "../utils/pathResolver.js";
import { createReadStream } from "fs";
import { readFile, access } from "fs/promises";
import { pipeline } from "stream/promises";
import crypto from "crypto";

const SUPPORTED_ALGORITHMS = ["sha256", "md5", "sha512"];

export const compareHash = async (currentDirectory, options) => {
  const { input, hash, algorithm = "sha256" } = options;

  if (!input || !hash) {
    throw new Error("Invalid input");
  }

  if (!SUPPORTED_ALGORITHMS.includes(algorithm)) {
    throw new Error("Operation failed");
  }

  const inputPath = resolvePath(currentDirectory, input);
  const hashFilePath = resolvePath(currentDirectory, hash);

  try {
    await Promise.all([access(inputPath), access(hashFilePath)]);
  } catch {
    throw new Error("Operation failed");
  }

  try {
    const rawExpectedHash = await readFile(hashFilePath, "utf8");

    const expectedHash = rawExpectedHash.trim().toLowerCase();
    const readStream = createReadStream(inputPath);
    const hashStream = crypto.createHash(algorithm);

    await pipeline(readStream, hashStream);

    const actualHash = hashStream.digest("hex").toLowerCase();

    if (actualHash === expectedHash) {
      console.log("OK");
    } else {
      console.log("MISMATCH");
    }
  } catch (err) {
    throw new Error("Operation failed");
  }
};
