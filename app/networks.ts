require("dotenv").config();

const {
  GOERLI_ALCHEMY_API_URL,
  GOERLI_SCAN,
  GOERLI_LOTTERY_ADDRESS,
  GOERLI_RANDOMIZER_ADDRESS,
  GOERLI_OWNER_ADDRESS,

  METAMASK_PRIVATE_KEY,

  MAINNET_OWNER_ADDRESS,
  MAINNET_ALCHEMY_API_URL,
  MAINNET_LOTTERY_ADDRESS,
  MAINNET_RANDOMIZER_ADDRESS,
} = process.env;

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
}

export interface NetworkInfo {
  type: NetworkType;
  filename: string;
  providerUrl: string;
  scanUrl: string;

  deployData: DeployData;
}

export default function getInfo(
  networkType: NetworkType | string | undefined
): NetworkInfo {
  console.log("network", networkType);
  networkType = networkType || "localhost";
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
          ownerKey: LotteryInfo.privateKey,
          lotteryAddress: LotteryInfo.lottery,
          randomizerAddress: LotteryInfo.randomizer,
        },
      };
    case NetworkType.goerli:
      return {
        type: networkType,
        filename: "lottery-goerli.json",
        providerUrl: GOERLI_ALCHEMY_API_URL as string,
        scanUrl: GOERLI_SCAN as string,
        deployData: {
          ownerAddress: GOERLI_OWNER_ADDRESS as string,
          ownerKey: METAMASK_PRIVATE_KEY,
          lotteryAddress: GOERLI_LOTTERY_ADDRESS as string,
          randomizerAddress: GOERLI_RANDOMIZER_ADDRESS as string,
        },
      };
    case NetworkType.mainnet:
      return {
        type: networkType,
        filename: "lottery-mainnet.json",
        providerUrl: MAINNET_ALCHEMY_API_URL as string,
        scanUrl: "",
        deployData: {
          ownerAddress: MAINNET_OWNER_ADDRESS as string,
          lotteryAddress: MAINNET_LOTTERY_ADDRESS as string,
          randomizerAddress: MAINNET_RANDOMIZER_ADDRESS as string,
        },
      };
    default:
      console.log(
        `invalid network: "${networkType}", use --network=localhost | goerli | mainnet`
      );
      process.exit(1);
  }
}
