import { resolvePath } from "../utils/pathResolver.js";
import { createReadStream, createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import { access } from "fs/promises";
import { Transform } from "stream";

const CsvToJsonTransform = () => {
  let headers = null;
  let isFirstObject = true;
  let leftover = "";

  return new Transform({
    encoding: "utf8",

    transform(chunk, _, callback) {
      const joinedData = leftover + chunk;
      const lines = joinedData.split(/\r?\n/);
      leftover = lines.pop() ?? "";

      try {
        for (const line of lines) {
          if (!line.trim()) continue;

          if (!headers) {
            headers = line.split(",");
            this.push("[\n");
          } else {
            const values = line.split(",");
            const obj = {};

            for (let i = 0; i < headers.length; i++) {
              obj[headers[i]] = values[i];
            }

            const prefix = isFirstObject ? "  " : ",\n  ";
            this.push(prefix + JSON.stringify(obj));
            isFirstObject = false;
          }
        }
        callback();
      } catch (error) {
        callback(error);
      }
    },

    flush(callback) {
      try {
        if (leftover.trim()) {
          const line = leftover;

          if (!headers) {
            headers = line.split(",");
            this.push("[\n");
          } else {
            const values = line.split(",");
            const obj = {};

            for (let i = 0; i < headers.length; i++) {
              obj[headers[i]] = values[i];
            }

            const prefix = isFirstObject ? "  " : ",\n  ";
            this.push(prefix + JSON.stringify(obj));
          }
        }

        this.push(headers ? "\n]\n" : "[\n]\n");

        callback();
      } catch (error) {
        callback(error);
      }
    },
  });
};

export const csvToJson = async (currentDirectory, options) => {
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
  const transformStream = CsvToJsonTransform();

  try {
    await pipeline(readStream, transformStream, writeStream);
  } catch (err) {
    throw new Error("Operation failed");
  }
};
