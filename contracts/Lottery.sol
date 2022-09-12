// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.16;

import "./IRandomizer.sol";

contract Lottery {
    struct Settings {
        uint randomValue;
        uint minChance;
        uint maxChance;
        uint winRate;
        uint feeRate;
        uint minRate;
        IRandomizer randomizer;
    }
    address payable public owner;
    uint public totalCount = 0;
    bool public stopped = false;

    Settings public settings;
    Settings public newSettings;
    bool private isNewSettings;

    address private currentSender;
    uint private currentValue;

    constructor(Settings memory s) {
        owner = payable(msg.sender);
        settings.randomValue = s.randomValue;
        settings.minChance = s.minChance;
        settings.maxChance = s.maxChance;
        settings.winRate = s.winRate;
        settings.feeRate = s.feeRate;
        settings.minRate = s.minRate;
        settings.randomizer = s.randomizer;
    }

    event Add(uint addAmount);
    event Try(uint tryAmount, uint count, uint totalAmount, bool isWin);
    event Win(uint winAmount, uint count);
    event SettingsChanged(Settings settings);

    modifier onlyOwner() {
        require(msg.sender == owner, "Owner only");
        _;
    }

    function addBalance() external payable onlyOwner {
        require(msg.value > 0, "zero value");
        emit Add(msg.value);
    }

    function setSettings(Settings calldata updateSettings) external onlyOwner {
        newSettings.randomValue = updateSettings.randomValue;
        newSettings.minChance = updateSettings.minChance;
        newSettings.maxChance = updateSettings.maxChance;
        newSettings.winRate = updateSettings.winRate;
        newSettings.feeRate = updateSettings.feeRate;
        newSettings.minRate = updateSettings.minRate;
        newSettings.randomizer = updateSettings.randomizer;
        isNewSettings = true;

        emit SettingsChanged(newSettings);
    }

    function setStop(bool _stopped) external onlyOwner {
        stopped = _stopped;
    }

    function getBalance() public view returns(uint) {
        return address(this).balance;
    }

    receive() external payable {
        attempt();
    }

    function attempt() public payable {
        require(msg.sender != owner, "no owner");
        require(msg.value > 0, "no zero money");

        uint totalBalance = address(this).balance;
        require(totalBalance > msg.value, "empty balance");

        uint beforeBalance = totalBalance - msg.value;
        require(msg.value >= (beforeBalance * settings.minRate) / 1000, "small bet");

        require(currentValue == 0, "draw in progress");

        currentSender = msg.sender;
        currentValue = msg.value;

        settings.randomizer.getRandom();
    }

    function receiveRandom(uint randomUint) external {
        require(msg.sender == address(settings.randomizer), "randomizer only");
        totalCount ++;

        uint totalBalance = address(this).balance;
        uint beforeBalance = totalBalance - currentValue;

        uint chance = settings.minChance + (currentValue / beforeBalance) * (settings.maxChance - settings.minChance);
        if (chance > settings.maxChance) {
            chance = settings.maxChance;
        }

        uint rnd = randomUint % settings.randomValue;
        bool isWin = rnd <= chance;
        emit Try(currentValue, totalCount, totalBalance, isWin);

        if (isWin) {
            uint winAmount = (totalBalance * settings.winRate) / 100;
            uint feeValue = totalBalance - winAmount;

            if (stopped) {
                owner.transfer(feeValue);
            } else {
                uint b1 = owner.balance;
                owner.transfer((feeValue * settings.feeRate) / 100);
                uint b2 = owner.balance;
            }

            address payable winner = payable(currentSender);
            winner.transfer(winAmount);

            emit Win(winAmount, totalCount);

            totalCount = 0;

            if (isNewSettings) {
                isNewSettings = false;
                settings.randomValue = newSettings.randomValue;
                settings.minChance = newSettings.minChance;
                settings.maxChance = newSettings.maxChance;
                settings.winRate = newSettings.winRate;
                settings.feeRate = newSettings.feeRate;
                settings.minRate = newSettings.minRate;
                settings.randomizer = newSettings.randomizer;

                newSettings.randomValue = 0;
                newSettings.minChance = 0;
                newSettings.maxChance = 0;
                newSettings.winRate = 0;
                newSettings.feeRate = 0;
                newSettings.minRate = 0;
                newSettings.randomizer = IRandomizer(address(0));
            }
        }

        currentValue = 0;
    }
}
