
import { itEach } from 'mocha-it-each';
import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "ethers";

interface Settings {
    randomValue: number;
    minChance: number;
    maxChance: number;
    winRate: number;
    feeRate: number;
}
interface UpdateSettings {
    randomValue?: number;
    minChance?: number;
    maxChance?: number;
    winRate?: number;
    feeRate?: number;
}

const defaultSettings: Settings = {
    randomValue: 1000,
    minChance: 1,
    maxChance: 100,
    winRate: 90,
    feeRate: 90,
}
const emptySettings: Settings = {
    randomValue: 0,
    minChance: 0,
    maxChance: 0,
    winRate: 0,
    feeRate: 0,
}
type SettingsKey = keyof Settings;

function createSettings(newValue?: UpdateSettings): Settings {
    const settings: any = {};
    Object.entries(defaultSettings).map(([k, value]) => {
        const key = k as SettingsKey;
        settings[key] = newValue && key in newValue ? newValue[key] : value;
    })
    return settings as Settings;
}

describe('Lottery', function () {
    this.timeout(60000);

    let owner: SignerWithAddress;
    let signers: SignerWithAddress[];
    let lottery: any;
    let totalWin = BigNumber.from(0);
    let totalSend = BigNumber.from(0);

    function getUser(): SignerWithAddress {
        const index = Math.floor(Math.random() * signers.length);
        return signers[index];
    }

    async function _getSettings(getNew?:boolean): Promise<Settings> {
        const settings = getNew ? (await lottery.newSettings()) : (await lottery.settings());
        return {
            randomValue: settings.randomValue.toNumber(),
            minChance: settings.minChance.toNumber(),
            maxChance: settings.maxChance.toNumber(),
            winRate: settings.winRate.toNumber(),
            feeRate: settings.feeRate.toNumber(),
        }
    }

    function _addBalance(wait?:boolean, value?: BigNumber, otherUser?: boolean) {
        const options = {
            value: value || 1000
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

    async function attemptRandom(): Promise<boolean> {
        const min = 0.0001;
        const max = 0.001;
        const valueEth = min + Math.random()*(max-min);
        const valueWai = BigNumber.from(Math.floor(valueEth * (10**18)));
        totalSend = totalSend.add(valueWai);
        const tx1 = await lottery.connect(getUser()).attempt({
            value: valueWai,
        });
        const res = await tx1.wait();
        if (res.events.length > 1) {
            const {winAmount} = res.events[1].args;
            totalWin = totalWin.add(winAmount);
            return true;
        }

        return false;
    }

    beforeEach(async () => {
        signers = await ethers.getSigners();
        owner = signers.shift() as SignerWithAddress;

        const Lottery = await ethers.getContractFactory('LotteryTest');
        lottery = await Lottery.deploy();
        await lottery.deployed()
    })

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
            winRate: 50,
            feeRate: 70,
            randomValue: 2000,
            minChance: 10,
            maxChance: 200,
        });
        await expect(
            lottery.setSettings(newSettings)
        )
            .to.emit(lottery, 'SettingsChanged');
        expect(await _getSettings()).to.deep.equal(defaultSettings);
        expect(await _getSettings(true)).to.deep.equal(newSettings);

        await _addBalance(true);
        /**
         * test line:
         * if (chance > settings.maxChance) {
         * in sol file
         */
        await _attempt(true, 1);
        await _setMaxChance();
        await _attempt(true, 1000000);

        expect(await _getSettings()).to.deep.equal(newSettings);
        expect(await _getSettings(true)).to.deep.equal(emptySettings);
    })

    it('[ok] attempt', async function() {
        const startBalance = 1000;
        await _addBalance(true, BigNumber.from(startBalance));

        const attemptValue = 10000
        await expect(
            lottery.connect(getUser()).attempt({
                value: BigNumber.from(attemptValue)
            }),
        )
            .to.emit(lottery, 'Try')
            .withArgs(attemptValue, 1, attemptValue + startBalance);
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
    })

    it('[ok] attempt - maxChance', async function() {
        await _addBalance(true)

        await _attempt(true, 1);
        await _attempt(true, 10000);
    })

    it('[ok] stopped', async function() {
        await _addBalance(true);
        await _setTestSettings({minChance: 0, maxChance: 0});
        await _attempt(true, 100);
        await _attempt(true, 200);

        await (await lottery.setStop(true)).wait();
        expect(await lottery.stopped()).to.eq(true);

        await _setMaxChance();

        await expect(
            _attempt(false, 300)
        ).to.emit(lottery, 'Win');
        expect(await lottery.getBalance()).to.eq(0);

        await expect(
            _attempt(false, 300)
        ).to.revertedWith('empty balance');

        await _addBalance(true);
        await (await lottery.setStop(false)).wait();
        await expect(
            _attempt(false, 300)
        ).to.emit(lottery, 'Try');
    })

    it('[ok] win', async function() {
        const addValue1 = 1000;
        await _addBalance(true);

        await _setTestSettings({minChance: 0, maxChance: 0});
        const addValue2 = 2000;
        await _attempt(true, addValue2);

        await _setMaxChance();

        const attemptValue = 500;
        const { winRate, feeRate } = defaultSettings;

        const totalValue = addValue1 + addValue2 + attemptValue;
        const winValue = Math.floor(totalValue * winRate / 100);
        const feeValue = totalValue - winValue;
        const ownerValue = Math.floor((feeValue * feeRate) / 100);
        const remainderValue = feeValue - ownerValue;

        const winnerUser = signers[1];
        await expect(
            _attempt(false, attemptValue, winnerUser)
        )
            .to.changeEtherBalances(
                [owner, winnerUser],
                [ownerValue, winValue-attemptValue]
            )
            .to.emit(lottery, 'Win').withArgs(winValue, 2)

        expect(await lottery.totalCount()).to.eq(0);
        expect(await lottery.getBalance()).to.eq(remainderValue);
    })

    itEach('[ok] admin win [${value}]', [1, 2, 3, 4, 5], async function(value: any) {
        totalWin = BigNumber.from(0);
        const addStart = BigNumber.from(''+Math.floor(0.01 * (10**18)));
        await _addBalance(true, addStart);

        const startBalance = await owner.getBalance();

        let winner: boolean = false;
        const maxCount = 1000;
        for (let i=0; i<maxCount; i++) {
            if (i === maxCount - 1) {
                await _setMaxChance();
            }
            winner = await attemptRandom();
        }
        const finishBalance = await owner.getBalance();
        const adminWin = finishBalance.sub(startBalance);
        expect(adminWin).to.gt(ethers.utils.parseEther('0.04'));
    })


    it.skip('test', async function() {
        this.timeout(60000);
        const addStart = BigNumber.from(''+Math.floor(0.01 * (10**18)));
        await lottery.addBalance({
            value: addStart,
        })

        let startBalance = await owner.getBalance();
        console.log('owner start', ethers.utils.formatEther(startBalance));

        let winner: boolean = false;
        for (let i=0; i<1000; i++) {
            winner = await attemptRandom();
        }
        console.log('---------- finish');
        const finishBalance = await owner.getBalance();
        const adminWin = finishBalance.sub(startBalance);
        console.log(
            'owner',
            ethers.utils.formatEther(adminWin)
        );
        console.log(
            'total win',
            ethers.utils.formatEther(totalWin),
        );

        const lotteryBalance = await lottery.getBalance();
        console.log(
            'lottery',
            ethers.utils.formatEther(lotteryBalance),
        );

        const sum = adminWin.add(totalWin).add(lotteryBalance);
        console.log(
            'sum',
            ethers.utils.formatEther(sum),
            ethers.utils.formatEther(totalSend),
        );
        console.log('---- users');
        for (let i=0; i<signers.length; i++) {
            const userBalance = await signers[i].getBalance();
            console.log('userBalance', ethers.utils.formatEther(userBalance));
        }
    })
})
