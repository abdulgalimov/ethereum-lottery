
import { itEach } from 'mocha-it-each';
import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "ethers";

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

    async function _setTestChance(value:number) {
        await (await lottery.setTestChance(value, value)).wait();
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
        expect(await lottery.owner()).to.eq(owner.address);
        expect(await lottery.randomValue()).to.eq(1000);
        expect(await lottery.minChance()).to.eq(1);
        expect(await lottery.maxChance()).to.eq(100);
        expect(await lottery.winRate()).to.eq(90);
        expect(await lottery.feeRate()).to.eq(90);
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
            _addBalance(false, BigNumber.from(1000), true)
        ).to.revertedWith('Owner only');

        expect(await lottery.totalCount()).to.eq(0);
        expect(await lottery.getBalance()).to.eq(0);
    })

    it('[ok] setRates', async function() {
        await expect(
            lottery.setRates(50, 70)
        )
            .to.emit(lottery, 'ChangedRates')
            .withArgs(50, 70);

        expect(await lottery.winRate()).to.eq(90);
        expect(await lottery.feeRate()).to.eq(90);
        expect(await lottery.newWinRate()).to.eq(50);
        expect(await lottery.newFeeRate()).to.eq(70);

        await _addBalance(true);
        await _setTestChance(1000);
        await _attempt(true);

        expect(await lottery.winRate()).to.eq(50);
        expect(await lottery.feeRate()).to.eq(70);
        expect(await lottery.newWinRate()).to.eq(0);
        expect(await lottery.newFeeRate()).to.eq(0);
    })

    it('[ok] setChance', async function() {
        await expect(
            lottery.setChance(10, 200)
        )
            .to.emit(lottery, 'ChangedChance')
            .withArgs(10, 200);

        expect(await lottery.minChance()).to.eq(1);
        expect(await lottery.maxChance()).to.eq(100);
        expect(await lottery.newMinChance()).to.eq(10);
        expect(await lottery.newMaxChance()).to.eq(200);

        await _addBalance(true);
        await _setTestChance(1000);
        await _attempt(true);

        expect(await lottery.minChance()).to.eq(10);
        expect(await lottery.maxChance()).to.eq(200);
        expect(await lottery.newMinChance()).to.eq(0);
        expect(await lottery.newMaxChance()).to.eq(0);
    })

    it('[ok] attempt', async function() {
        await _addBalance(true);


        await expect(
            lottery.connect(getUser()).attempt({
                value: BigNumber.from(100)
            }),
        )
            .to.emit(lottery, 'Try')
            .withArgs(100, 1);
        expect(await lottery.totalCount()).to.eq(1);
        expect(await lottery.getBalance()).to.eq(1100);
    })

    it('[fail] attempt - no owner', async function() {
        expect(_attempt(false, 100, owner)).to.revertedWith('no owner');

        expect(await lottery.totalCount()).to.eq(0);
        expect(await lottery.getBalance()).to.eq(0);
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
        await _setTestChance(0);
        await _attempt(true, 100);
        await _attempt(true, 200);

        await (await lottery.setStop(true)).wait();

        await _setTestChance(1000);

        await expect(
            _attempt(false, 300)
        ).to.emit(lottery, 'Win');

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

        await _setTestChance(0)
        const addValue2 = 2000;
        await _attempt(true, addValue2);

        await _setTestChance(1000)

        const attemptValue = 500;
        const winRate = await lottery.winRate();
        const feeRate = await lottery.feeRate();

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
                await _setTestChance(1000);
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
