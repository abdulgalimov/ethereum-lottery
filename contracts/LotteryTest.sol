// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.16;

import "./Lottery.sol";


contract LotteryTest is Lottery {

    function setTestSettings(Settings calldata updateSettings) external onlyOwner {
        settings.randomValue = updateSettings.randomValue;
        settings.winRate = updateSettings.winRate;
        settings.feeRate = updateSettings.feeRate;
        settings.minChance = updateSettings.minChance;
        settings.maxChance = updateSettings.maxChance;

        emit SettingsChanged(newSettings);
    }
}
