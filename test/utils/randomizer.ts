import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
  RandomizerChainlink,
  RandomizerCustomTest,
} from "../../typechain-types";

export interface IRandomizerInfo<T> {
  contract: T;
  address: string;
  setLottery(address: string): Promise<any>;
  pause(isPause: boolean): void;
  sendRandom(): Promise<any>;
  destroy(): void;
}

export async function createChainlinkRandomizer(
  user: SignerWithAddress,
  name?: string
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

  const Randomizer = await ethers.getContractFactory(
    name || "RandomizerChainlink"
  );
  const randomizer: RandomizerChainlink = (await Randomizer.connect(
    user
  ).deploy(
    subscriptionId,
    vrfMock.address,
    "0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15" // hardcode, any test hash
  )) as RandomizerChainlink;
  await randomizer.deployed();

  async function sendRandom() {
    const requestId = await randomizer.s_requestId();
    return vrfMock.fulfillRandomWords(requestId, randomizer.address);
  }

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
  let intervalId = setInterval(onInterval, 1000);

  return {
    contract: randomizer,
    address: randomizer.address,
    setLottery(lotteryAddress: string) {
      return randomizer.functions.setLottery(lotteryAddress);
    },
    sendRandom,
    pause(isPause: boolean) {
      if (isPause) {
        clearInterval(intervalId);
      } else {
        intervalId = setInterval(onInterval, 1000);
      }
    },
    destroy() {
      clearInterval(intervalId);
    },
  };
}

export async function createTestRandomizer(
  user: SignerWithAddress
): Promise<IRandomizerInfo<RandomizerCustomTest>> {
  const Randomizer = await ethers.getContractFactory("RandomizerCustomTest");
  const randomizer: RandomizerCustomTest =
    (await Randomizer.deploy()) as RandomizerCustomTest;
  await randomizer.deployed();

  async function sendRandom() {
    if (await randomizer.needRandom()) {
      await randomizer.connect(user).sendIfNeed();
    }
  }

  async function onInterval() {
    await sendRandom();
  }
  let intervalId = setInterval(onInterval, 100);

  return {
    contract: randomizer,
    address: randomizer.address,
    setLottery(lotteryAddress: string) {
      return randomizer.functions.setLottery(lotteryAddress);
    },
    sendRandom,
    pause(isPause: boolean) {
      if (isPause) {
        clearInterval(intervalId);
      } else {
        intervalId = setInterval(onInterval, 1000);
      }
    },
    destroy() {
      clearInterval(intervalId);
    },
  };
}
