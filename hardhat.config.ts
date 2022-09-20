require("dotenv").config();

import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const {
  GOERLI_ALCHEMY_API_URL,
  GOERLI_METAMASK_PRIVATE_KEY,
  MAINNET_ALCHEMY_API_URL,
  METAMASK_PRIVATE_KEY,
} = process.env;

const config: HardhatUserConfig = {
  solidity: "0.8.16",
  networks: {
    hardhat: {},
    goerli: {
      url: `${GOERLI_ALCHEMY_API_URL}`,
      accounts: [`0x${GOERLI_METAMASK_PRIVATE_KEY}`],
    },
    mainnet: {
      url: `${MAINNET_ALCHEMY_API_URL}`,
      accounts: [`0x${METAMASK_PRIVATE_KEY}`],
    },
  },
};

export default config;
