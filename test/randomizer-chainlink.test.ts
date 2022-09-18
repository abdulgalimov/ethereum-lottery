import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { RandomizerChainlink, RandomizerCustom } from "../typechain-types";
import { createLottery } from "./utils/utils";

describe("RandomizerChainlink", () => {
  let signers: SignerWithAddress[];
  let owner: SignerWithAddress;
  let randomizerChainlink: RandomizerChainlink;

  beforeEach(async () => {
    signers = await ethers.getSigners();
    owner = signers.shift() as SignerWithAddress;

    const RandomizerFactory = await ethers.getContractFactory(
      "RandomizerChainlink"
    );
    randomizerChainlink = await RandomizerFactory.deploy(0, "");
    await randomizerChainlink.deployed();
  });

  it("set lottery ok", async () => {
    const lottery = await createLottery(randomizerChainlink.address);
    await (await randomizerChainlink.setLottery(lottery.address)).wait();
  });

  it("set lottery fail", async () => {
    await expect(randomizerChainlink.setLottery(owner.address)).revertedWith(
      "Address is not contract"
    );
  });

  it("get random ok", async () => {
    const lottery = await createLottery(randomizerChainlink.address);

    await (await randomizerChainlink.setLottery(lottery.address)).wait();

    await (await lottery.requestRandom()).wait();
  });

  it("get random fail", async () => {
    await expect(randomizerChainlink.getRandom()).revertedWith("Lottery only");
  });
});
