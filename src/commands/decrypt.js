import { createReadStream, createWriteStream } from "fs";
import { open } from "fs/promises";
import crypto from "crypto";
import { pipeline } from "stream/promises";
import { resolvePath } from "../utils/pathResolver.js";

export const decryptFile = async (currentDirectory, options) => {
  const { input, output, password } = options;

  if (!input || !output || !password) {
    throw new Error("Invalid input");
  }

  const inputPath = resolvePath(currentDirectory, input);
  const outputPath = resolvePath(currentDirectory, output);

  let fd;
  try {
    fd = await open(inputPath, "r");
    const stat = await fd.stat();

    if (stat.size < 44) {
      throw new Error("File too small");
    }

    const headerBuffer = Buffer.alloc(28);
    await fd.read(headerBuffer, 0, 28, 0);

    const salt = headerBuffer.subarray(0, 16);
    const iv = headerBuffer.subarray(16, 28);

    const authTagPos = stat.size - 16;
    const authTag = Buffer.alloc(16);
    await fd.read(authTag, 0, 16, authTagPos);

    await fd.close();
    fd = null;

    const key = crypto.scryptSync(password, salt, 32);
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);

    await pipeline(
      createReadStream(inputPath, { start: 28, end: authTagPos - 1 }),
      decipher,
      createWriteStream(outputPath),
    );
  } catch {
    if (fd) await fd.close().catch(() => {});
    throw new Error("Operation failed");
  }
};
