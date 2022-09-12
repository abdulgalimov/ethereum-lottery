import { ethers } from "hardhat";
import fs from 'fs';
import path from 'path';
import networks from '../app/networks';
import {defaultMinRate} from "../test/utils/utils";

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
  const lottery = await Lottery.deploy({
    randomValue: 10000,
    minChance: 10,
    maxChance: 1000,
    winRate: 90,
    feeRate: 90,
    minRate: Number(defaultMinRate),
    randomizer: randomizer.address,
  });
  await lottery.deployed();

  console.log(`deploy to:
owner: ${owner.address}
lottery: ${lottery.address}
`);
  fs.writeFileSync(path.resolve(dataDir, filename), JSON.stringify({
    owner: owner.address,
    address: lottery.address
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
