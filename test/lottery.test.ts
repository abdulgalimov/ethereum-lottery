
import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "ethers";
import {LotteryTest, RandomizerTest} from "../typechain-types";
import {createRandomizer, destroyRandomizer} from "./utils/randomizer";
import {
    createSettings,
    defaultBalance,
    defaultSettings,
    emptySettings,
    getMinValue,
    Settings,
    UpdateSettings,
    expectBalanceChange,
    expectEvent, toWei
} from "./utils/utils";

describe('Lottery', function () {
    this.timeout(60000);

    let owner: SignerWithAddress;
    let signers: SignerWithAddress[];
    let randomizerUser: SignerWithAddress;
    let lottery: LotteryTest;
    let randomizer: RandomizerTest;

    let userIndex = 0;
    function getUser(): SignerWithAddress {
        userIndex++;
        if (userIndex >= signers.length) userIndex = 0;
        return signers[userIndex];
    }

    async function _getSettings(getNew?:boolean): Promise<Settings> {
        const settings = getNew ? (await lottery.newSettings()) : (await lottery.settings());
        return {
            randomValue: settings.randomValue.toNumber(),
            minChance: settings.minChance.toNumber(),
            maxChance: settings.maxChance.toNumber(),
            winRate: settings.winRate.toNumber(),
            feeRate: settings.feeRate.toNumber(),
            minRate: settings.minRate.toNumber(),
            randomizer: settings.randomizer.toString(),
        }
    }

    function _addBalance(wait?:boolean, value?: BigNumber, otherUser?: boolean) {
        const options = {
            value: value || defaultBalance
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
        await _setTestSettings({minChance: 1000, maxChance: 1001});
    }

    function _attempt(wait?: boolean, value?: number, user?: SignerWithAddress) {
        const options = {
            value: BigNumber.from(value == undefined ? 1000 : value)
        };
        const txPromise = lottery.connect(user||getUser()).attempt(options);
        if (wait) {
            return txPromise.then((tx: any) => tx.wait());
        } else {
            return txPromise;
        }
    }

    async function _readEvent(name: string): Promise<any> {
        return new Promise(resolve => {
            lottery.once(name, function() {
                resolve(arguments[arguments.length - 1]);
            });
        })
    }

    beforeEach(async () => {
        signers = await ethers.getSigners();
        owner = signers.shift() as SignerWithAddress;
        randomizerUser = signers.shift() as SignerWithAddress;

        randomizer = await createRandomizer(randomizerUser);
        defaultSettings.randomizer = randomizer.address;

        const Lottery = await ethers.getContractFactory('LotteryTest');
        lottery = await Lottery.deploy(defaultSettings);
        await lottery.deployed()

        await randomizer.setLottery(lottery.address);
    })

    afterEach(() => {
        lottery.removeAllListeners();
        destroyRandomizer();
    });

    it('[ok] create', async function () {
        expect(await _getSettings()).to.deep.equal(defaultSettings);

        expect(await _getSettings(true)).to.deep.equal(emptySettings);

        expect(await lottery.totalCount()).to.eq(0);
        expect(await lottery.getBalance()).to.eq(0);
    })

    it('[ok] addBalance', async function() {
        await expect(
            _addBalance(false)
        )
            .to.emit(lottery, 'Add')
            .withArgs(1000);

        expect(await lottery.totalCount()).to.eq(0);
        expect(await lottery.getBalance()).to.eq(1000);
    })

    it('[fail] addBalance', async function() {
        await expect(
            _addBalance(false, BigNumber.from(0))
        ).to.revertedWith('zero value');

        await expect(
            _addBalance(false, BigNumber.from(1000), true)
        ).to.revertedWith('Owner only');

        expect(await lottery.totalCount()).to.eq(0);
        expect(await lottery.getBalance()).to.eq(0);
    })

    it('[ok] settings', async function() {
        const newSettings: Settings = createSettings({
            randomValue: 2000,
            minChance: 10,
            maxChance: 200,
            winRate: 50,
            feeRate: 70,
            minRate: 30,
        });
        await expect(
            lottery.setSettings(newSettings)
        )
        const event = await _readEvent('SettingsChanged');
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
        await _readEvent('Try');

        await _setMaxChance();
        await _attempt(true, 1000000);
        await _readEvent('Try');

        expect(await _getSettings()).to.deep.equal(newSettings);
        expect(await _getSettings(true)).to.deep.equal(emptySettings);
    })

    it('gas used', async function() {
        const user = signers[1];
        const b1 = await user.getBalance();
        const tx = await lottery.connect(user).testUpdate();
        const res = await tx.wait();
        const b2 = await user.getBalance();

        expect(b1).to.eq(b2.add(res.cumulativeGasUsed.mul(res.effectiveGasPrice)));
    })

    it('[ok] attempt', async function() {
        const startBalance = 1000;
        await _addBalance(true, BigNumber.from(startBalance));

        const attemptValue = 10001
        await _attempt(true, attemptValue);
        const tryEvent = await _readEvent('Try');
        expectEvent(tryEvent.args, {
            tryAmount: attemptValue,
            count: 1,
            totalAmount: attemptValue + startBalance,
        })

        expect(await lottery.totalCount()).to.eq(1);
        expect(await lottery.getBalance()).to.eq(attemptValue + startBalance);
    })

    it('[fail] attempt - no owner', async function() {
        await _addBalance(true, BigNumber.from(200));
        expect(_attempt(false, 100, owner)).to.revertedWith('no owner');

        expect(await lottery.totalCount()).to.eq(0);
        expect(await lottery.getBalance()).to.eq(200);
    })

    it('[fail] attempt - empty balance', async function() {
        expect(_attempt(false, 100)).to.revertedWith('empty balance');

        expect(await lottery.totalCount()).to.eq(0);
        expect(await lottery.getBalance()).to.eq(0);
    })

    it('[fail] attempt - no zero money', async function() {
        await expect(
            _attempt(false, 0)
        ).to.revertedWith('no zero money');

        expect(await lottery.totalCount()).to.eq(0);
    })

    it('[fail] attempt - small bet', async function() {
        await _addBalance(true)

        const balance = await lottery.getBalance();
        const minValue = balance.toNumber() * defaultSettings.minRate / 100;

        await _attempt(true, minValue);
        await _readEvent('Try');
        expect(await lottery.totalCount()).to.eq(1);

        await expect(
            _attempt(false, minValue-1)
        ).to.revertedWith('small bet');

        expect(await lottery.totalCount()).to.eq(1);
    })

    it('[ok] attempt - maxChance', async function() {
        await _addBalance(true)

        await _attempt(true, getMinValue());
        await _readEvent('Try');
        await _attempt(true, 10000);
        await _readEvent('Try');
    })

    it('[ok] stopped', async function() {
        await _addBalance(true);
        await _setTestSettings({minChance: 0, maxChance: 0});

        await _attempt(true, 100);
        await _readEvent('Try');

        await _attempt(true, 200);
        await _readEvent('Try');

        await (await lottery.setStop(true)).wait();
        expect(await lottery.stopped()).to.eq(true);

        await _setMaxChance();

        await expect(
            _attempt(false, 300)
        );
        await _readEvent('Win');
        expect(await lottery.getBalance()).to.eq(0);

        await expect(
            _attempt(false, 300)
        ).to.revertedWith('empty balance');

        await _addBalance(true);
        await (await lottery.setStop(false)).wait();
        await expect(
            _attempt(false, 300)
        );
        await _readEvent('Try');
    })

    it('[ok] win', async function() {
        const winnerUser = signers[1];

        const addValue1 = 1000;
        await _addBalance(true);

        await _setTestSettings({minChance: 0, maxChance: 0});

        const addValue2 = 2000;
        await _attempt(true, addValue2);
        await _readEvent('Try');

        await _setMaxChance();

        const attemptValue = 500;
        const { winRate, feeRate } = defaultSettings;

        const totalValue = addValue1 + addValue2 + attemptValue;
        const winValue = Math.floor(totalValue * winRate / 100);
        const feeValue = totalValue - winValue;
        const ownerValue = Math.floor((feeValue * feeRate) / 100);
        const remainderValue = feeValue - ownerValue;

        const receipt = await _attempt(true, attemptValue, winnerUser);

        const winEvent = await _readEvent('Win');

        await expectBalanceChange(receipt, winnerUser, winValue-attemptValue);
        await expectBalanceChange(receipt, owner, ownerValue);
        expectEvent(winEvent.args, {
            winAmount: winValue,
            count: 2,
        })

        expect(await lottery.totalCount()).to.eq(0);
        expect(await lottery.getBalance()).to.eq(remainderValue);
    })
})

describe('alg', function () {
    console.log('test alg');
    let owner = 0;
    const users = new Array(10).map(item => toWei(100));
    function getRandomUser() {
        const index = Math.floor(Math.random()*users.length);
        return users[index];
    }

    function tryGame(value: number) {
        const rnd = Math.floor(Math.random()*defaultSettings.randomValue);
    }
});
