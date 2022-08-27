import Web3 from 'web3';
import networks from './networks';

function main() {
    const {npm_config_network} = process.env;
    const { providerUrl, filename } = networks(npm_config_network);

    const web3 = new Web3(providerUrl);
    const LotteryArtifacts = require('../artifacts/contracts/Lottery.sol/Lottery.json')
    const LotteryInfo = require(`../data/${filename}`);

    const lotteryContract = new web3.eth.Contract(
        LotteryArtifacts.abi,
        LotteryInfo.address,
    );
    lotteryContract.events.Try()
        .on('data', async function (event: any) {
            const {tryAmount, rnd, chance} = event.returnValues;
            console.log('[try]', tryAmount, rnd, chance);
        })
        .on('error', console.error);

    lotteryContract.events.Win()
        .on('data', async function (event: any) {
            const {winAmount, count} = event.returnValues;
            console.log('[win]', winAmount, count);
        })
        .on('error', console.error);

}

main();
