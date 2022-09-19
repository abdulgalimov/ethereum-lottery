import { ethers } from "hardhat";
import fs from "fs";
import path from "path";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import networks from "../app/networks";
import { createSettings } from "../test/utils/utils";
import { IRandomizer, Lottery } from "../typechain-types";

const { HARDHAT_NETWORK } = process.env;

const dataDir = "data";
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

async function deployCustomRandomizer(
  owner: SignerWithAddress
): Promise<IRandomizer> {
  const RandomizerFactory = await ethers.getContractFactory(
    "RandomizerCustom",
    owner
  );
  const randomizer = await RandomizerFactory.deploy();
  await randomizer.deployed();
  return randomizer;
}

async function deployLottery(
  owner: SignerWithAddress,
  randomizer: IRandomizer
): Promise<Lottery> {
  const LotteryFactory = await ethers.getContractFactory("Lottery", owner);
  const lottery = await LotteryFactory.deploy(
    createSettings({
      randomizer: randomizer.address,
    })
  );
  await lottery.deployed();

  await (await randomizer.setLottery(lottery.address)).wait();

  return lottery;
}

function saveOut(
  owner: SignerWithAddress,
  lottery: Lottery,
  randomizer: IRandomizer
) {
  const { filename } = networks(HARDHAT_NETWORK);

  console.log(`Deployed:
  owner: ${owner.address}
  lottery: ${lottery.address}
  randomizer: ${randomizer.address}`);

  const fullPath = path.resolve(dataDir, filename);
  console.log(`Saved to file: ${fullPath}`);

  fs.writeFileSync(
    fullPath,
    JSON.stringify(
      {
        owner: owner.address,
        lottery: lottery.address,
        randomizer: randomizer.address,
      },
      null,
      2
    )
  );
}

async function main() {
  const [owner] = await ethers.getSigners();

  const randomizerCustom = await deployCustomRandomizer(owner);

  const lottery = await deployLottery(owner, randomizerCustom);

  saveOut(owner, lottery, randomizerCustom);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
