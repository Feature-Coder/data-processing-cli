import { parseArgs } from "./utils/argParser.js";

export const handleInput = async (input, currentDirectory) => {
  const trimmedInput = input.trim();

  if (!trimmedInput) {
    return null;
  }

  const [command, ...argsArray] = trimmedInput.split(/\s+/);
  const options = parseArgs(argsArray);

  try {
    switch (command) {
      case "up": {
        const module = await import("./navigation.js");
        return await module.goUp(currentDirectory);
      }

      case "cd": {
        const targetPath = argsArray[0];
        if (!targetPath) throw new Error("Invalid input");

        const module = await import("./navigation.js");
        return await module.goToDir(currentDirectory, targetPath);
      }

      case "ls": {
        const module = await import("./navigation.js");
        await module.listDir(currentDirectory);
        break;
      }

      case "csv-to-json": {
        const module = await import("./commands/csvToJson.js");
        await module.csvToJson(currentDirectory, options);
        break;
      }

      case "json-to-csv": {
        const module = await import("./commands/jsonToCsv.js");
        await module.jsonToCsv(currentDirectory, options);
        break;
      }

      case "count": {
        const module = await import("./commands/count.js");
        await module.count(currentDirectory, options);
        break;
      }

      case "hash": {
        const module = await import("./commands/hash.js");
        await module.calculateHash(currentDirectory, options);
        break;
      }

      case "hash-compare": {
        const module = await import("./commands/hashCompare.js");
        await module.compareHash(currentDirectory, options);
        break;
      }

      case "encrypt": {
        const module = await import("./commands/encrypt.js");
        await module.encryptFile(currentDirectory, options);
        break;
      }

      case "decrypt": {
        const module = await import("./commands/decrypt.js");
        await module.decryptFile(currentDirectory, options);
        break;
      }

      case "log-stats": {
        const module = await import("./commands/logStats.js");
        await module.computeLogStats(currentDirectory, options);
        break;
      }

      default:
        throw new Error("Invalid input");
    }
  } catch (error) {
    if (
      error.message === "Invalid input" ||
      error.code === "ERR_MODULE_NOT_FOUND"
    ) {
      console.log("Invalid input");
    } else {
      console.log("Operation failed");
    }
    return null;
  }

  return currentDirectory;
};
