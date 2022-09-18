// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "./IRandomizer.sol";
import "./ILottery.sol";

contract RandomizerChainlink is VRFConsumerBaseV2, IRandomizer {
    VRFCoordinatorV2Interface COORDINATOR;
    uint64 s_subscriptionId;
    address vrfCoordinator;

    bytes32 keyHash = 0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15;

    uint32 callbackGasLimit = 100000000;

    uint16 requestConfirmations = 3;

    uint32 numWords =  2;

    uint256[] public s_randomWords;
    uint256 public s_requestId;
    address s_owner;

    ILottery lottery;

    constructor(uint64 subscriptionId, address _vrfCoordinator) VRFConsumerBaseV2(_vrfCoordinator) {
        vrfCoordinator = _vrfCoordinator;
        COORDINATOR = VRFCoordinatorV2Interface(vrfCoordinator);
        s_owner = msg.sender;
        s_subscriptionId = subscriptionId;
    }

    function fulfillRandomWords(
        uint256 requestId,
        uint256[] memory randomWords
    ) internal override {
        s_randomWords = randomWords;
        s_requestId = 0;
        lottery.receiveRandom(randomWords[0]);
    }

    modifier onlyOwner() {
        require(msg.sender == s_owner);
        _;
    }

    modifier lotteryOwner() {
        require(msg.sender == address(lottery));
        _;
    }

    function setLottery(address _lottery) external onlyOwner {
        lottery = ILottery(_lottery);
    }

    function getRandom() external lotteryOwner returns(bool) {
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
