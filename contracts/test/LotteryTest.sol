// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.16;

import "../Lottery.sol";


contract LotteryTest is Lottery {
    constructor(Settings memory settings) Lottery(settings) {
    }

    event TestEvent(uint256 num);

    function t_setSettings(Settings calldata updateSettings) external onlyOwner {
        settings.randomValue = updateSettings.randomValue;
        settings.minChance = updateSettings.minChance;
        settings.maxChance = updateSettings.maxChance;
        settings.winRate = updateSettings.winRate;
        settings.feeRate = updateSettings.feeRate;
        settings.minBet = updateSettings.minBet;
        settings.randomizer = updateSettings.randomizer;

        emit SettingsChanged(settings);
    }

    uint test = 0;
    function t_testUpdate() external {
        test++;
        emit TestEvent(test);
    }

    function t_requestRandom() external onlyOwner {
        settings.randomizer.getRandom();
    }

    function t_resetCurrentValue() external {
        currentSender = address(0);
        currentValue = 0;
    }
}
