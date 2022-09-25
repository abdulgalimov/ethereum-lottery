import networks, { NetworkType } from "../app/networks";
import { ethers } from "hardhat";
import fs from "fs";
import path from "path";
import { BaseContract } from "@ethersproject/contracts";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { createSettings } from "../test/utils/utils";
import { IRandomizer, RandomizerCustom } from "../typechain-types";

const dataDir = "data";
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

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
  owner: SignerWithAddress
): Promise<DeployInfo> {
  const RandomizerFactory = await ethers.getContractFactory(
    "RandomizerChainlink",
    owner
  );
  const randomizer = await RandomizerFactory.deploy(
    1933,
    "0x2Ca8E0C643bDe4C2E08ab1fA0da3401AdAD7734D"
  );
  await randomizer.deployed();
  return {
    contract: randomizer,
    argumentsCmd: "",
    argumentsCode: [],
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

function saveOut(
  owner: SignerWithAddress,
  lottery: DeployInfo,
  randomizerCustom: DeployInfo,
  randomizerChainlink: DeployInfo,
  filename: string
) {
  const saveData = {
    owner: owner.address,
    privateKey:
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    lottery: {
      address: lottery.contract.address,
      argumentsCmd: lottery.argumentsCmd,
      argumentsCode: lottery.argumentsCode,
    },
    randomizerCustom: {
      address: randomizerCustom.contract.address,
      argumentsCmd: randomizerCustom.argumentsCmd,
      argumentsCode: randomizerCustom.argumentsCode,
    },
    randomizerChainlink: {
      address: randomizerChainlink.contract.address,
      argumentsCmd: randomizerChainlink.argumentsCmd,
      argumentsCode: randomizerChainlink.argumentsCode,
    },
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
const randomizer = process.env.npm_config_randomizer || Randomizers.CUSTOM;

async function main() {
  const { filename, type } = networks();
  if (type !== NetworkType.localhost && type !== NetworkType.goerli) {
    console.log("deploy to localhost/goerli only");
    process.exit(1);
  }

  const [owner] = await ethers.getSigners();

  const randomizerChainlink = await deployChainlinkRandomizer(owner);
  //
  const randomizerCustom = await deployCustomRandomizer(owner);

  let currentRandomizer: DeployInfo;
  switch (randomizer) {
    case Randomizers.CHAINLINK:
      currentRandomizer = randomizerChainlink;
      break;
    case Randomizers.CUSTOM:
    default:
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
