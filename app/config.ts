require("dotenv").config();

const {
  GOERLI_ALCHEMY_API_URL,
  GOERLI_SCAN,
  GOERLI_LOTTERY_ADDRESS,
  GOERLI_RANDOMIZER_ADDRESS,
  GOERLI_OWNER_ADDRESS,

  METAMASK_PRIVATE_KEY,
  ETHERSCAN_KEY,

  MAINNET_SCAN,
  MAINNET_OWNER_ADDRESS,
  MAINNET_ALCHEMY_API_URL,
  MAINNET_LOTTERY_ADDRESS,
  MAINNET_RANDOMIZER_ADDRESS,

  HARDHAT_NETWORK,
  NETWORK,
  network,
  npm_config_network,

  TELEGRAM_TOKEN,
  TELEGRAM_CHANNEL_ID,

  REDIS_DATABASE,
} = process.env;

export interface ConfigNet {
  alchemyApiUrl: string;
  ownerAddress: string;
  lotteryAddress: string;
  randomizerAddress: string;
  scanUrl: string;
}

export interface ConfigRedis {
  databaseIndex: number;
}

export interface ConfigTelegram {
  token: string;
  channelId: number;
}

export interface Config {
  redis: ConfigRedis;
  goerli: ConfigNet;
  mainnet: ConfigNet;
  metamaskPrivateKey: string;
  etherscanKey: string;
  network: string;
  telegram: ConfigTelegram;
}

const config: Config = {
  redis: {
    databaseIndex: +`${REDIS_DATABASE}` || 0,
  },
  goerli: {
    alchemyApiUrl: GOERLI_ALCHEMY_API_URL as string,
    ownerAddress: GOERLI_OWNER_ADDRESS as string,
    lotteryAddress: GOERLI_LOTTERY_ADDRESS as string,
    randomizerAddress: GOERLI_RANDOMIZER_ADDRESS as string,
    scanUrl: GOERLI_SCAN as string,
  },
  mainnet: {
    alchemyApiUrl: MAINNET_ALCHEMY_API_URL as string,
    ownerAddress: MAINNET_OWNER_ADDRESS as string,
    lotteryAddress: MAINNET_LOTTERY_ADDRESS as string,
    randomizerAddress: MAINNET_RANDOMIZER_ADDRESS as string,
    scanUrl: MAINNET_SCAN as string,
  },
  metamaskPrivateKey: METAMASK_PRIVATE_KEY as string,
  etherscanKey: ETHERSCAN_KEY as string,
  network:
    HARDHAT_NETWORK || NETWORK || network || npm_config_network || "localhost",
  telegram: {
    token: TELEGRAM_TOKEN as string,
    channelId: +`${TELEGRAM_CHANNEL_ID}`,
  },
};

console.log("config", config.network, HARDHAT_NETWORK);

export default config;
