require("dotenv").config();
import networks, { NetworkInfo } from "./networks";
import {
  init as initContract,
  getSettings as getContractSettings,
} from "./contract/contract";
import { start as startBot, notifyEvent } from "./bot";
import { EventData } from "./contract/types";

async function main() {
  console.log("[start dev:app]");

  const { npm_config_network, NETWORK } = process.env;
  const network: NetworkInfo = networks(npm_config_network || NETWORK);

  await initContract(network, onEvent);
  await startBot(network, getContractSettings());
}

async function onEvent(name: string, eventData: EventData) {
  return notifyEvent(name, eventData);
}

main();
