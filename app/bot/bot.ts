import { Telegraf } from "telegraf";
import Web3 from "web3";
import { NetworkInfo } from "../networks";
import { EventData, Settings } from "../contract/types";
import {
  AddEventObject,
  TryEventObject,
  WinEventObject,
} from "../../typechain-types/contracts/Lottery";

const { TELEGRAM_TOKEN, TELEGRAM_CHANNEL_ID } = process.env;

let network: NetworkInfo;
let contractSettings: Settings;
let bot: Telegraf;

export async function start(
  _network: NetworkInfo,
  _contractSettings: Settings
) {
  network = _network;
  contractSettings = _contractSettings;
  bot = new Telegraf(TELEGRAM_TOKEN as string);
}

const tryMessageTemplate = `
➕ Add amount: $tryAmount
🔢 Count: $count
💰 Total balance: $totalAmount`;
const winMessageTemplate = `
🎉 #Win
💰 Total balance: $totalAmount;
`;

export function notifyEvent(name: string, eventData: EventData) {
  console.log("[event]", name, eventData);
  let message: string = "";
  switch (name) {
    case "try":
      const tryEvent = eventData.data as TryEventObject;
      message = tryMessageTemplate
        .replace("$tryAmount", formatAmount(tryEvent.tryAmount))
        .replace("$count", tryEvent.count.toString())
        .replace("$totalAmount", formatAmount(tryEvent.totalAmount));
      break;
    case "win":
      const winEvent = eventData.data as WinEventObject;
      message = winMessageTemplate.replace(
        "$totalAmount",
        formatAmount(winEvent.winAmount)
      );
      break;
  }

  const scanUrl = network.scanUrl.replace("$hash", eventData.transactionHash);
  if (message) {
    message = `${message}
<a href="${scanUrl}">⤴️ View on scan</a>`;
    return bot.telegram.sendMessage(TELEGRAM_CHANNEL_ID as string, message, {
      parse_mode: "HTML",
      disable_web_page_preview: true,
    });
  }
}

function formatAmount(amount: any): string {
  return Web3.utils.fromWei(amount, "ether") + " ETH";
}
