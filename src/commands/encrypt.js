import { createReadStream, createWriteStream } from "fs";
import { access } from "fs/promises";
import crypto from "crypto";
import { Transform } from "stream";
import { pipeline } from "stream/promises";
import { resolvePath } from "../utils/pathResolver.js";

export const encryptFile = async (currentDirectory, options) => {
  const { input, output, password } = options;

  if (!input || !output || !password) {
    throw new Error("Invalid input");
  }

  const inputPath = resolvePath(currentDirectory, input);
  const outputPath = resolvePath(currentDirectory, output);

  try {
    await access(inputPath);

    const salt = crypto.randomBytes(16);
    const iv = crypto.randomBytes(12);
    const key = crypto.scryptSync(password, salt, 32);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

    let isFirstChunk = true;

    const formatTransform = new Transform({
      transform(chunk, _, callback) {
        if (isFirstChunk) {
          this.push(Buffer.concat([salt, iv]));
          isFirstChunk = false;
        }
        this.push(chunk);
        callback();
      },

      flush(callback) {
        try {
          if (isFirstChunk) {
            this.push(Buffer.concat([salt, iv]));
          }
          this.push(cipher.getAuthTag());
          callback();
        } catch (err) {
          callback(err);
        }
      },
    });

    await pipeline(
      createReadStream(inputPath),
      cipher,
      formatTransform,
      createWriteStream(outputPath),
    );
  } catch {
    throw new Error("Operation failed");
  }
};
