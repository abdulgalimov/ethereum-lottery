import { ethers } from "hardhat";
import fs from 'fs';
import path from 'path';
import networks from '../app/networks';
import { defaultSettings } from "../test/utils/utils";

const dataDir = 'data';
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

const { HARDHAT_NETWORK } = process.env;

async function main() {
  const { filename } = networks(HARDHAT_NETWORK);

  const [owner] = await ethers.getSigners();

  const Randomizer = await ethers.getContractFactory("RandomizerTest", owner);
  const randomizer = await Randomizer.deploy();
  await randomizer.deployed();

  const Lottery = await ethers.getContractFactory("Lottery", owner);
  const lottery = await Lottery.deploy(defaultSettings);
  await lottery.deployed();

  await (await randomizer.setLottery(lottery.address)).wait();

  console.log(`deploy to:
owner: ${owner.address}
lottery: ${lottery.address}
randomizer: ${randomizer.address}
`);
  fs.writeFileSync(path.resolve(dataDir, filename), JSON.stringify({
    owner: owner.address,
    lottery: lottery.address,
    randomizer: randomizer.address,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
