pragma solidity ^0.8.0;

import "../RandomizerCustom.sol";

contract RandomizerCustomTest is RandomizerCustom{
    function sendRandomTest() external {
        lottery.receiveRandom(123);
    }
}
