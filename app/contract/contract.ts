import Web3 from "web3";
import { Contract } from "web3-eth-contract";
import { NetworkInfo, NetworkType } from "../networks";
import path from "path";
import fs from "fs";
import * as process from "process";
import { EventData, Settings } from "./types";

type Callback = (name: string, ...args: any[]) => {};

let web3: Web3;
let callback: Callback;
let ownerAddress: string;
let lotteryAddress: string;
let randomizerAddress: string;

const baseDataPath = "../../data";

export async function init(_network: NetworkInfo, _callback: Callback) {
  callback = _callback;

  const { type, providerUrl, filename } = _network;

  web3 = new Web3(providerUrl);

  const LotteryInfo = require(`${baseDataPath}/${filename}`);
  ownerAddress = LotteryInfo.owner;
  lotteryAddress = LotteryInfo.lottery;
  randomizerAddress = LotteryInfo.randomizer;

  switch (type) {
    case NetworkType.localhost:
      await connectToLottery("LotteryTest", "test/");
      await connectToRandomizer();
      break;
  }
}

function readArtifact(name: string, filepath: string = "") {
  const artifactPath = path.resolve(
    __dirname,
    "../..",
    `artifacts/contracts/${filepath}${name}.sol/${name}.json`
  );
  if (!fs.existsSync(artifactPath)) {
    console.log(`Artifact ${name} not found`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(artifactPath).toString());
}

async function existContract(address: string) {
  const code = await web3.eth.getCode(address);
  const exists = code !== "0x";
  if (!exists) {
    throw new Error(`Lottery contract not found in address: ${lotteryAddress}`);
  }
}

let settings: Settings;
export function getSettings(): Settings {
  return settings;
}
async function connectToLottery(name: string, filepath?: string) {
  await existContract(lotteryAddress);

  const LotteryArtifacts = readArtifact(name, filepath);

  const lotteryContract = new web3.eth.Contract(
    LotteryArtifacts.abi,
    lotteryAddress
  );

  settings = await readSettings(lotteryContract);

  lotteryContract.events.TestEvent().on("data", async function (event: any) {
    console.log("TestEvent", event);
  });

  async function getEventData(event: any): Promise<EventData> {
    return {
      transactionHash: event.transactionHash,
      currentBalance: await lotteryContract.methods.getBalance().call(),
      data: event.returnValues,
    };
  }

  lotteryContract.events.Add().on("data", async function (event: any) {
    callback("add", await getEventData(event));
  });

  lotteryContract.events.Try().on("data", async function (event: any) {
    callback("try", await getEventData(event));
  });

  lotteryContract.events.Win().on("data", async function (event: any) {
    callback("win", await getEventData(event));
  });

  lotteryContract.events
    .SettingsChanged()
    .on("data", async function (event: any) {
      const { settings } = event.returnValues;
      console.log("[change settings]", settings);
    });
}

async function readSettings(lotteryContract: Contract): Promise<Settings> {
  const settings: Settings = await lotteryContract.methods.settings().call();
  return {
    randomValue: +settings.randomValue,
    minChance: +settings.minChance,
    maxChance: +settings.maxChance,
    winRate: +settings.winRate,
    feeRate: +settings.feeRate,
    minRate: +settings.minRate,
    randomizer: settings.randomizer,
  };
}

async function connectToRandomizer() {
  await existContract(lotteryAddress);

  const RandomizerArtifacts = readArtifact("RandomizerCustom");

  const randomizerContract = new web3.eth.Contract(
    RandomizerArtifacts.abi,
    randomizerAddress
  );

  async function sendToRandomizer() {
    const options = {
      from: ownerAddress,
    };
    try {
      const need = await (
        await randomizerContract.methods.needRandom()
      ).call(options);
      if (need) {
        console.log("send need");
        const res = await randomizerContract.methods.sendIfNeed();
        await res.send(options);
      }
    } catch (err) {
      console.log("err", err);
    }
  }

  setInterval(sendToRandomizer, 1000);
}
