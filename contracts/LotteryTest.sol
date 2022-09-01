// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.16;

import "./Lottery.sol";


contract LotteryTest is Lottery {
    constructor(Settings memory settings) Lottery(settings) {
    }

    function setTestSettings(Settings calldata updateSettings) external onlyOwner {
        settings.randomValue = updateSettings.randomValue;
        settings.minChance = updateSettings.minChance;
        settings.maxChance = updateSettings.maxChance;
        settings.winRate = updateSettings.winRate;
        settings.feeRate = updateSettings.feeRate;
        settings.minRate = updateSettings.minRate;

        emit SettingsChanged(settings);
    }
}
