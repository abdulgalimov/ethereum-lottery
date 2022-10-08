import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { RandomizerCustomTest } from "../typechain-types";
import { createLottery, skipTime } from "./utils/utils";
import { createTestRandomizer, IRandomizerInfo } from "./utils/randomizer";
import { lotteryOnlyMessage } from "./utils/constants";

describe("RandomizerCustom", () => {
  let signers: SignerWithAddress[];
  let owner: SignerWithAddress;
  let otherUser: SignerWithAddress;
  let randomizerCustom: IRandomizerInfo<RandomizerCustomTest>;

  beforeEach(async () => {
    signers = await ethers.getSigners();
    owner = signers.shift() as SignerWithAddress;
    otherUser = signers[0];

    randomizerCustom = await createTestRandomizer(owner);
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

    await (await lottery.t_requestRandom()).wait();
  });

  it("get random fail", async () => {
    await expect(randomizerCustom.contract.getRandom()).revertedWith(
      lotteryOnlyMessage
    );
  });

  it("receiveRandom - wrong receive call", async () => {
    const lottery = await createLottery(randomizerCustom.address);
    await (await randomizerCustom.setLottery(lottery.address)).wait();
    await expect(randomizerCustom.contract.sendRandomTest()).revertedWith(
      "wrong receive call"
    );
  });

  it("sendIfNeed", async () => {
    const lottery = await createLottery(randomizerCustom.address);
    await (await randomizerCustom.setLottery(lottery.address)).wait();
    randomizerCustom.pause(true);

    await (
      await lottery.addBalance({
        value: 100,
      })
    ).wait();
    await (
      await lottery.connect(otherUser).attempt({
        value: 100,
      })
    ).wait();
    expect(await randomizerCustom.contract.needRandom()).to.eq(true);
    await (await randomizerCustom.contract.sendIfNeed()).wait();
    expect(await randomizerCustom.contract.needRandom()).to.eq(false);

    await (await randomizerCustom.contract.sendIfNeed()).wait();
    expect(await randomizerCustom.contract.needRandom()).to.eq(false);
  });

  it("pay-withdraw", async () => {
    await expect(
      owner.sendTransaction({
        value: 100,
        to: randomizerCustom.address,
      })
    ).to.changeEtherBalances([owner, randomizerCustom.contract], [-100, 100]);

    await expect(randomizerCustom.contract.withdraw()).to.changeEtherBalances(
      [owner, randomizerCustom.contract],
      [100, -100]
    );
  });

  it("resetGetNumber", async () => {
    const lottery = await createLottery(randomizerCustom.address);
    await (await randomizerCustom.setLottery(lottery.address)).wait();

    randomizerCustom.pause(true);

    await (await lottery.addBalance({ value: 1000 })).wait();
    await (await lottery.attempt({ value: 1000 })).wait();

    await skipTime(3600);

    await (await lottery.revertFailAttempt()).wait();
  });

  it("resetGetNumber fail", async () => {
    await expect(
      randomizerCustom.contract.connect(owner).resetGetNumber()
    ).to.revertedWith(lotteryOnlyMessage);
  });
});
