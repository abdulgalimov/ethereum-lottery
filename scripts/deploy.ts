import { ethers } from "hardhat";
import fs from 'fs';
import path from 'path';
import networks from '../app/networks';

const dataDir = 'data';
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

const { HARDHAT_NETWORK } = process.env;

async function main() {
  const { filename } = networks(HARDHAT_NETWORK);

  const [owner] = await ethers.getSigners();
  const Lottery = await ethers.getContractFactory("Lottery", owner);
  const lottery = await Lottery.deploy({
    randomValue: 1000,
    minChance: 1,
    maxChance: 100,
    winRate: 90,
    feeRate: 70,
    minRate: 10,
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
