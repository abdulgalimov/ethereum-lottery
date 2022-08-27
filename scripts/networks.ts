require('dotenv').config();

const { GOERLI_API_URL, ALCHEMY_API_KEY, ALCHEMY_API_URL } = process.env;

const LOCALHOST_PROVIDER = 'ws://localhost:8545';
const GOERLI_PROVIDER = `wss://${GOERLI_API_URL}/${ALCHEMY_API_KEY}`;
const MAINNET_PROVIDER = `wss://${ALCHEMY_API_URL}/${ALCHEMY_API_KEY}`;

export default function getInfo(network: any) {
    switch (network) {
        case 'localhost':
            return {
                filename: 'lottery-localhost.json',
                providerUrl: LOCALHOST_PROVIDER,
            }
        case 'goerli':
            return {
                filename: 'lottery-goerli.json',
                providerUrl: GOERLI_PROVIDER,
            };
        case 'mainnet':
            return {
                filename: 'lottery-mainnet.json',
                providerUrl: MAINNET_PROVIDER,
            };
        default:
            console.log(`invalid network: "${network}", use --network=localhost | goerli | mainnet`);
            process.exit(1);
    }
}
