require('dotenv').config();

const { GOERLI_API_URL, ALCHEMY_API_KEY, ALCHEMY_API_URL } = process.env;

const LOCALHOST_PROVIDER = 'ws://localhost:8545';

const GOERLI_PROVIDER = `wss://${GOERLI_API_URL}/${ALCHEMY_API_KEY}`;
const GOERLI_SCAN = `https://goerli.etherscan.io/tx/$hash`;

const MAINNET_PROVIDER = `wss://${ALCHEMY_API_URL}/${ALCHEMY_API_KEY}`;

export enum NetworkType {
    localhost = 'localhost',
    goerli = 'goerli',
    mainnet = 'mainnet',
}

export interface NetworkInfo {
    type: NetworkType
    filename: string;
    providerUrl: string;
    scanUrl: string;
}

export default function getInfo(networkType: NetworkType | string | undefined): NetworkInfo {
    console.log('network', networkType);
    networkType = networkType || 'localhost';
    switch (networkType) {
        case NetworkType.localhost:
            return {
                type: networkType,
                filename: 'lottery-localhost.json',
                providerUrl: LOCALHOST_PROVIDER,
                scanUrl: '',
            }
        case NetworkType.goerli:
            return {
                type: networkType,
                filename: 'lottery-goerli.json',
                providerUrl: GOERLI_PROVIDER,
                scanUrl: GOERLI_SCAN,
            };
        case NetworkType.mainnet:
            return {
                type: networkType,
                filename: 'lottery-mainnet.json',
                providerUrl: MAINNET_PROVIDER,
                scanUrl: '',
            };
        default:
            console.log(`invalid network: "${networkType}", use --network=localhost | goerli | mainnet`);
            process.exit(1);
    }
}
