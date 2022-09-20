import { BigNumber } from "ethers";
import {
  AddEventObject,
  TryEventObject,
  WinEventObject,
} from "../../typechain-types/contracts/Lottery";

export interface Settings {
  randomValue: number;
  minChance: number;
  maxChance: number;
  winRate: number;
  feeRate: number;
  minRate: number;
  randomizer: string;
}

export interface EventData {
  transactionHash: string;
  currentBalance: BigNumber;
  data: AddEventObject | TryEventObject | WinEventObject;
}
