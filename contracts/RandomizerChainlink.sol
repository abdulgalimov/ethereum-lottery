// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "./IRandomizer.sol";
import "./ILottery.sol";

contract RandomizerChainlink is VRFConsumerBaseV2, IRandomizer {
    address payable public owner;
    VRFCoordinatorV2Interface public COORDINATOR;
    uint64 public s_subscriptionId;
    bytes32 keyHash = 0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15;

    uint256[] public s_randomWords;
    uint256 public s_requestId;

    ILottery public lottery;

    constructor(uint64 subscriptionId, address vrfCoordinator) VRFConsumerBaseV2(vrfCoordinator) {
        COORDINATOR = VRFCoordinatorV2Interface(vrfCoordinator);
        s_subscriptionId = subscriptionId;
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
            s_subscriptionId,
            3,
            150_000,
            1
        );
        return true;
    }
}
