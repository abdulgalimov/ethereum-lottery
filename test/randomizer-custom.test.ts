import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { RandomizerCustom } from "../typechain-types";
import { createLottery } from "./utils/utils";
import { createTestRandomizer } from "./utils/randomizer";

describe("RandomizerCustom", () => {
  let signers: SignerWithAddress[];
  let owner: SignerWithAddress;
  let randomizerCustom: RandomizerCustom;

  beforeEach(async () => {
    signers = await ethers.getSigners();
    owner = signers.shift() as SignerWithAddress;

    randomizerCustom = (await createTestRandomizer(owner)).contract;
  });

  it("set lottery ok", async () => {
    const lottery = await createLottery(randomizerCustom.address);
    await (await randomizerCustom.setLottery(lottery.address)).wait();
  });

  it("set lottery fail", async () => {
    await expect(randomizerCustom.setLottery(owner.address)).revertedWith(
      "Address is not contract"
    );
  });

  it("get random ok", async () => {
    const lottery = await createLottery(randomizerCustom.address);

    await (await randomizerCustom.setLottery(lottery.address)).wait();

    await (await lottery.requestRandom()).wait();
  });

  it("get random fail", async () => {
    await expect(randomizerCustom.getRandom()).revertedWith("Lottery only");
  });

  it("receiveRandom - wrong receive call", async () => {
    const lottery = await createLottery(randomizerCustom.address);
    await (await randomizerCustom.setLottery(lottery.address)).wait();
    await expect(randomizerCustom.sendForce()).revertedWith(
      "wrong receive call"
    );
  });
});
