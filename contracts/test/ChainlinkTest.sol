pragma solidity ^0.8.0;

import "../RandomizerChainlink.sol";

contract ChainlinkTest is RandomizerChainlink {
    constructor(uint64 subscriptionId, address _vrfCoordinator) RandomizerChainlink(subscriptionId, _vrfCoordinator) {

    }

    function getTestRandom() public returns(bool) {
        s_requestId = COORDINATOR.requestRandomWords(
            keyHash,
            s_subscriptionId,
            requestConfirmations,
            callbackGasLimit,
            numWords
        );
        return true;
    }
}
