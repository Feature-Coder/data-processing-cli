import { access, stat, open, writeFile } from "fs/promises";
import { Worker } from "worker_threads";
import os from "os";
import { resolvePath } from "../utils/pathResolver.js";

const WORKER_PATH = resolvePath(import.meta.dirname, "../workers/logWorker.js");
const SCAN_BUFFER_SIZE = 1024;

const findNextNewline = async (fd, startPos, fileSize) => {
  let pos = startPos;
  const buffer = Buffer.alloc(SCAN_BUFFER_SIZE);

  while (pos < fileSize) {
    const { bytesRead } = await fd.read(buffer, 0, SCAN_BUFFER_SIZE, pos);
    if (bytesRead === 0) break;

    const newlineIdx = buffer.indexOf(0x0a, 0);
    if (newlineIdx !== -1 && newlineIdx < bytesRead) {
      return pos + newlineIdx;
    }
    pos += bytesRead;
  }
  return fileSize;
};

const runWorker = (filePath, start, end) =>
  new Promise((resolve, reject) => {
    const worker = new Worker(WORKER_PATH, {
      workerData: { filePath, start, end },
    });
    worker.on("message", (result) =>
      result.error ? reject(new Error(result.error)) : resolve(result),
    );
    worker.on("error", reject);
  });

const mergeStats = (results) => {
  return results.reduce(
    (acc, curr) => {
      acc.total += curr.total;
      acc.responseTimeSum += curr.responseTimeSum;

      for (const [level, count] of Object.entries(curr.levels)) {
        acc.levels[level] = (acc.levels[level] ?? 0) + count;
      }
      for (const [cls, count] of Object.entries(curr.status)) {
        acc.status[cls] = (acc.status[cls] ?? 0) + count;
      }
      for (const [pathKey, count] of Object.entries(curr.pathCounts)) {
        acc.pathCounts[pathKey] = (acc.pathCounts[pathKey] ?? 0) + count;
      }
      return acc;
    },
    { total: 0, responseTimeSum: 0, levels: {}, status: {}, pathCounts: {} },
  );
};

export const computeLogStats = async (currentDirectory, options) => {
  const { input, output } = options;

  if (!input || !output) throw new Error("Invalid input");

  const inputPath = resolvePath(currentDirectory, input);
  const outputPath = resolvePath(currentDirectory, output);

  try {
    await access(inputPath);
  } catch {
    throw new Error("Operation failed");
  }

  const { size: fileSize } = await stat(inputPath);
  const numWorkers = os.cpus().length;
  const approxChunkSize = Math.floor(fileSize / numWorkers);

  const fd = await open(inputPath, "r");
  const workerPromises = [];
  let currentStart = 0;

  try {
    for (let i = 0; i < numWorkers; i++) {
      let currentEnd;

      if (i === numWorkers - 1) {
        currentEnd = fileSize;
      } else {
        const theoreticalEnd = currentStart + approxChunkSize;
        currentEnd = await findNextNewline(fd, theoreticalEnd, fileSize);
      }

      if (currentStart <= currentEnd) {
        workerPromises.push(runWorker(inputPath, currentStart, currentEnd));
      }

      currentStart = currentEnd + 1;
    }
  } finally {
    await fd.close();
  }

  try {
    const partialStats = await Promise.all(workerPromises);
    const merged = mergeStats(partialStats);

    const topPaths = Object.entries(merged.pathCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([reqPath, count]) => ({ path: reqPath, count }));

    const avgResponseTimeMs =
      merged.total > 0
        ? Number((merged.responseTimeSum / merged.total).toFixed(2))
        : 0;

    const finalResult = {
      total: merged.total,
      levels: merged.levels,
      status: merged.status,
      topPaths,
      avgResponseTimeMs,
    };

    await writeFile(outputPath, JSON.stringify(finalResult, null, 2), "utf8");
  } catch {
    throw new Error("Operation failed");
  }
};
