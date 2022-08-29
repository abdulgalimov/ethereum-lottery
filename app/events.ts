import Web3 from 'web3';
import networks from './networks';

function main() {
    console.log('[start dev:events]');
    const {npm_config_network, NETWORK} = process.env;
    const { providerUrl, filename } = networks(npm_config_network || NETWORK);

    const web3 = new Web3(providerUrl);
    const LotteryArtifacts = require('../artifacts/contracts/Lottery.sol/Lottery.json')
    const LotteryInfo = require(`../data/${filename}`);

    const lotteryContract = new web3.eth.Contract(
        LotteryArtifacts.abi,
        LotteryInfo.address,
    );
    lotteryContract.events.Add()
        .on('data', async function (event: any) {
            const {addAmount} = event.returnValues;
            console.log('[add]', addAmount);
        });

    lotteryContract.events.Try()
        .on('data', async function (event: any) {
            const {tryAmount, count} = event.returnValues;
            console.log('[try]', tryAmount, count);
        });

    lotteryContract.events.Win()
        .on('data', async function (event: any) {
            const {winAmount, count} = event.returnValues;
            console.log('[win]', winAmount, count);
        })

    lotteryContract.events.ChangedRates()
        .on('data', async function (event: any) {
            const {winRate, feeRate} = event.returnValues;
            console.log('[change rate]', winRate, feeRate);
        })

    lotteryContract.events.ChangedChance()
        .on('data', async function (event: any) {
            const {minChance, maxChance} = event.returnValues;
            console.log('[change chance]', minChance, maxChance);
        })

}

main();
