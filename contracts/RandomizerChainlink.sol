// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "./IRandomizer.sol";
import "./ILottery.sol";

contract RandomizerChainlink is VRFConsumerBaseV2, IRandomizer {
    address payable public owner;
    VRFCoordinatorV2Interface public COORDINATOR;
    uint64 public subscriptionId;
    bytes32 public keyHash;

    uint256[] public s_randomWords;
    uint256 public s_requestId;

    ILottery public lottery;

    constructor(uint64 _subscriptionId, address _vrfCoordinator, bytes32 _keyHash) VRFConsumerBaseV2(_vrfCoordinator) {
        COORDINATOR = VRFCoordinatorV2Interface(_vrfCoordinator);
        subscriptionId = _subscriptionId;
        keyHash = _keyHash;
        owner = payable(msg.sender);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Owner only");
        _;
    }

    function transferOwner(address newOwner) external onlyOwner {
        owner = payable(newOwner);
    }

    function isContract(address account) private view {
        require(account.code.length > 0, "Address is not contract");
    }

    function withdraw() external onlyOwner {
        owner.transfer(address(this).balance);
    }
    receive() external payable {}

    function fulfillRandomWords(
        uint256,
        uint256[] memory randomWords
    ) internal override {
        if (s_requestId == 0) return;
        s_randomWords = randomWords;
        s_requestId = 0;
        lottery.receiveRandom(randomWords[0]);
    }

    function setLottery(address _lottery) external onlyOwner {
        isContract(_lottery);
        lottery = ILottery(_lottery);
    }

    function getRandom() external returns(bool) {
        require(msg.sender == address(lottery), "Lottery only");

        s_requestId = COORDINATOR.requestRandomWords(
            keyHash,
            subscriptionId,
            3,
            150_000,
            1
        );
        return true;
    }

    function resetGetNumber() external {
        require(msg.sender == address(lottery), "Lottery only");
        s_requestId = 0;
    }
}
