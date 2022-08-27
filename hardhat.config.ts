require('dotenv').config();

import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const {
  GOERLI_API_URL,
  ALCHEMY_API_URL,
  ALCHEMY_API_KEY,
  METAMASK_PRIVATE_KEY,
} = process.env;

const config: HardhatUserConfig = {
  solidity: "0.8.9",
  networks: {
    hardhat: {},
    goerli: {
      url: `https://${GOERLI_API_URL}/${ALCHEMY_API_KEY}`,
      accounts: [`0x${METAMASK_PRIVATE_KEY}`]
    },
    mainnet: {
      url: `https://${ALCHEMY_API_URL}/${ALCHEMY_API_KEY}`,
      accounts: [`0x${METAMASK_PRIVATE_KEY}`]
    }
  },
};

export default config;
