//require("dotenv").config();
import { default as appConfig } from "./app/config";

import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomiclabs/hardhat-etherscan";
import "@nomicfoundation/hardhat-chai-matchers";

const config: HardhatUserConfig = {
  solidity: "0.8.16",
  etherscan: {
    apiKey: appConfig.etherscanKey,
  },
  networks: {
    hardhat: {},
    goerli: {
      url: `${appConfig.goerli.alchemyApiUrl}`,
      accounts: [`0x${appConfig.metamaskPrivateKey}`],
    },
    mainnet: {
      url: `${appConfig.mainnet.alchemyApiUrl}`,
      accounts: [`0x${appConfig.metamaskPrivateKey}`],
    },
  },
};

export default config;
