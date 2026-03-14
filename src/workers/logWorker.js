import { workerData, parentPort } from "worker_threads";
import { createReadStream } from "fs";

const { filePath, start, end } = workerData;

const stats = {
  total: 0,
  levels: { INFO: 0, WARN: 0, ERROR: 0 },
  status: { "2xx": 0, "3xx": 0, "4xx": 0, "5xx": 0 },
  pathCounts: {},
  responseTimeSum: 0,
};

const processLine = (line) => {
  if (!line.trim()) return;

  const parts = line.split(" ");
  const [, level, , statusCodeStr, responseTimeStr, , logPath] = parts;
  const statusCode = Number(statusCodeStr);

  stats.total++;
  stats.responseTimeSum += Number(responseTimeStr);

  if (level in stats.levels) stats.levels[level]++;

  const statusClass = `${Math.floor(statusCode / 100)}xx`;
  if (statusClass in stats.status) stats.status[statusClass]++;

  stats.pathCounts[logPath] = (stats.pathCounts[logPath] ?? 0) + 1;
};

const readStream = createReadStream(filePath, { start, end, encoding: "utf8" });
let leftover = "";

readStream.on("data", (chunk) => {
  const lines = (leftover + chunk).split("\n");
  leftover = lines.pop() ?? "";
  lines.forEach(processLine);
});

readStream.on("end", () => {
  if (leftover.trim()) processLine(leftover);
  parentPort.postMessage(stats);
});

readStream.on("error", (err) => {
  parentPort.postMessage({ error: err.message });
});
