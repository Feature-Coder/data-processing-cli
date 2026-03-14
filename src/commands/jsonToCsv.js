import { resolvePath } from "../utils/pathResolver.js";
import { createReadStream, createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import { access } from "fs/promises";
import { Transform } from "stream";

const JsonToCsvTransform = () => {
  let rawData = "";
  return new Transform({
    encoding: "utf8",

    transform(chunk, _, callback) {
      rawData += chunk;
      callback();
    },

    flush(callback) {
      try {
        const array = JSON.parse(rawData);

        if (!Array.isArray(array) || array.length === 0) {
          throw new Error("Invalid JSON array");
        }

        const headers = Object.keys(array[0]);
        this.push(headers.join(",") + "\n");

        for (const obj of array) {
          const values = headers.map((key) => obj[key] ?? "");
          this.push(values.join(",") + "\n");
        }

        callback();
      } catch (error) {
        callback(error);
      }
    },
  });
};

export const jsonToCsv = async (currentDirectory, options) => {
  const { input, output } = options;

  if (!input || !output) {
    throw new Error("Invalid input");
  }

  const inputPath = resolvePath(currentDirectory, input);
  const outputPath = resolvePath(currentDirectory, output);

  try {
    await access(inputPath);
  } catch {
    throw new Error("Operation failed");
  }

  const readStream = createReadStream(inputPath, { encoding: "utf8" });
  const writeStream = createWriteStream(outputPath, { encoding: "utf8" });
  const transformStream = JsonToCsvTransform();

  try {
    await pipeline(readStream, transformStream, writeStream);
  } catch (err) {
    throw new Error("Operation failed");
  }
};
