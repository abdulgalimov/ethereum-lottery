import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { createSettings } from "./utils/utils";
import { LotteryTest, RandomizerCustom } from "../typechain-types";

describe("RandomizerCustom", () => {
  let signers: SignerWithAddress[];
  let owner: SignerWithAddress;
  let randomizerCustom: RandomizerCustom;

  async function getLottery(): Promise<LotteryTest> {
    const LotteryTest = await ethers.getContractFactory("LotteryTest");
    const lottery = await LotteryTest.deploy(
      createSettings({
        randomizer: randomizerCustom.address,
      })
    );
    await lottery.deployed();
    return lottery;
  }

  beforeEach(async () => {
    signers = await ethers.getSigners();
    owner = signers.shift() as SignerWithAddress;

    const RandomizerCustom = await ethers.getContractFactory(
      "RandomizerCustom"
    );
    randomizerCustom = await RandomizerCustom.deploy();
    await randomizerCustom.deployed();
  });

  it("set lottery ok", async () => {
    const lottery = await getLottery();
    await (await randomizerCustom.setLottery(lottery.address)).wait();
  });

  it("set lottery fail", async () => {
    await expect(randomizerCustom.setLottery(owner.address)).revertedWith(
      "Address is not contract"
    );
  });

  it("get random ok", async () => {
    const lottery = await getLottery();

    await (await randomizerCustom.setLottery(lottery.address)).wait();

    await (await lottery.requestRandom()).wait();
  });

  it("get random fail", async () => {
    await expect(randomizerCustom.getRandom()).revertedWith("Lottery only");
  });
});
