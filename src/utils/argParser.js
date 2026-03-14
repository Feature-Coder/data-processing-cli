export const parseArgs = (args) => {
  const options = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg.startsWith("--")) {
      const flag = arg.slice(2);
      const value = args[i + 1];

      if (value !== undefined && !value.startsWith("--")) {
        options[flag] = value;
        i++;
      } else {
        options[flag] = true;
      }
    }
  }

  return options;
};
