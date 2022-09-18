import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { RandomizerCustom, RandomizerChainlink } from "../../typechain-types";

export interface IRandomizerInfo<T> {
  randomizer: T;
  address: string;
  setLottery(address: string): Promise<any>;
  destroy(): void;
}

export async function createChainlinkRandomizer(
  user: SignerWithAddress
): Promise<IRandomizerInfo<RandomizerChainlink>> {
  const VRFCoordinatorV2Mock = await ethers.getContractFactory(
    "VRFCoordinatorV2Mock"
  );
  const vrfMock = await VRFCoordinatorV2Mock.connect(user).deploy(0, 0);
  await vrfMock.deployed();
  const transaction = await vrfMock.createSubscription();
  const transactionReceipt = await transaction.wait(1);
  const subscriptionId = ethers.BigNumber.from(
    // @ts-ignore
    transactionReceipt.events[0].topics[1]
  );

  const Randomizer = await ethers.getContractFactory("RandomizerChainlink");
  const randomizer: RandomizerChainlink = (await Randomizer.connect(
    user
  ).deploy(subscriptionId, vrfMock.address)) as RandomizerChainlink;
  await randomizer.deployed();

  let wait: boolean;
  async function onInterval() {
    if (wait) return;

    const requestId = await randomizer.s_requestId();
    if (requestId.toNumber()) {
      wait = true;
      const tx = await vrfMock.fulfillRandomWords(
        requestId,
        randomizer.address
      );
      await tx.wait();
      wait = false;
    }
  }
  const intervalId = setInterval(onInterval, 1000);

  return {
    randomizer,
    address: randomizer.address,
    setLottery(lotteryAddress: string) {
      return randomizer.functions.setLottery(lotteryAddress);
    },
    destroy() {
      clearInterval(intervalId);
    },
  };
}

export async function createTestRandomizer(
  user: SignerWithAddress
): Promise<IRandomizerInfo<RandomizerCustom>> {
  const Randomizer = await ethers.getContractFactory("RandomizerCustom");
  const randomizer: RandomizerCustom =
    (await Randomizer.deploy()) as RandomizerCustom;
  await randomizer.deployed();

  async function onInterval() {
    if (await randomizer.needRandom()) {
      await randomizer.connect(user).sendIfNeed();
    }
  }
  const intervalId = setInterval(onInterval, 100);

  return {
    randomizer,
    address: randomizer.address,
    setLottery(lotteryAddress: string) {
      return randomizer.functions.setLottery(lotteryAddress);
    },
    destroy() {
      clearInterval(intervalId);
    },
  };
}
