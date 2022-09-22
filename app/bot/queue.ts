import { BigNumber } from "ethers";
import { DoneCallback, Job } from "bull";
import config from "../config";
import { EventData } from "../types";

const Bull = require("bull");

const redis = {
  host: "localhost",
  port: 6379,
  db: config.redis.databaseIndex,
  maxRetriesPerRequest: null,
  connectTimeout: 180000,
};

const defaultJobOptions = {
  removeOnComplete: true,
  removeOnFail: false,
};

const limiter = {
  max: 10000,
  duration: 1000,
  bounceBack: false,
};

const settings = {
  lockDuration: 600000, // Key expiration time for job locks.
  stalledInterval: 5000, // How often check for stalled jobs (use 0 for never checking).
  maxStalledCount: 2, // Max amount of times a stalled job will be re-processed.
  guardInterval: 5000, // Poll interval for delayed jobs and added jobs.
  retryProcessDelay: 30000, // delay before processing next job in case of internal error.
  drainDelay: 5, // A timeout for when the queue is in drained state (empty waiting for jobs).
};

const bull = new Bull("eth_events_queue", {
  redis,
  defaultJobOptions,
  settings,
  limiter,
});

export type Callback = (eventData: EventData) => Promise<void>;
export async function init(callback: Callback) {
  await bull.process("eth-events", async (job: Job, done: DoneCallback) => {
    try {
      const eventData: EventData = prepareData(job.data);
      await callback(eventData);
      done();
    } catch (err: any) {
      done(err);
    }
  });
}

function prepareData(data: any) {
  Object.keys(data).forEach((key) => {
    const value = data[key];
    if (!value) return;
    if (typeof value !== "object") return;
    if (value["type"] === "BigNumber" && value["hex"]) {
      data[key] = BigNumber.from(value["hex"]);
    } else {
      prepareData(value);
    }
  });
  return data;
}

export async function add(eventData: EventData) {
  await bull.add("eth-events", eventData);
}
