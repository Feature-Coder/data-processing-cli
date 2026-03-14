import { resolvePath } from "../utils/pathResolver.js";
import { createReadStream } from "fs";
import { pipeline } from "stream/promises";
import { access } from "fs/promises";
import { Writable } from "stream";

const createCountWritable = () => {
  let lines = 0;
  let words = 0;
  let chars = 0;
  let lastCharWasSpace = true;

  return new Writable({
    decodeStrings: false,

    write(chunk, _, callback) {
      chars += chunk.length;
      for (let i = 0; i < chunk.length; i++) {
        const char = chunk[i];

        if (char === "\n") {
          lines++;
        }

        const isWhitespace =
          char === " " || char === "\t" || char === "\n" || char === "\r";

        if (isWhitespace) {
          lastCharWasSpace = true;
        } else {
          if (lastCharWasSpace) {
            words++;
            lastCharWasSpace = false;
          }
        }
      }

      callback();
    },

    final(callback) {
      console.log(`Lines: ${lines}`);
      console.log(`Words: ${words}`);
      console.log(`Characters: ${chars}`);
      callback();
    },
  });
};

export const count = async (currentDirectory, options) => {
  const { input } = options;

  if (!input) {
    throw new Error("Invalid input");
  }

  const inputPath = resolvePath(currentDirectory, input);

  try {
    await access(inputPath);
  } catch {
    throw new Error("Operation failed");
  }

  const readStream = createReadStream(inputPath, { encoding: "utf8" });
  const countStream = createCountWritable();

  try {
    await pipeline(readStream, countStream);
  } catch (err) {
    throw new Error("Operation failed");
  }
};
