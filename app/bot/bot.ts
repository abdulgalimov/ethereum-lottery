import { Telegraf } from "telegraf";
import { ethers } from "ethers";
import { NetworkInfo } from "../networks";
import { EventData, Events, Settings } from "../contract/types";
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

const addMessageTemplate = `
➕ Add amount: $addAmount
💰 Total balance: $totalAmount
💲 Min bet: $minRate`;
const tryMessageTemplate = `
🎲 New game: $tryAmount
🔢 Count: $count
💰 Total balance: $totalAmount
💲 Min bet: $minRate`;
const winMessageTemplate = `
🎉 #Win
💰 Total balance: $totalAmount;
`;

export function notifyEvent(eventData: EventData) {
  console.log("[event]", eventData);
  let message: string = "";
  switch (eventData.name) {
    case Events.Add:
      const addEvent = eventData.data as AddEventObject;
      message = addMessageTemplate
        .replace("addAmount", formatAmount(addEvent.addAmount))
        .replace("$totalAmount", formatAmount(eventData.currentBalance));
      break;
    case Events.Try:
      const tryEvent = eventData.data as TryEventObject;
      message = tryMessageTemplate
        .replace("$tryAmount", formatAmount(tryEvent.tryAmount))
        .replace("$count", tryEvent.count.toString())
        .replace("$totalAmount", formatAmount(tryEvent.totalAmount));
      break;
    case Events.Win:
      const winEvent = eventData.data as WinEventObject;
      message = winMessageTemplate.replace(
        "$totalAmount",
        formatAmount(winEvent.winAmount)
      );
      break;
  }

  const scanUrl = network.scanUrl.replace("$hash", eventData.transactionHash);
  if (message) {
    const minRate = eventData.currentBalance
      .mul(contractSettings.minRate)
      .div(100);
    message = message.replace("$minRate", formatAmount(minRate));

    message = `${message}
<a href="${scanUrl}">⤴️ View on scan</a>`;
    return bot.telegram.sendMessage(TELEGRAM_CHANNEL_ID as string, message, {
      parse_mode: "HTML",
      disable_web_page_preview: true,
    });
  }
}

function formatAmount(amount: any): string {
  return ethers.utils.formatEther(amount) + " ETH";
}
