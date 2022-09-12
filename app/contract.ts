import Web3 from 'web3';
import {NetworkInfo} from "./networks";

type Callback = (name: string, ...args: any[]) => {};

export async function init(network: NetworkInfo, callback: Callback) {
    const { providerUrl, filename } = network;

    const web3 = new Web3(providerUrl);
    const LotteryArtifacts = require('../artifacts/contracts/Lottery.sol/Lottery.json')
    const LotteryInfo = require(`../data/${filename}`);

    const lotteryContract = new web3.eth.Contract(
        LotteryArtifacts.abi,
        LotteryInfo.address,
    );
    lotteryContract.events.Add()
        .on('data', async function (event: any) {
            const { addAmount } = event.returnValues;
            callback('add', addAmount);
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
