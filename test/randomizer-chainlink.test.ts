import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { RandomizerChainlink } from "../typechain-types";
import { createLottery } from "./utils/utils";

describe("RandomizerChainlink", () => {
  let signers: SignerWithAddress[];
  let owner: SignerWithAddress;
  let randomizerChainlink: RandomizerChainlink;

  beforeEach(async () => {
    signers = await ethers.getSigners();
    owner = signers.shift() as SignerWithAddress;

    const VRFCoordinatorV2Mock = await ethers.getContractFactory(
      "VRFCoordinatorV2Mock"
    );
    const vrfMock = await VRFCoordinatorV2Mock.connect(owner).deploy(0, 0);
    await vrfMock.deployed();
    const transaction = await vrfMock.createSubscription();
    const transactionReceipt = await transaction.wait(1);
    const subscriptionId = ethers.BigNumber.from(
      transactionReceipt.events[0].topics[1]
    );

    const RandomizerFactory = await ethers.getContractFactory(
      "RandomizerChainlink"
    );
    randomizerChainlink = await RandomizerFactory.deploy(
      subscriptionId,
      vrfMock.address
    );
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
