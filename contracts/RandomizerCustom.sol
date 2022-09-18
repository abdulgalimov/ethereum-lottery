// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.16;

import "./ILottery.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";

contract RandomizerCustom is Ownable {
    bool public needRandom;
    ILottery lottery;

    function withdraw() external onlyOwner {
        address payable ownerPay = payable(owner());
        ownerPay.transfer(address(this).balance);
    }

    function _sendRandom() private {
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

    function setLottery(address _lottery) external onlyOwner {
        require(Address.isContract(_lottery), "Address is not contract");
        lottery = ILottery(_lottery);
    }

    function getRandom() external returns(bool) {
        require(msg.sender == address(lottery), "Lottery only");
        needRandom = true;
        return true;
    }

    function sendIfNeed() external {
        if (needRandom) {
            _sendRandom();
            needRandom = false;
        }
    }

    receive() external payable {}
}
