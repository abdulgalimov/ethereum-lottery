import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { RandomizerChainlink } from "../typechain-types";
import { createLottery, skipTime } from "./utils/utils";
import { createChainlinkRandomizer, IRandomizerInfo } from "./utils/randomizer";
import { lotteryOnlyMessage, onlyOwnerMessage } from "./utils/constants";

describe("RandomizerChainlink", () => {
  let signers: SignerWithAddress[];
  let owner: SignerWithAddress;
  let otherUser: SignerWithAddress;
  let wrapper: IRandomizerInfo<RandomizerChainlink>;
  let randomizerContract: RandomizerChainlink;

  beforeEach(async () => {
    signers = await ethers.getSigners();
    owner = signers.shift() as SignerWithAddress;
    otherUser = signers[1];

    wrapper = await createChainlinkRandomizer(owner);
    randomizerContract = wrapper.contract;
  });

  it("set lottery ok", async () => {
    const lottery = await createLottery(wrapper.address);
    await (await wrapper.setLottery(lottery.address)).wait();
  });

  it("set lottery fail", async () => {
    await expect(wrapper.setLottery(owner.address)).revertedWith(
      "Address is not contract"
    );
  });

  it("get random ok", async () => {
    const lottery = await createLottery(wrapper.address);

    await (await wrapper.setLottery(lottery.address)).wait();

    await (await lottery.t_requestRandom()).wait();
  });

  it("get random fail", async () => {
    await expect(randomizerContract.getRandom()).revertedWith(
      lotteryOnlyMessage
    );
  });

  it("pay-withdraw", async () => {
    await expect(
      owner.sendTransaction({
        value: 100,
        to: wrapper.address,
      })
    ).to.changeEtherBalances([owner, randomizerContract], [-100, 100]);

    await expect(randomizerContract.withdraw()).to.changeEtherBalances(
      [owner, randomizerContract],
      [100, -100]
    );
  });

  it("resetGetNumber fail", async () => {
    await expect(
      randomizerContract.connect(owner).resetGetNumber()
    ).to.revertedWith(lotteryOnlyMessage);
  });

  it("setLottery fail", async () => {
    await expect(
      randomizerContract.connect(otherUser).setLottery(otherUser.address)
    ).to.revertedWith(onlyOwnerMessage);
  });

  it("transferOwner", async () => {
    await (await randomizerContract.transferOwner(otherUser.address)).wait();

    expect(await randomizerContract.owner()).to.eq(otherUser.address);

    await expect(
      randomizerContract.transferOwner(otherUser.address)
    ).to.revertedWith(onlyOwnerMessage);
  });

  it("ignore fulfillRandomWords when requestId=0", async () => {
    const lottery = await createLottery(wrapper.address);
    await (await wrapper.setLottery(lottery.address)).wait();

    wrapper.pause(true);

    await (await lottery.addBalance({ value: 1000 })).wait();
    await (await lottery.attempt({ value: 1000 })).wait();

    const requestId = await randomizerContract.requestId();

    await skipTime(3600);
    await (await lottery.revertFailAttempt()).wait();

    await wrapper.sendRandom(requestId);
  });
});
