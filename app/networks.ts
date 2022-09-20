require("dotenv").config();

const { GOERLI_ALCHEMY_API_URL, GOERLI_SCAN, MAINNET_ALCHEMY_API_URL } =
  process.env;

const LOCALHOST_PROVIDER = "ws://localhost:8545";

export enum NetworkType {
  localhost = "localhost",
  goerli = "goerli",
  mainnet = "mainnet",
}

export interface NetworkInfo {
  type: NetworkType;
  filename: string;
  providerUrl: string;
  scanUrl: string;
}

export default function getInfo(
  networkType: NetworkType | string | undefined
): NetworkInfo {
  console.log("network", networkType);
  networkType = networkType || "localhost";
  switch (networkType) {
    case NetworkType.localhost:
      return {
        type: networkType,
        filename: "lottery-localhost.json",
        providerUrl: LOCALHOST_PROVIDER,
        scanUrl: "",
      };
    case NetworkType.goerli:
      return {
        type: networkType,
        filename: "lottery-goerli.json",
        providerUrl: GOERLI_ALCHEMY_API_URL as string,
        scanUrl: GOERLI_SCAN as string,
      };
    case NetworkType.mainnet:
      return {
        type: networkType,
        filename: "lottery-mainnet.json",
        providerUrl: MAINNET_ALCHEMY_API_URL as string,
        scanUrl: "",
      };
    default:
      console.log(
        `invalid network: "${networkType}", use --network=localhost | goerli | mainnet`
      );
      process.exit(1);
  }
}
