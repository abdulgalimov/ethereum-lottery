import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { RandomizerTest, RandomizerChainlink } from "../../typechain-types";

export interface IRandomizerInfo {
    address: string,
    setLottery(address: string): Promise<any>;
    destroy(): void;
}

export enum RandomizerType {
    TEST,
    CHAINLINK
}

export async function createRandomizer(type: RandomizerType, user: SignerWithAddress): Promise<IRandomizerInfo> {
    switch (type) {
        case RandomizerType.TEST:
            return createTestRandomizer(user);
        case RandomizerType.CHAINLINK:
            return createChainlinkRandomizer(user);
    }
    throw new Error('Invalid type');
}

async function createChainlinkRandomizer(user: SignerWithAddress): Promise<IRandomizerInfo> {
    const VRFCoordinatorV2Mock = await ethers.getContractFactory("VRFCoordinatorV2Mock");
    const vrfMock = await VRFCoordinatorV2Mock
        .connect(user)
        .deploy(0, 0);
    await vrfMock.deployed();
    const transaction = await vrfMock.createSubscription()
    const transactionReceipt = await transaction.wait(1)
    // @ts-ignore
    const subscriptionId = ethers.BigNumber.from(transactionReceipt.events[0].topics[1]);
    await vrfMock.fundSubscription(subscriptionId, '1000000000000000000');

    const Randomizer = await ethers.getContractFactory('RandomizerChainlink');
    const randomizer: RandomizerChainlink = await Randomizer
        .connect(user)
        .deploy(subscriptionId, vrfMock.address) as RandomizerChainlink;
    await randomizer.deployed()

    let wait: boolean;
    async function onInterval() {
        if (wait) return;

        const requestId = await randomizer.s_requestId();
        if (requestId.toNumber()) {
            wait = true;
            const tx = await vrfMock.fulfillRandomWords(requestId, randomizer.address);
            await tx.wait();
            wait = false;
        }
    }
    const intervalId = setInterval(onInterval, 1000);

    return {
        address: randomizer.address,
        setLottery(lotteryAddress: string) {
            return randomizer.functions.setLottery(lotteryAddress);
        },
        destroy() {
            clearInterval(intervalId);
        }
    };
}

async function createTestRandomizer(user: SignerWithAddress) {
    const Randomizer = await ethers.getContractFactory('RandomizerTest');
    const randomizer: RandomizerTest = await Randomizer.deploy() as RandomizerTest;
    await randomizer.deployed()

    async function onInterval() {
        if (await randomizer.needRandom()) {
            await randomizer.connect(user).sendIfNeed();
        }
    }
    const intervalId = setInterval(onInterval, 100);

    return {
        address: randomizer.address,
        setLottery(lotteryAddress: string) {
            return randomizer.functions.setLottery(lotteryAddress);
        },
        destroy() {
            clearInterval(intervalId);
        }
    };
}
