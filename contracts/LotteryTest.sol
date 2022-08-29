// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.9;

import "./Lottery.sol";


contract LotteryTest is Lottery {
    function setTestRates(uint _winRate, uint _feeRate) external onlyOwner {
        winRate = _winRate;
        feeRate = _feeRate;
        emit ChangedRates(winRate, feeRate);
    }

    function setTestChance(uint _minChance, uint _maxChance) external onlyOwner {
        minChance = _minChance;
        maxChance = _maxChance;
        emit ChangedChance(minChance, maxChance);
    }
}
