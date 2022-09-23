import { BigNumber } from "ethers";
import {
  AddEventObject,
  TryFinishEventObject,
  TryStartEventObject,
  WinEventObject,
} from "../typechain-types/contracts/Lottery";

export interface Settings {
  randomValue: number;
  minChance: number;
  maxChance: number;
  winRate: number;
  feeRate: number;
  minBet: number;
  randomizer: string;
}

export enum Events {
  Add = "Add",
  TryStart = "TryStart",
  TryFinish = "TryFinish",
  Win = "Win",
}

export interface EventData {
  name: Events;
  transactionHash: string;
  currentBalance: BigNumber;
  data:
    | AddEventObject
    | TryStartEventObject
    | TryFinishEventObject
    | WinEventObject;
}

export interface SaveData {
  messageId: number;
  transactionHash: string;
}
