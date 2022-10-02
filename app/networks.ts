import config from "./config";

const LOCALHOST_PROVIDER = "ws://localhost:8545";

export enum NetworkType {
  localhost = "localhost",
  goerli = "goerli",
  mainnet = "mainnet",
}

export interface DeployData {
  ownerAddress: string;
  ownerKey?: string;
  lotteryAddress: string;
  randomizerAddress: string;
  chainlink?: ChainLinkData;
}

export interface ChainLinkData {
  subscriptionId: number;
  vrfCoordinator: string;
  keyHash: string;
}

export interface NetworkInfo {
  type: NetworkType;
  filename: string;
  providerUrl: string;
  scanUrl: string;

  deployData: DeployData;
}

export default function getInfo(): NetworkInfo {
  const networkType = config.network;
  console.log("network", networkType);
  switch (networkType) {
    case NetworkType.localhost:
      const filename = "lottery-localhost.json";
      const LotteryInfo = require(`../data/${filename}`);
      return {
        type: networkType,
        filename,
        providerUrl: LOCALHOST_PROVIDER,
        scanUrl: "",
        deployData: {
          ownerAddress: LotteryInfo.owner,
          ownerKey: LotteryInfo.hardhatPrivateKey,
          lotteryAddress: LotteryInfo.lottery,
          randomizerAddress: LotteryInfo.randomizer,
        },
      };
    case NetworkType.goerli:
      return {
        type: networkType,
        filename: "lottery-goerli.json",
        providerUrl: config.goerli.alchemyApiUrl,
        scanUrl: config.goerli.scanUrl,
        deployData: {
          ownerAddress: config.goerli.ownerAddress,
          ownerKey: config.metamaskPrivateKey,
          lotteryAddress: config.goerli.lotteryAddress,
          randomizerAddress: config.goerli.randomizerAddress,
          chainlink: {
            subscriptionId: 1933,
            vrfCoordinator: "0x2Ca8E0C643bDe4C2E08ab1fA0da3401AdAD7734D",
            keyHash:
              "0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15",
          },
        },
      };
    case NetworkType.mainnet:
      return {
        type: networkType,
        filename: "lottery-mainnet.json",
        providerUrl: config.mainnet.alchemyApiUrl,
        scanUrl: "",
        deployData: {
          ownerAddress: config.mainnet.ownerAddress,
          lotteryAddress: config.mainnet.lotteryAddress,
          randomizerAddress: config.mainnet.randomizerAddress,
          chainlink: {
            subscriptionId: 400,
            vrfCoordinator: "0x271682DEB8C4E0901D1a1550aD2e64D568E69909",
            keyHash:
              "0x9fe0eebf5e446e3c998ec9bb19951541aee00bb90ea201ae456421a2ded86805",
          },
        },
      };
    default:
      console.log(
        `invalid network: "${networkType}", use --network=localhost | goerli | mainnet`
      );
      process.exit(1);
  }
}
