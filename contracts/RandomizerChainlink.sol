// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./IRandomizer.sol";
import "./ILottery.sol";

contract RandomizerChainlink is VRFConsumerBaseV2, IRandomizer, Ownable {
    VRFCoordinatorV2Interface COORDINATOR;
    uint64 s_subscriptionId;
    address vrfCoordinator;

    bytes32 keyHash = 0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15;

    uint32 callbackGasLimit = 100000000;

    uint16 requestConfirmations = 3;

    uint32 numWords =  2;

    uint256[] public s_randomWords;
    uint256 public s_requestId;

    ILottery lottery;

    constructor(uint64 subscriptionId, address _vrfCoordinator) VRFConsumerBaseV2(_vrfCoordinator) Ownable() {
        vrfCoordinator = _vrfCoordinator;
        COORDINATOR = VRFCoordinatorV2Interface(vrfCoordinator);
        s_subscriptionId = subscriptionId;
    }

    function withdraw() external onlyOwner {
        address payable ownerPay = payable(owner());
        ownerPay.transfer(address(this).balance);
    }

    function fulfillRandomWords(
        uint256,
        uint256[] memory randomWords
    ) internal override {
        s_randomWords = randomWords;
        s_requestId = 0;
        lottery.receiveRandom(randomWords[0]);
    }

    function setLottery(address _lottery) external onlyOwner {
        require(Address.isContract(_lottery), "Address is not contract");
        lottery = ILottery(_lottery);
    }

    function getRandom() external returns(bool) {
        require(msg.sender == address(lottery), "Lottery only");

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
