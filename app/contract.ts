import Web3 from 'web3';
import {NetworkInfo, NetworkType} from "./networks";

type Callback = (name: string, ...args: any[]) => {};

let web3: Web3;
let callback: Callback;
let ownerAddress: string;
let lotteryAddress: string;
let randomizerAddress: string;
export async function init(_network: NetworkInfo, _callback: Callback) {
    callback = _callback;

    const { type, providerUrl, filename } = _network;

    web3 = new Web3(providerUrl);

    const LotteryInfo = require(`../data/${filename}`);
    ownerAddress = LotteryInfo.owner;
    lotteryAddress = LotteryInfo.lottery;
    randomizerAddress = LotteryInfo.randomizer;

    connectToLottery();
    if (type === NetworkType.localhost) {
        connectToRandomizer();
    }
}


function connectToLottery() {
    const LotteryArtifacts = require('../artifacts/contracts/Lottery.sol/Lottery.json')

    const lotteryContract = new web3.eth.Contract(
        LotteryArtifacts.abi,
        lotteryAddress,
    );
    lotteryContract.events.Add()
        .on('data', async function (event: any) {
            const { addAmount } = event.returnValues;
            callback('add', addAmount);
            console.log('add', addAmount);
        });

    lotteryContract.events.Try()
        .on('data', async function (event: any) {
            const { tryAmount, count, totalAmount, isWin } = event.returnValues;
            callback('try', tryAmount, count, totalAmount, event.transactionHash, isWin);
        });

    lotteryContract.events.Win()
        .on('data', async function (event: any) {
            const { winAmount, count } = event.returnValues;
            callback('win', winAmount, count, event.transactionHash);
        })

    lotteryContract.events.SettingsChanged()
        .on('data', async function (event: any) {
            const { settings } = event.returnValues;
            console.log('[change settings]', settings);
        })
}


function connectToRandomizer() {
    const RandomizerArtifacts = require('../artifacts/contracts/RandomizerTest.sol/RandomizerTest.json')

    const randomizerContract = new web3.eth.Contract(
        RandomizerArtifacts.abi,
        randomizerAddress,
    );
    async function sendToRandomizer() {
        const options = {
            from: ownerAddress
        };
        const need = await (await randomizerContract.methods.needRandom()).call(options);
        if (need) {
            const res = await randomizerContract.methods.sendIfNeed();
            await res.send(options);
        }
    }
    setInterval(sendToRandomizer, 1000)
}
