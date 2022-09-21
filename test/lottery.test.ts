import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "ethers";
import { LotteryTest, RandomizerChainlink } from "../typechain-types";
import { createChainlinkRandomizer, IRandomizerInfo } from "./utils/randomizer";
import {
  createSettings,
  defaultBalance,
  defaultSettings,
  emptySettings,
  expectBalanceChange,
  expectEvent,
  getMinValue,
  toWei,
  UpdateSettings,
} from "./utils/utils";
import { onlyOwnerMessage } from "./utils/constants";
import { Settings } from "../app/contract/types";

describe("Lottery", function () {
  this.timeout(60000);

  let owner: SignerWithAddress;
  let signers: SignerWithAddress[];
  let randomizerUser: SignerWithAddress;
  let lottery: LotteryTest;
  let randomizer: IRandomizerInfo<RandomizerChainlink>;

  let userIndex = 0;
  function getUser(): SignerWithAddress {
    userIndex++;
    if (userIndex >= signers.length) userIndex = 0;
    return signers[userIndex];
  }

  async function _getSettings(getNew?: boolean): Promise<Settings> {
    const settings = getNew
      ? await lottery.newSettings()
      : await lottery.settings();
    return {
      randomValue: settings.randomValue.toNumber(),
      minChance: settings.minChance.toNumber(),
      maxChance: settings.maxChance.toNumber(),
      winRate: settings.winRate.toNumber(),
      feeRate: settings.feeRate.toNumber(),
      minRate: settings.minRate.toNumber(),
      randomizer: settings.randomizer.toString(),
    };
  }

  function _addBalance(wait?: boolean, value?: number, otherUser?: boolean) {
    const options = {
      value: value !== undefined ? BigNumber.from(value) : defaultBalance,
    };
    const txPromise = otherUser
      ? lottery.connect(getUser()).addBalance(options)
      : lottery.addBalance(options);
    if (wait) {
      return txPromise.then((tx: any) => tx.wait());
    } else {
      return txPromise;
    }
  }

  async function _setTestSettings(update: UpdateSettings) {
    const settings = createSettings(update);
    await (await lottery.setTestSettings(settings)).wait();
  }

  async function _setMaxChance() {
    await _setTestSettings({
      minChance: defaultSettings.randomValue,
      maxChance: defaultSettings.randomValue + 1,
    });
  }

  function _attempt(wait?: boolean, value?: number, user?: SignerWithAddress) {
    const options = {
      value: BigNumber.from(value == undefined ? 1000 : value),
    };
    const txPromise = lottery.connect(user || getUser()).attempt(options);
    if (wait) {
      return txPromise.then((tx: any) => tx.wait());
    } else {
      return txPromise;
    }
  }

  async function _readEvent(name: string): Promise<any> {
    return new Promise((resolve) => {
      lottery.once(name, function () {
        resolve(arguments[arguments.length - 1]);
      });
    });
  }

  beforeEach(async () => {
    signers = await ethers.getSigners();
    owner = signers.shift() as SignerWithAddress;
    randomizerUser = signers.shift() as SignerWithAddress;

    randomizer = await createChainlinkRandomizer(randomizerUser);
    defaultSettings.randomizer = randomizer.address;

    const Lottery = await ethers.getContractFactory("LotteryTest");
    lottery = await Lottery.deploy(defaultSettings);
    await lottery.deployed();

    await randomizer.setLottery(lottery.address);
  });

  afterEach(() => {
    if (lottery) lottery.removeAllListeners();
    if (randomizer) randomizer.destroy();
  });

  it("[ok] create", async function () {
    expect(await _getSettings()).to.deep.equal(defaultSettings);

    expect(await _getSettings(true)).to.deep.equal(emptySettings);

    expect(await lottery.totalCount()).to.eq(0);
    expect(await lottery.getBalance()).to.eq(0);
    expect(await lottery.owner()).to.eq(owner.address);
    expect(await lottery.stopped()).to.eq(false);
  });

  it("[ok] create - Randomizer address is not contract", async function () {
    const Lottery = await ethers.getContractFactory("LotteryTest");
    await expect(
      Lottery.deploy(
        createSettings({
          randomizer: owner.address,
        })
      )
    ).revertedWith("Randomizer address is not contract");
  });

  it("[ok] setSettings - Randomizer address is not contract", async function () {
    await expect(
      lottery.setSettings(
        createSettings({
          randomizer: owner.address,
        })
      )
    ).revertedWith("Randomizer address is not contract");
  });

  it("[ok] addBalance", async function () {
    const addValue = 123;
    await expect(_addBalance(false, addValue))
      .to.emit(lottery, "Add")
      .withArgs(addValue);

    expect(await lottery.totalCount()).to.eq(0);
    expect(await lottery.getBalance()).to.eq(addValue);
  });

  it("[fail] addBalance", async function () {
    await expect(_addBalance(false, 0)).to.revertedWith("zero value");

    await expect(_addBalance(false, 1000, true)).to.revertedWith(
      onlyOwnerMessage
    );

    expect(await lottery.getBalance()).to.eq(0);
  });

  it("[ok] settings", async function () {
    const newSettings: Settings = createSettings({
      randomValue: 2000,
      minChance: 10,
      maxChance: 200,
      winRate: 50,
      feeRate: 70,
      minRate: 30,
    });
    await expect(lottery.setSettings(newSettings));
    const event = await _readEvent("SettingsChanged");
    expectEvent(event.args[0], newSettings);

    expect(await _getSettings()).to.deep.equal(defaultSettings);
    expect(await _getSettings(true)).to.deep.equal(newSettings);

    await _addBalance(true);
    /**
     * test line:
     * if (chance > settings.maxChance) {
     * in sol file
     */
    await _attempt(true, getMinValue());
    await _readEvent("TryFinish");

    await _setMaxChance();
    await _attempt(true, 1000000);
    await _readEvent("Win");

    expect(await _getSettings()).to.deep.equal(newSettings);
    expect(await _getSettings(true)).to.deep.equal(emptySettings);
    expect(await lottery.totalCount()).to.eq(0);
  });

  it("gas used", async function () {
    const user = signers[1];
    const b1 = await user.getBalance();
    const tx = await lottery.connect(user).testUpdate();
    const res = await tx.wait();
    const b2 = await user.getBalance();

    expect(b1).to.eq(b2.add(res.cumulativeGasUsed.mul(res.effectiveGasPrice)));
  });

  it("[ok] attempt", async function () {
    const startBalance = 1000;
    await _addBalance(true, startBalance);
    await _setTestSettings({
      minChance: 0,
      maxChance: 0,
    });

    let totalCount = 0;
    let totalValue = 0;
    for (let i = 0; i < 10; i++) {
      const attemptValue = 10000 + i * 10;

      totalCount++;
      totalValue += attemptValue;

      await _attempt(true, attemptValue);
      const tryEvent = await _readEvent("TryFinish");
      expectEvent(tryEvent.args, {
        tryAmount: attemptValue,
        count: totalCount,
        totalAmount: startBalance + totalValue,
        isWin: false,
      });
    }

    expect(await lottery.totalCount()).to.eq(totalCount);
    expect(await lottery.getBalance()).to.eq(startBalance + totalValue);
  });

  it("[ok] attempt - receive", async function () {
    await _addBalance(true, 200);
    const user = getUser();
    await (
      await user.sendTransaction({
        to: lottery.address,
        value: 300,
      })
    ).wait();
    await _readEvent("TryFinish");

    expect(await lottery.totalCount()).to.eq(1);
    expect(await lottery.getBalance()).to.eq(500);
  });

  it("[fail] attempt - no owner", async function () {
    await _addBalance(true, 200);
    expect(_attempt(false, 100, owner)).to.revertedWith("no owner");

    expect(await lottery.totalCount()).to.eq(0);
    expect(await lottery.getBalance()).to.eq(200);
  });

  it("[fail] attempt - empty balance", async function () {
    expect(_attempt(false, 100)).to.revertedWith("empty balance");

    expect(await lottery.totalCount()).to.eq(0);
    expect(await lottery.getBalance()).to.eq(0);
  });

  it("[fail] attempt - no zero money", async function () {
    await _addBalance(true, 200);

    await expect(_attempt(false, 0)).to.revertedWith("no zero money");

    expect(await lottery.totalCount()).to.eq(0);
    expect(await lottery.getBalance()).to.eq(200);
  });

  it("[fail] attempt - small bet", async function () {
    const startBalance = 1000;
    await _addBalance(true, startBalance);

    const balance = await lottery.getBalance();
    const minValue = Math.floor(
      (balance.toNumber() * defaultSettings.minRate) / 100
    );

    await _attempt(true, minValue);
    await _readEvent("TryFinish");
    expect(await lottery.totalCount()).to.eq(1);
    expect(await lottery.getBalance()).to.eq(startBalance + minValue);

    await expect(_attempt(false, minValue - 1)).to.revertedWith("small bet");

    expect(await lottery.totalCount()).to.eq(1);
    expect(await lottery.getBalance()).to.eq(startBalance + minValue);
  });

  it("[ok] attempt - maxChance", async function () {
    await _addBalance(true);

    await _attempt(true, getMinValue());
    await _readEvent("TryFinish");
    await _attempt(true, 10000);
    await _readEvent("TryFinish");
  });

  it("[ok] attempt - draw in progress", async function () {
    await _addBalance(true, 200);
    randomizer.pause(true);
    await _attempt(true, 100);
    expect(await lottery.totalCount()).to.eq(1);

    await expect(_attempt(false, 500)).revertedWith("draw in progress");

    expect(await lottery.totalCount()).to.eq(1);
    expect(await lottery.getBalance()).to.eq(300);
  });

  it("[ok] attempt - invalid call randomizer", async function () {
    const Lottery = await ethers.getContractFactory("LotteryTest");
    const lotteryLocal = await Lottery.deploy(
      createSettings({
        randomizer: lottery.address,
      })
    );
    await lotteryLocal.deployed();

    await (
      await lotteryLocal.addBalance({
        value: 200,
      })
    ).wait();

    await expect(
      lotteryLocal.connect(getUser()).attempt({
        value: 500,
      })
    ).revertedWith("invalid call randomizer");

    expect(await lotteryLocal.totalCount()).to.eq(0);
    expect(await lotteryLocal.getBalance()).to.eq(200);
  });

  it("[ok] receiveRandom - randomizer only", async function () {
    await expect(lottery.receiveRandom(100)).revertedWith("randomizer only");
  });

  it("[ok] stopped", async function () {
    await _addBalance(true);
    await _setTestSettings({ minChance: 0, maxChance: 0 });

    await _attempt(true, 100);
    await _readEvent("TryFinish");

    await _attempt(true, 200);
    await _readEvent("TryFinish");

    await (await lottery.setStop(true)).wait();
    expect(await lottery.stopped()).to.eq(true);

    await _setMaxChance();

    await expect(_attempt(false, 300));
    await _readEvent("Win");
    expect(await lottery.getBalance()).to.eq(0);
    expect(await lottery.stopped()).to.eq(true);

    await expect(_attempt(false, 300)).to.revertedWith("empty balance");
    await expect(_addBalance()).to.revertedWith("is stopped");

    await (await lottery.setStop(false)).wait();
    expect(await lottery.stopped()).to.eq(false);
    await _addBalance(true);
    await expect(_attempt(false, 300));
    await _readEvent("TryFinish");
  });

  it("[ok] win", async function () {
    const winnerUser = signers[1];

    const addValue1 = 1000;
    await _addBalance(true, addValue1);

    await _setTestSettings({ minChance: 0, maxChance: 0 });

    const addValue2 = 2000;
    await _attempt(true, addValue2);
    await _readEvent("TryFinish");

    await _setMaxChance();

    const attemptValue = 500;
    const { winRate, feeRate } = defaultSettings;

    const totalValue = addValue1 + addValue2 + attemptValue;
    const winValue = Math.floor((totalValue * winRate) / 100);
    const feeValue = totalValue - winValue;
    const ownerValue = Math.floor((feeValue * feeRate) / 100);
    const remainderValue = feeValue - ownerValue;

    const receipt = await _attempt(true, attemptValue, winnerUser);

    const winEvent = await _readEvent("Win");

    await expectBalanceChange(receipt, winnerUser, winValue - attemptValue);
    await expectBalanceChange(receipt, owner, ownerValue);
    await expectBalanceChange(
      receipt,
      randomizerUser,
      [-100640000805120, -102718]
    );
    expectEvent(winEvent.args, {
      winAmount: winValue,
      count: 2,
    });

    expect(await lottery.totalCount()).to.eq(0);
    expect(await lottery.getBalance()).to.eq(remainderValue);
  });
});

describe.skip("test algorithm", function () {
  const settings = defaultSettings;
  let ownerBalance = BigNumber.from(0);
  let lotteryBalance = ethers.utils.parseEther("0.1");
  const users: Array<BigNumber> = [];
  const maxValue = ethers.utils.parseEther("0.1");
  for (let i = 0; i < 1000; i++) users.push(toWei(2));

  function getRandomUser() {
    return Math.floor(Math.random() * users.length);
  }
  function getValue() {
    const step = 1000000;
    const k = 1 + Math.random() * 5 * step;
    const minRate = BigNumber.from(Math.floor(settings.minRate * k));
    const value = lotteryBalance.mul(minRate).div(BigNumber.from(100 * step));
    if (value.lt(maxValue)) {
      return value;
    } else {
      return maxValue;
    }
  }

  function tryGame(
    gameIndex: number,
    userIndex: number,
    currentValue: BigNumber
  ) {
    // console.log('----- tryGame', userIndex, ethers.utils.formatEther(currentValue));
    lotteryBalance = lotteryBalance.add(currentValue);
    const totalBalance = lotteryBalance;
    const beforeBalance = lotteryBalance.sub(currentValue);

    const rnd = Math.floor(Math.random() * settings.randomValue);
    let chance =
      settings.minChance +
      currentValue
        .mul(settings.maxChance - settings.minChance)
        .div(beforeBalance)
        .toNumber();

    if (chance > settings.maxChance) {
      chance = settings.maxChance;
    }
    if (rnd <= chance) {
      const winAmount = totalBalance.mul(settings.winRate).div(100);
      const feeValue = totalBalance.sub(winAmount);
      const ownerValue = feeValue.mul(settings.feeRate).div(100);

      users[userIndex] = users[userIndex].add(BigNumber.from(winAmount));
      ownerBalance = ownerBalance.add(BigNumber.from(ownerValue));
      lotteryBalance = lotteryBalance.sub(winAmount).sub(ownerValue);
      console.log(
        "win",
        `[${gameIndex}]`,
        ethers.utils.formatEther(winAmount),
        ethers.utils.formatEther(lotteryBalance),
        ethers.utils.formatEther(currentValue)
      );
      return true;
    } else {
      // console.log('try', `[${gameIndex}]`, ethers.utils.formatEther(lotteryBalance));
    }
    return false;
  }

  it("should", function () {
    let gameIndex = 0;
    let offUsersCount = 0;
    let winCount = 0;
    for (let i = 0; i < 10000; i++) {
      const user = getRandomUser();
      const value = getValue();
      users[user] = users[user].sub(value);
      const isWin = tryGame(++gameIndex, user, getValue());
      if (isWin) {
        winCount++;
        gameIndex = 0;
      } else if (users[user].lt(0)) {
        offUsersCount++;
        users.splice(user, 1);
      }
    }
    console.log("winCount", winCount);
    console.log("offUsersCount", offUsersCount);
    console.log("lottery", ethers.utils.formatEther(lotteryBalance));

    const bonus = lotteryBalance.mul(100 - settings.winRate).div(100);
    console.log(
      "owner",
      ethers.utils.formatEther(ownerBalance),
      `(+${ethers.utils.formatEther(bonus)})`
    );
  });
});
