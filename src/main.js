import readline from "readline";
import os from "os";
import { handleInput } from "./repl.js";

let currentDirectory = os.homedir();

const startInteractive = () => {
  console.log("Welcome to Data Processing CLI!");
  console.log(`You are currently in ${currentDirectory}`);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "> ",
  });

  rl.prompt();

  rl.on("line", async (input) => {
    const trimmedInput = input.trim();

    if (trimmedInput === ".exit") {
      rl.close();
      return;
    }

    const nextDirectory = await handleInput(input, currentDirectory);

    if (nextDirectory !== null) {
      currentDirectory = nextDirectory;
      console.log(`You are currently in ${currentDirectory}`);
    }

    rl.prompt();
  });

  rl.on("SIGINT", () => {
    console.log("");
    rl.close();
  });

  rl.on("close", () => {
    console.log("Thank you for using Data Processing CLI!");
    process.exit(0);
  });
};

startInteractive();
