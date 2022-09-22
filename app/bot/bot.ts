import config from "../config";
import { Telegraf } from "telegraf";
import { ethers } from "ethers";
import { NetworkInfo } from "../networks";
import { EventData, Events, SaveData, Settings } from "../types";
import {
  AddEventObject,
  TryFinishEventObject,
  TryStartEventObject,
  WinEventObject,
} from "../../typechain-types/contracts/Lottery";
import { Db } from "../db";
import { init as queueInit, add as addToQueue } from "./queue";

let network: NetworkInfo;
let contractSettings: Settings;
let bot: Telegraf;
let db: Db;

export async function start(
  _network: NetworkInfo,
  _contractSettings: Settings,
  _db: Db
) {
  network = _network;
  contractSettings = _contractSettings;
  db = _db;
  bot = new Telegraf(config.telegram.token as string);
  await queueInit(parseEvents);
}

const addMessageTemplate = `
➕ Add amount: $addAmount
💰 Total balance: $totalAmount
💲 Min bet: $minRate`;
const tryStartMessageTemplate = `
🎲 Start game: $tryAmount
...wait`;
const tryFinishMessageTemplate = `
🎲 Finish game: $tryAmount
🔢 Count: $count
💰 Total balance: $totalAmount
💲 Min bet: $minRate`;
const winMessageTemplate = `
🎉 #Win
💰 Total balance: $totalAmount;
`;

export async function notifyEvent(eventData: EventData) {
  console.log("[add-event]", eventData);
  await addToQueue(eventData);
}

async function parseEvents(eventData: EventData) {
  console.log("[parse-event]", eventData);
  let template: string = "";
  switch (eventData.name) {
    case Events.Add:
      const addEvent = eventData.data as AddEventObject;
      template = addMessageTemplate
        .replace("addAmount", formatAmount(addEvent.addAmount))
        .replace("$totalAmount", formatAmount(eventData.currentBalance));

      await sendMessage(eventData, template);
      break;
    case Events.TryStart:
      const tryStartEvent = eventData.data as TryStartEventObject;
      template = tryStartMessageTemplate
        .replace("$tryAmount", formatAmount(tryStartEvent.tryAmount))
        .replace("$count", tryStartEvent.count.toString())
        .replace("$totalAmount", formatAmount(tryStartEvent.totalAmount));

      const messageId = await sendMessage(eventData, template);
      await db.save(tryStartEvent.count.toString(), {
        messageId,
        transactionHash: eventData.transactionHash,
      });
      break;
    case Events.TryFinish:
      const tryFinishEvent = eventData.data as TryFinishEventObject;
      template = tryFinishMessageTemplate
        .replace("$tryAmount", formatAmount(tryFinishEvent.tryAmount))
        .replace("$count", tryFinishEvent.count.toString())
        .replace("$totalAmount", formatAmount(tryFinishEvent.totalAmount));

      const savedData = await db.load(tryFinishEvent.count.toString());
      await sendMessage(eventData, template, savedData);
      break;
    case Events.Win:
      const winEvent = eventData.data as WinEventObject;
      template = winMessageTemplate.replace(
        "$totalAmount",
        formatAmount(winEvent.winAmount)
      );

      await sendMessage(eventData, template);
      break;
  }
}

function buildMessage(
  template: string,
  eventData: EventData,
  savedData?: SaveData | null
): string {
  const transactionHash = savedData
    ? savedData.transactionHash
    : eventData.transactionHash;

  const scanUrl = network.scanUrl.replace("$hash", transactionHash);

  const minRate = eventData.currentBalance
    .mul(contractSettings.minRate)
    .div(100);

  template = template.replace("$minRate", formatAmount(minRate));

  template = `${template}
<a href="${scanUrl}">⤴️ View on scan</a>

📣 Try your luck
<code>${network.deployData.lotteryAddress}</code>
`;

  return template;
}

async function sendMessage(
  eventData: EventData,
  message: string,
  savedData?: SaveData | null
): Promise<number> {
  const messageToSend = buildMessage(message, eventData, savedData);
  if (!savedData) {
    const result = await bot.telegram.sendMessage(
      config.telegram.channelId,
      messageToSend,
      {
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }
    );
    if (!result) {
      console.log("Error send message", result);
      return 0;
    }
    return result.message_id;
  } else {
    await bot.telegram.editMessageText(
      config.telegram.channelId,
      savedData.messageId,
      undefined,
      messageToSend,
      {
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }
    );
    return 0;
  }
}

function formatAmount(amount: any): string {
  return ethers.utils.formatEther(amount) + " ETH";
}
