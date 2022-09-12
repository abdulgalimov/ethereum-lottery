import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { RandomizerTest } from "../../typechain-types";

let user: SignerWithAddress;
let randomizer: RandomizerTest;

let intervalId: any;
export async function createRandomizer(_user: SignerWithAddress): Promise<RandomizerTest> {
    user = _user;
    const Randomizer = await ethers.getContractFactory('RandomizerTest');
    randomizer = await Randomizer.deploy();
    await randomizer.deployed()
    intervalId = setInterval(onInterval, 100);
    return randomizer;
}

export function destroyRandomizer() {
    clearInterval(intervalId);
}

async function onInterval() {
    if (await randomizer.needRandom()) {
        await randomizer.connect(user).sendIfNeed();
    }
}
