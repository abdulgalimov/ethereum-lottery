// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.16;

interface IRandomizer {
    function setLottery(address _lottery) external;
    function getRandom() external returns(bool);
}
