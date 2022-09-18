import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { RandomizerCustomTest } from "../typechain-types";
import { createLottery } from "./utils/utils";
import { createTestRandomizer } from "./utils/randomizer";

describe("RandomizerCustom", () => {
  let signers: SignerWithAddress[];
  let owner: SignerWithAddress;
  let randomizerCustom: RandomizerCustomTest;

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
    await expect(randomizerCustom.sendRandomTest()).revertedWith(
      "wrong receive call"
    );
  });

  it("pay-withdraw", async () => {
    await expect(
      owner.sendTransaction({
        value: 100,
        to: randomizerCustom.address,
      })
    ).to.changeEtherBalances([owner, randomizerCustom], [-100, 100]);

    await expect(randomizerCustom.withdraw()).to.changeEtherBalances(
      [owner, randomizerCustom],
      [100, -100]
    );
  });
});
