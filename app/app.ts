import networks, { NetworkInfo } from "./networks";

require("dotenv").config();

import { init as initContract } from "./contract";
import { start as startBot, notifyEvent } from "./bot";

async function main() {
  console.log("[start dev:app]");

  const { npm_config_network, NETWORK } = process.env;
  const network: NetworkInfo = networks(npm_config_network || NETWORK);

  await initContract(network, onEvent);
  await startBot(network);
}

async function onEvent(name: string, ...args: any[]) {
  return notifyEvent(name, ...args);
}

main();
