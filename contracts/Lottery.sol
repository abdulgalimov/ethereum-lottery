
// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.16;


contract Lottery {
    struct Settings {
        uint randomValue;
        uint minChance;
        uint maxChance;
        uint winRate;
        uint feeRate;
        uint minRate;
    }
    address payable public owner;
    uint public totalCount = 0;
    bool public stopped = false;

    Settings public settings;
    Settings public newSettings;
    bool private isNewSettings;

    constructor(Settings memory s) {
        owner = payable(msg.sender);
        settings.randomValue = s.randomValue;
        settings.minChance = s.minChance;
        settings.maxChance = s.maxChance;
        settings.winRate = s.winRate;
        settings.feeRate = s.feeRate;
        settings.minRate = s.minRate;
    }

    event Add(uint addAmount);
    event Try(uint tryAmount, uint count, uint totalAmount);
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
        isNewSettings = true;

        emit SettingsChanged(newSettings);
    }

    function setStop(bool _stopped) external onlyOwner {
        stopped = _stopped;
    }

    function getBalance() public view returns(uint) {
        return address(this).balance;
    }

    function attempt() public payable {
        require(msg.sender != owner, "no owner");
        require(msg.value > 0, "no zero money");

        uint totalBalance = address(this).balance;
        require(totalBalance > msg.value, "empty balance");

        uint beforeBalance = totalBalance - msg.value;
        require(msg.value >= (beforeBalance * settings.minRate) / 1000, "small bet");

        totalCount ++;

        uint chance = settings.minChance + (msg.value / beforeBalance) * (settings.maxChance - settings.minChance);
        if (chance > settings.maxChance) {
            chance = settings.maxChance;
        }

        uint rnd = uint(
            keccak256(
                abi.encodePacked(
                    block.timestamp,
                    block.difficulty,
                    block.number,
                    msg.sender,
                    msg.value
                )
            )
        ) % settings.randomValue;
        emit Try(msg.value, totalCount, totalBalance);

        if (rnd <= chance) {
            uint winAmount = (totalBalance * settings.winRate) / 100;
            uint feeValue = totalBalance - winAmount;

            if (stopped) {
                owner.transfer(feeValue);
            } else {
                owner.transfer((feeValue * settings.feeRate) / 100);
            }

            emit Win(winAmount, totalCount);

            address payable winner = payable(msg.sender);
            winner.transfer(winAmount);

            totalCount = 0;

            if (isNewSettings) {
                isNewSettings = false;
                settings.randomValue = newSettings.randomValue;
                settings.minChance = newSettings.minChance;
                settings.maxChance = newSettings.maxChance;
                settings.winRate = newSettings.winRate;
                settings.feeRate = newSettings.feeRate;
                settings.minRate = newSettings.minRate;

                newSettings.randomValue = 0;
                newSettings.minChance = 0;
                newSettings.maxChance = 0;
                newSettings.winRate = 0;
                newSettings.feeRate = 0;
                newSettings.minRate = 0;
            }
        }
    }

    receive() external payable {
        attempt();
    }
}
