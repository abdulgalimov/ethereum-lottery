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
      const baseDataPath = "../data";
      const filename = "lottery-localhost.json";
      const LotteryInfo = require(`${baseDataPath}/${filename}`);
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
