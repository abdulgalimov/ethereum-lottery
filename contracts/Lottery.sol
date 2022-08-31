
// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.9;


contract Lottery {
    address payable public owner;
    uint public totalCount = 0;
    bool public stopped = false;

    uint public randomValue = 1_000;
    uint public minChance = 1;
    uint public maxChance = 100;
    uint public winRate = 90;
    uint public feeRate = 90;

    uint public newMinChance = 0;
    uint public newMaxChance = 0;
    uint public newWinRate = 0;
    uint public newFeeRate = 0;

    constructor() {
        owner = payable(msg.sender);
    }

    event Add(uint addAmount);
    event Try(uint tryAmount, uint count, uint totalAmount);
    event Win(uint winAmount, uint count);
    event ChangedRates(uint winRate, uint feeRate);
    event ChangedChance(uint minChance, uint maxChance);

    modifier onlyOwner() {
        require(msg.sender == owner, "Owner only");
        _;
    }

    function addBalance() external payable onlyOwner {
        require(msg.value > 0, "zero value");
        emit Add(msg.value);
    }

    function setRates(uint _winRate, uint _feeRate) external onlyOwner {
        newWinRate = _winRate;
        newFeeRate = _feeRate;
        emit ChangedRates(_winRate, _feeRate);
    }

    function setChance(uint _minChance, uint _maxChance) external onlyOwner {
        newMinChance = _minChance;
        newMaxChance = _maxChance;
        emit ChangedChance(_minChance, _maxChance);
    }

    function setStop(bool _stopped) external onlyOwner {
        stopped = _stopped  ;
    }

    function getBalance() public view returns(uint) {
        return address(this).balance;
    }

    function random() private view returns(uint) {
        return uint(
            keccak256(
                abi.encodePacked(
                    block.timestamp,
                    block.difficulty,
                    block.number,
                    msg.sender,
                    msg.value
                )
            )
        ) % randomValue;
    }

    function attempt() public payable {
        require(msg.sender != owner, "no owner");
        require(msg.value > 0, "no zero money");
        totalCount ++;

        uint totalBalance = address(this).balance - msg.value;
        require(totalBalance > 0, "empty balance");

        uint chance = minChance + (msg.value * (maxChance - minChance)) / totalBalance;
        if (chance > maxChance) {
            chance = maxChance;
        }

        totalBalance += msg.value;

        uint rnd = random();
        emit Try(msg.value, totalCount, totalBalance);

        if (rnd <= chance) {
            uint winAmount = (totalBalance * winRate) / 100;
            uint feeValue = totalBalance - winAmount;

            if (stopped) {
                owner.transfer(feeValue);
            } else {
                owner.transfer((feeValue * feeRate) / 100);
            }

            emit Win(winAmount, totalCount);

            address payable winner = payable(msg.sender);
            winner.transfer(winAmount);

            totalCount = 0;

            if (newMinChance > 0) {
                minChance = newMinChance;
                maxChance = newMaxChance;
                newMinChance = 0;
                newMaxChance = 0;
            }

            if (newFeeRate > 0) {
                feeRate = newFeeRate;
                winRate = newWinRate;
                newFeeRate = 0;
                newWinRate = 0;
            }
        }
    }
}
