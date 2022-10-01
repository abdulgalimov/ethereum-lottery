import { ethers } from "hardhat";
import { expect } from "chai";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "ethers";
import { LotteryTest } from "../../typechain-types";
import { Settings } from "../../app/types";

export interface UpdateSettings {
  randomValue?: number;
  minChance?: number;
  maxChance?: number;
  winRate?: number;
  feeRate?: number;
  minBet?: number;
  randomizer?: string;
}

export const defaultSettings: Settings = {
  randomValue: 10000,
  minChance: 10,
  maxChance: 1000,
  winRate: 90,
  feeRate: 90,
  minBet: 1,
  randomizer: "",
};
export const emptySettings: Settings = {
  randomValue: 0,
  minChance: 0,
  maxChance: 0,
  winRate: 0,
  feeRate: 0,
  minBet: 0,
  randomizer: "",
};

type SettingsKey = keyof Settings;
export const defaultBalance = 1000;
export function getMinValue(value?: number) {
  return Math.floor(((value || defaultBalance) * defaultSettings.minBet) / 100);
}

export function createSettings(newValue?: UpdateSettings): Settings {
  const settings: any = {};
  Object.entries(defaultSettings).map(([k, value]) => {
    const key = k as SettingsKey;
    settings[key] = newValue && key in newValue ? newValue[key] : value;
  });
  return settings as Settings;
}

export function wait(time: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, time);
  });
}

export async function getBalanceDelta(
  receipt: any,
  signer: SignerWithAddress
): Promise<BigNumber> {
  const before = await signer.getBalance(receipt.blockNumber - 1);
  const current = await signer.getBalance();
  if (receipt.from === signer.address) {
    const gasValue = receipt.cumulativeGasUsed.mul(receipt.effectiveGasPrice);
    return current.add(gasValue).sub(before);
  } else {
    return current.sub(before);
  }
}

export async function expectBalanceChange(
  receipt: any,
  signer: SignerWithAddress,
  value: number | BigNumber | Array<number>
): Promise<void> {
  const delta = await getBalanceDelta(receipt, signer);
  if (typeof value === "number") {
    expect(delta).to.eq(value);
  } else if (Array.isArray(value)) {
    expect(delta).to.gte(value[0]).lte(value[1]);
  }
}

export function expectEvent(event: any, data: any) {
  Object.entries(data).forEach(([key, value]) => {
    expect(value).to.eq(
      event[key] instanceof BigNumber ? event[key].toNumber() : event[key]
    );
  });
}

export function toWei(eth: number): BigNumber {
  return BigNumber.from(eth).mul(BigNumber.from("1000000000000000000"));
}

export async function createLottery(
  randomizerAddress: string
): Promise<LotteryTest> {
  const LotteryTest = await ethers.getContractFactory("LotteryTest");
  const lottery = await LotteryTest.deploy(
    createSettings({
      randomizer: randomizerAddress,
    })
  );
  await lottery.deployed();
  return lottery;
}
