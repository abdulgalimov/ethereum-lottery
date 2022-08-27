
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
    constructor() {
        owner = payable(msg.sender);
    }

    event Try(uint tryAmount, uint count);
    event Win(uint winAmount, uint count);
    event Add(uint addAmount);
    event ChangedRates(uint winRate, uint feeRate);
    event ChangedChance(uint minChance, uint maxChance);

    modifier onlyOwner() {
        require(msg.sender == owner, "Owner only");
        _;
    }

    function addBalance() external payable onlyOwner {
        emit Add(msg.value);
    }

    function setRates(uint _winRate, uint _feeRate) external onlyOwner {
        winRate = _winRate;
        feeRate = _feeRate;
        emit ChangedRates(winRate, feeRate);
    }

    function setChance(uint _minChance, uint _maxChance) external onlyOwner {
        minChance = _minChance;
        maxChance = _maxChance;
        emit ChangedChance(minChance, maxChance);
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
        emit Try(msg.value, totalCount);

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
        }
    }
}
