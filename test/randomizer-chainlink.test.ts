import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { RandomizerChainlink } from "../typechain-types";
import { createLottery } from "./utils/utils";
import { createChainlinkRandomizer } from "./utils/randomizer";

describe("RandomizerChainlink", () => {
  let signers: SignerWithAddress[];
  let owner: SignerWithAddress;
  let randomizerChainlink: RandomizerChainlink;

  beforeEach(async () => {
    signers = await ethers.getSigners();
    owner = signers.shift() as SignerWithAddress;

    randomizerChainlink = (await createChainlinkRandomizer(owner)).contract;
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

    await (await lottery.t_requestRandom()).wait();
  });

  it("get random fail", async () => {
    await expect(randomizerChainlink.getRandom()).revertedWith("Lottery only");
  });

  it("pay-withdraw", async () => {
    await expect(
      owner.sendTransaction({
        value: 100,
        to: randomizerChainlink.address,
      })
    ).to.changeEtherBalances([owner, randomizerChainlink], [-100, 100]);

    await expect(randomizerChainlink.withdraw()).to.changeEtherBalances(
      [owner, randomizerChainlink],
      [100, -100]
    );
  });
});
