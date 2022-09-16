// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.16;

import "../ILottery.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract RandomizerTest is Ownable {
    bool public needRandom;
    ILottery lottery;

    function setLottery(address _lottery) external onlyOwner {
        lottery = ILottery(_lottery);
    }

    function sendRandom() private {
        uint rnd = uint(
            keccak256(
                abi.encodePacked(
                    block.timestamp,
                    block.difficulty,
                    block.number,
                    msg.sender
                )
            )
        );
        lottery.receiveRandom(rnd);
    }

    function getRandom() external returns(bool) {
        needRandom = true;
        return true;
    }

    function sendIfNeed() external {
        if (needRandom) {
            sendRandom();
            needRandom = false;
        }
    }

    function getBalance() external view returns(uint256) {
        return address(this).balance;
    }

    receive() external payable {}
}
