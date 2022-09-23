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
import {
  addMessageTemplate,
  tryFinishMessageTemplate,
  tryLuckTemplate,
  tryStartMessageTemplate,
  winMessageTemplate,
} from "./templates";

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

export async function notifyEvent(eventData: EventData) {
  console.log("[add-event]", eventData);
  await addToQueue(eventData);
}

async function parseEvents(eventData: EventData) {
  console.log("[parse-event]", eventData);
  await parsers[eventData.name](eventData);
}

async function parseAddEvent(eventData: EventData) {
  const addEvent = eventData.data as AddEventObject;
  const template = addMessageTemplate
    .replace("$addAmount", formatAmount(addEvent.addAmount))
    .replace("$totalAmount", formatAmount(eventData.currentBalance));

  const message = buildMessage(template, eventData);
  await sendMessage(eventData, message);
}

async function parseTryStartEvent(eventData: EventData) {
  const tryStartEvent = eventData.data as TryStartEventObject;
  const template = tryStartMessageTemplate.replace(
    "$tryAmount",
    formatAmount(tryStartEvent.tryAmount)
  );
  const message = buildMessage(template, eventData);
  const messageId = await sendMessage(eventData, message);
  await db.save(tryStartEvent.count.toString(), {
    messageId,
    transactionHash: eventData.transactionHash,
  });
}

async function parseTryFinishEvent(eventData: EventData) {
  const tryFinishEvent = eventData.data as TryFinishEventObject;
  const template = tryFinishMessageTemplate
    .replace("$tryAmount", formatAmount(tryFinishEvent.tryAmount))
    .replace("$count", tryFinishEvent.count.toString())
    .replace("$totalAmount", formatAmount(tryFinishEvent.totalAmount));

  const message = buildMessage(template, eventData);
  const tryLuckMessage = tryLuckTemplate.replace(
    "$contractAddress",
    network.deployData.lotteryAddress
  );
  const fullMessage = `${message}

${tryLuckMessage}`;

  const savedData = await db.load(tryFinishEvent.count.toString());
  await sendMessage(eventData, fullMessage, savedData);
}

async function parseWinEvent(eventData: EventData) {
  const winEvent = eventData.data as WinEventObject;
  const template = winMessageTemplate.replace(
    "$totalAmount",
    formatAmount(winEvent.winAmount)
  );
  const message = buildMessage(template, eventData);
  const savedData = await db.load(winEvent.count.toString());
  await sendMessage(eventData, message, savedData);
}

const parsers: Record<Events, (event: EventData) => Promise<void>> = {
  [Events.Add]: parseAddEvent,
  [Events.TryStart]: parseTryStartEvent,
  [Events.TryFinish]: parseTryFinishEvent,
  [Events.Win]: parseWinEvent,
};

function buildMessage(template: string, eventData: EventData): string {
  const minRate = eventData.currentBalance
    .mul(contractSettings.minRate)
    .div(100);

  const transactionHash = eventData.transactionHash;
  const scanUrl = network.scanUrl.replace("$hash", transactionHash);

  return template
    .replace("$minRate", formatAmount(minRate))
    .replace("$scanUrl", scanUrl);
}

async function sendMessage(
  eventData: EventData,
  message: string,
  savedData?: SaveData | null
): Promise<number> {
  const result = await bot.telegram.sendMessage(
    config.telegram.channelId,
    message,
    {
      parse_mode: "HTML",
      disable_web_page_preview: true,
      reply_to_message_id: savedData ? savedData.messageId : undefined,
    }
  );
  if (!result) {
    console.log("Error send message", result);
    return 0;
  }
  return result.message_id;
}

function formatAmount(amount: any): string {
  return ethers.utils.formatEther(amount) + " ETH";
}
