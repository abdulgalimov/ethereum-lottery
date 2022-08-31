require('dotenv').config();

const { GOERLI_API_URL, ALCHEMY_API_KEY, ALCHEMY_API_URL } = process.env;

const LOCALHOST_PROVIDER = 'ws://localhost:8545';

const GOERLI_PROVIDER = `wss://${GOERLI_API_URL}/${ALCHEMY_API_KEY}`;
const GOERLI_SCAN = `https://goerli.etherscan.io/tx/$hash`;

const MAINNET_PROVIDER = `wss://${ALCHEMY_API_URL}/${ALCHEMY_API_KEY}`;

export interface NetworkInfo {
    filename: string;
    providerUrl: string;
    scanUrl: string;
}

export default function getInfo(network: any): NetworkInfo {
    console.log('network', network);
    network = network || 'localhost';
    switch (network) {
        case 'localhost':
            return {
                filename: 'lottery-localhost.json',
                providerUrl: LOCALHOST_PROVIDER,
                scanUrl: '',
            }
        case 'goerli':
            return {
                filename: 'lottery-goerli.json',
                providerUrl: GOERLI_PROVIDER,
                scanUrl: GOERLI_SCAN,
            };
        case 'mainnet':
            return {
                filename: 'lottery-mainnet.json',
                providerUrl: MAINNET_PROVIDER,
                scanUrl: '',
            };
        default:
            console.log(`invalid network: "${network}", use --network=localhost | goerli | mainnet`);
            process.exit(1);
    }
}
