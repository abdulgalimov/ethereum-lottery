// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.16;

import "./IRandomizer.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";

contract Lottery is Ownable {
    struct Settings {
        uint randomValue;
        uint minChance;
        uint maxChance;
        uint winRate;
        uint feeRate;
        uint minRate;
        IRandomizer randomizer;
    }
    address payable public lotteryOwner;
    uint public totalCount = 0;
    bool public stopped = false;

    Settings public settings;
    Settings public newSettings;
    bool private isNewSettings;

    address private currentSender;
    uint private currentValue;

    constructor(Settings memory s) Ownable() {
        require(Address.isContract(address(s.randomizer)), "Randomizer address is not contract");

        lotteryOwner = payable(msg.sender);
        settings.randomValue = s.randomValue;
        settings.minChance = s.minChance;
        settings.maxChance = s.maxChance;
        settings.winRate = s.winRate;
        settings.feeRate = s.feeRate;
        settings.minRate = s.minRate;
        settings.randomizer = s.randomizer;
    }

    function _transferOwnership(address newOwner) internal override {
        super._transferOwnership(newOwner);
        lotteryOwner = payable(newOwner);
    }

    event Add(uint addAmount);
    event TryStart(uint tryAmount, uint count, uint totalAmount);
    event TryFinish(uint tryAmount, uint count, uint totalAmount, bool isWin);
    event Win(uint winAmount, uint count);
    event SettingsChanged(Settings settings);

    function addBalance() external payable onlyOwner {
        require(msg.value > 0, "zero value");
        require(!stopped, "is stopped");
        emit Add(msg.value);
    }

    function setSettings(Settings calldata updateSettings) external onlyOwner {
        require(Address.isContract(address(updateSettings.randomizer)), "Randomizer address is not contract");

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
        require(msg.sender != lotteryOwner, "no owner");
        require(msg.value > 0, "no zero money");

        uint totalBalance = address(this).balance;
        require(totalBalance > msg.value, "empty balance");

        require(msg.value >= ((totalBalance - msg.value) * settings.minRate) / 100, "small bet");

        require(currentValue == 0, "draw in progress");

        (bool success, ) = address(settings.randomizer).call(abi.encodeWithSignature("getRandom()"));
        require(success, "invalid call randomizer");

        totalCount++;
        currentSender = msg.sender;
        currentValue = msg.value;
        emit TryStart(currentValue, totalCount, totalBalance);
    }

    function receiveRandom(uint randomUint) external {
        require(msg.sender == address(settings.randomizer), "randomizer only");
        require(currentValue > 0 && currentSender != address(0), "wrong receive call");

        uint totalBalance = address(this).balance;
        uint beforeBalance = totalBalance - currentValue;

        uint chance = settings.minChance + (currentValue * (settings.maxChance - settings.minChance) / beforeBalance);
        if (chance > settings.maxChance) {
            chance = settings.maxChance;
        }

        uint rnd = randomUint % settings.randomValue;
        bool isWin = rnd <= chance;
        emit TryFinish(currentValue, totalCount, totalBalance, isWin);

        if (isWin) {
            uint winAmount = (totalBalance * settings.winRate) / 100;
            uint feeValue = totalBalance - winAmount;

            if (stopped) {
                lotteryOwner.transfer(feeValue);
            } else {
                lotteryOwner.transfer((feeValue * settings.feeRate) / 100);
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

        currentSender = address(0);
        currentValue = 0;
    }
}
