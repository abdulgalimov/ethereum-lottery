require("dotenv").config();
import networks, { NetworkInfo } from "./networks";
import {
  init as initContract,
  getSettings as getContractSettings,
} from "./contract/contract";
import { start as startBot, notifyEvent } from "./bot";
import { EventData } from "./types";
import { create as createDb } from "./db";

async function main() {
  console.log("[start dev:app]");

  const { npm_config_network, NETWORK } = process.env;
  const network: NetworkInfo = networks(npm_config_network || NETWORK);
  const db = await createDb();

  await initContract(network, onEvent);
  await startBot(network, getContractSettings(), db);
}

async function onEvent(eventData: EventData) {
  return notifyEvent(eventData);
}

main();
