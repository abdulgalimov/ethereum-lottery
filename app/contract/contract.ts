import { ethers, Contract } from "ethers";
import path from "path";
import fs from "fs";
import * as process from "process";
import { DeployData, NetworkInfo, NetworkType } from "../networks";
import { EventData, Settings } from "../types";
import { WebSocketProvider } from "./WebSocketProvider";
import {
  AddEventObject,
  TryFinishEventObject,
  TryStartEventObject,
  WinEventObject,
} from "../../typechain-types/contracts/Lottery";

type Callback = (...args: any[]) => {};

let callback: Callback;

let provider: WebSocketProvider;

export async function init(_network: NetworkInfo, _callback: Callback) {
  callback = _callback;

  const { type, providerUrl, deployData } = _network;

  provider = new WebSocketProvider(providerUrl);

  switch (type) {
    case NetworkType.localhost:
      await connectToLottery(deployData, "LotteryTest", "test/");
      await connectToRandomizer(deployData);
      break;
    case NetworkType.goerli:
      await connectToLottery(deployData, "LotteryTest", "test/");
      await connectToRandomizer(deployData);
      break;
  }
}

function readArtifact(name: string, filepath: string = "") {
  const appDir = path.dirname(require.main?.filename as string);
  const artifactPath = path.resolve(
    appDir,
    "../",
    `artifacts/contracts/${filepath}${name}.sol/${name}.json`
  );
  if (!fs.existsSync(artifactPath)) {
    console.log(`Artifact ${artifactPath} not found`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(artifactPath).toString());
}

async function existContract(address: string) {
  return true;
}

let settings: Settings;
export function getSettings(): Settings {
  return settings;
}
async function connectToLottery(
  deployData: DeployData,
  name: string,
  filepath?: string
) {
  await existContract(deployData.lotteryAddress);

  const LotteryArtifacts = readArtifact(name, filepath);

  const lotteryContract = new ethers.Contract(
    deployData.lotteryAddress,
    LotteryArtifacts.abi,
    provider
  );

  settings = await readSettings(lotteryContract);

  lotteryContract.on("TestEvent", async function (event: any) {
    console.log("TestEvent", event);
  });

  async function getEventData(event: any, data: any): Promise<EventData> {
    return {
      name: event.event,
      transactionHash: event.transactionHash,
      currentBalance: (await lotteryContract.functions.getBalance())[0],
      data,
    };
  }

  lotteryContract.on("Add", async function () {
    const event = arguments[arguments.length - 1];
    const data: AddEventObject = {
      addAmount: event.args.addAmount,
    };
    callback(await getEventData(event, data));
  });

  lotteryContract.on("TryStart", async function () {
    const event = arguments[arguments.length - 1];
    const data: TryStartEventObject = {
      tryAmount: event.args.tryAmount,
      totalAmount: event.args.totalAmount,
      count: event.args.count,
    };
    callback(await getEventData(event, data));
  });

  lotteryContract.on("TryFinish", async function () {
    const event = arguments[arguments.length - 1];
    const data: TryFinishEventObject = {
      tryAmount: event.args.tryAmount,
      totalAmount: event.args.totalAmount,
      count: event.args.count,
      isWin: event.args.isWin,
    };
    callback(await getEventData(event, data));
  });

  lotteryContract.on("Win", async function () {
    const event = arguments[arguments.length - 1];
    const data: WinEventObject = {
      winAmount: event.args.winAmount,
      count: event.args.count,
    };
    callback(await getEventData(event, data));
  });

  lotteryContract.on("SettingsChanged", async function () {
    const event = arguments[arguments.length - 1];
    const { settings } = event.args;
    console.log("[change settings]", settings);
  });
}

async function readSettings(lotteryContract: Contract): Promise<Settings> {
  const settings: Settings = await lotteryContract.functions.settings();
  return {
    randomValue: +settings.randomValue,
    minChance: +settings.minChance,
    maxChance: +settings.maxChance,
    winRate: +settings.winRate,
    feeRate: +settings.feeRate,
    minBet: +settings.minBet,
    randomizer: settings.randomizer,
  };
}

async function connectToRandomizer(deployData: DeployData) {
  await existContract(deployData.lotteryAddress);

  const RandomizerArtifacts = readArtifact("RandomizerCustom");

  const wallet = new ethers.Wallet(deployData.ownerKey as string, provider);

  const randomizerContract = new ethers.Contract(
    deployData.randomizerAddress,
    RandomizerArtifacts.abi,
    wallet
  );

  let inProgress: boolean = false;
  async function sendToRandomizer() {
    if (inProgress) return;
    inProgress = true;

    const options = {
      from: deployData.ownerAddress,
    };
    try {
      const need = (await randomizerContract.functions.needRandom(options))[0];
      if (need) {
        await (await randomizerContract.functions.sendIfNeed()).wait();
      }
    } catch (err) {
      console.log("sendToRandomizer error:", err);
    } finally {
      inProgress = false;
    }
  }

  setInterval(sendToRandomizer, 5000);
}
