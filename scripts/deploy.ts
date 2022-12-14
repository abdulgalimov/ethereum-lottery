import networks, { ChainLinkData, NetworkType } from "../app/networks";
import { ethers } from "hardhat";
import fs from "fs";
import path from "path";
import { BaseContract } from "@ethersproject/contracts";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { createSettings } from "../test/utils/utils";
import { IRandomizer, RandomizerCustom } from "../typechain-types";

const dataDir = "data";
const historyDir = `${dataDir}/history`;
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
if (!fs.existsSync(historyDir)) fs.mkdirSync(historyDir);

interface DeployInfo {
  contract: BaseContract;
  argumentsCmd: string;
  argumentsCode: any[];
}

async function deployCustomRandomizer(
  owner: SignerWithAddress
): Promise<DeployInfo> {
  const RandomizerFactory = await ethers.getContractFactory(
    "RandomizerCustom",
    owner
  );
  const randomizer = await RandomizerFactory.deploy();
  await randomizer.deployed();
  return {
    contract: randomizer,
    argumentsCmd: "",
    argumentsCode: [],
  };
}

async function deployChainlinkRandomizer(
  owner: SignerWithAddress,
  chainlinkData?: ChainLinkData
): Promise<DeployInfo> {
  if (!chainlinkData) {
    throw new Error("Invalid chainlink data");
  }
  const RandomizerFactory = await ethers.getContractFactory(
    "RandomizerChainlink",
    owner
  );
  const randomizer = await RandomizerFactory.deploy(
    chainlinkData.subscriptionId,
    chainlinkData.vrfCoordinator,
    chainlinkData.keyHash
  );
  await randomizer.deployed();

  const args = [
    chainlinkData.subscriptionId,
    chainlinkData.vrfCoordinator,
    chainlinkData.keyHash,
  ];
  return {
    contract: randomizer,
    argumentsCmd: `[${args.join(", ")}]`,
    argumentsCode: args,
  };
}

async function deployLottery(
  owner: SignerWithAddress,
  randomizer: IRandomizer
): Promise<DeployInfo> {
  const LotteryFactory = await ethers.getContractFactory("LotteryTest", owner);

  const settings = createSettings({
    randomizer: randomizer.address,
  });
  const lottery = await LotteryFactory.deploy(settings);
  await lottery.deployed();

  await (await randomizer.setLottery(lottery.address)).wait();

  const args = Object.entries(settings).map(([_, value]) => {
    return value;
  });

  return {
    contract: lottery,
    argumentsCmd: `[${args.join(", ")}]`,
    argumentsCode: [settings],
  };
}

function saveCurrentToHistory() {
  const { type, filename } = networks();

  const fullPath = path.resolve(dataDir, filename);
  if (!fs.existsSync(fullPath)) return;

  const fullTargetPath = `${historyDir}/${type}`;
  if (!fs.existsSync(fullTargetPath)) fs.mkdirSync(fullTargetPath);

  const data = require(fullPath);
  const ctime = data.ctime || 0;
  const targetPath = `${fullTargetPath}/${ctime}.json`;
  fs.copyFileSync(fullPath, targetPath);
}

function saveOut(
  owner: SignerWithAddress,
  lottery: DeployInfo,
  randomizerCustom: DeployInfo | null,
  randomizerChainlink: DeployInfo | null,
  filename: string
) {
  saveCurrentToHistory();

  const saveData = {
    ctime: Math.floor(Date.now() / 1000),
    owner: owner.address,
    hardhatPrivateKey:
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    lottery: {
      address: lottery.contract.address,
      argumentsCmd: lottery.argumentsCmd,
      argumentsCode: lottery.argumentsCode,
    },
    randomizerCustom: randomizerCustom
      ? {
          address: randomizerCustom.contract.address,
          argumentsCmd: randomizerCustom.argumentsCmd,
          argumentsCode: randomizerCustom.argumentsCode,
        }
      : null,
    randomizerChainlink: randomizerChainlink
      ? {
          address: randomizerChainlink.contract.address,
          argumentsCmd: randomizerChainlink.argumentsCmd,
          argumentsCode: randomizerChainlink.argumentsCode,
        }
      : null,
  };
  const saveJson = JSON.stringify(saveData, null, 2);
  console.log(`Deployed:
${saveJson}`);

  const fullPath = path.resolve(dataDir, filename);
  console.log(`Saved to file: ${fullPath}`);

  fs.writeFileSync(fullPath, saveJson);
}

enum Randomizers {
  CUSTOM = "custom",
  CHAINLINK = "chainlink",
}
const randomizer =
  process.env.npm_config_randomizer ||
  process.env.RANDOMIZER ||
  Randomizers.CUSTOM;
console.log("randomizer", randomizer);

async function main() {
  const { filename, type, deployData } = networks();
  if (
    type !== NetworkType.localhost &&
    type !== NetworkType.goerli &&
    type !== NetworkType.mainnet
  ) {
    console.log("deploy to localhost/goerli/mainnet only");
    process.exit(1);
  }

  const [owner] = await ethers.getSigners();
  const isLocalhost = type === NetworkType.localhost;

  let randomizerChainlink = null;
  let randomizerCustom = null;

  let currentRandomizer: DeployInfo;
  switch (randomizer) {
    case Randomizers.CHAINLINK:
      randomizerChainlink = !isLocalhost
        ? await deployChainlinkRandomizer(owner, deployData.chainlink)
        : null;
      if (!randomizerChainlink) {
        throw new Error("Invalid randomizerChainlink");
      }
      currentRandomizer = randomizerChainlink;
      break;
    case Randomizers.CUSTOM:
    default:
      randomizerCustom = await deployCustomRandomizer(owner);
      currentRandomizer = randomizerCustom;
      break;
  }

  const lottery = await deployLottery(
    owner,
    currentRandomizer.contract as IRandomizer
  );

  await (currentRandomizer.contract as IRandomizer).setLottery(
    lottery.contract.address
  );

  saveOut(owner, lottery, randomizerCustom, randomizerChainlink, filename);
}

main().catch((error) => {
  console.error(error);
  process.exit(2);
});
