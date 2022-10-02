import fs from "fs";
import networks, { NetworkType } from "../app/networks";

const hre = require("hardhat");

async function main() {
  const { filename, type } = networks();
  if (type !== NetworkType.localhost && type !== NetworkType.goerli) {
    console.log("deploy to localhost/goerli only");
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(`data/${filename}`).toString());

  await verify(data.randomizerChainlink);
  await verify(data.randomizerCustom);
  await verify(data.lottery);
}

async function verify(contractData: { address: string; argumentsCode: any[] }) {
  try {
    await hre.run("verify:verify", {
      address: contractData.address,
      constructorArguments: contractData.argumentsCode,
    });
  } catch (err) {
    console.log("err", err);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
