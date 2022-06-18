// Raffle contract :
// Enter the lottery by paying certain amount
// Choose a random winner (not like Mcdonalds.
// winner to be selected every x minutes

// Author : Yash Mathur

// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/KeeperCompatibleInterface.sol";

error Raffle_TransferFailed();
error Raffle__NotOpen();
error Raffle__UpKeepNotNeeded(
    uint256 balance,
    uint256 numPLayers,
    uint256 raffleState
);

contract Raffle is VRFConsumerBaseV2, KeeperCompatibleInterface {
    uint256 private immutable i_entranceFees;
    address payable[] private s_players;
    VRFCoordinatorV2Interface private immutable i_COORDINATOR;
    bytes32 private immutable i_gasLane;
    uint64 private immutable i_subscriptionId;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private immutable i_callbackGasLimit;
    uint32 private constant NUM_WORDS = 1;
    uint256 private s_lastTimeStamp;
    uint256 private immutable i_interval;

    enum RaffleState {
        OPEN,
        CALCULATING
    }

    // Events :
    event RaffleEnter(address indexed player);
    event RequestRandomNumber(uint256 indexed requestId);
    event Winners(address indexed winner);

    // Lottery winner :
    address payable private s_recentWinner;
    RaffleState private raffleState = RaffleState.OPEN;

    // Declaring states for lottery like : Open, pending, calculating.

    constructor(
        address vrfCoordinator,
        uint256 entrancefees,
        bytes32 gasLane,
        uint64 subscriptionId,
        uint32 callbackGasLimit,
        uint256 interval
    ) VRFConsumerBaseV2(vrfCoordinator) {
        i_COORDINATOR = VRFCoordinatorV2Interface(vrfCoordinator);
        i_entranceFees = entrancefees;
        i_gasLane = gasLane;
        i_subscriptionId = subscriptionId;
        i_callbackGasLimit = callbackGasLimit;
        s_lastTimeStamp = block.timestamp;
        i_interval = interval;
    }

    function enterRaffle() public payable {
        require(
            msg.value == i_entranceFees,
            "Please transfer more money to participate in raffle"
        );

        if (raffleState != RaffleState.OPEN) {
            revert Raffle__NotOpen();
        }
        s_players.push(payable(msg.sender));

        emit RaffleEnter(msg.sender);
    }

    // Time interval should have passed. LOttery must have atleast 1 people and subscription must be funded with Link.
    // Lottery should be in open state meaning that currently randomWord function is working and in a couple of minutes would return. So till now
    // no new people should be allowed to enter raffle.

    function checkUpkeep(
        bytes memory /*checkData*/
    )
        public
        override
        returns (
            bool upkeepNeeded,
            bytes memory /* performData */
        )
    {
        bool isOpen = RaffleState.OPEN == raffleState;
        bool istimePassed = (block.timestamp - s_lastTimeStamp) > i_interval;
        bool hasPlayers = (s_players.length) > 0;
        bool hasBalance = address(this).balance > 0;

        upkeepNeeded = (isOpen && istimePassed && hasPlayers && hasBalance);
    }

    function performUpkeep(
        bytes calldata /* performData */
    ) external override {
        (bool upkeepNeeded, ) = checkUpkeep("");
        if (!upkeepNeeded) {
            revert Raffle__UpKeepNotNeeded(
                address(this).balance,
                s_players.length,
                uint256(raffleState)
            );
        }
        // Request the random number and then in new function we will return it.
        raffleState = RaffleState.CALCULATING;
        uint256 s_requestId = i_COORDINATOR.requestRandomWords(
            i_gasLane,
            i_subscriptionId,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORDS
        );

        emit RequestRandomNumber(s_requestId);
    }

    function fulfillRandomWords(
        uint256, /*requestId */
        uint256[] memory randomWords
    ) internal override {
        uint256 winner = randomWords[0] % s_players.length;
        address payable winnerAddress = s_players[winner];
        s_recentWinner = winnerAddress;
        raffleState = RaffleState.OPEN;
        s_players = new address payable[](0);
        s_lastTimeStamp = block.timestamp;
        (bool success, ) = s_recentWinner.call{value: address(this).balance}(
            ""
        );
        if (!success) {
            revert Raffle_TransferFailed();
        }

        emit Winners(s_recentWinner);
    }

    function getEntranceFees() public view returns (uint256) {
        return i_entranceFees;
    }

    function getPlayer(uint256 index) public view returns (address) {
        return s_players[index];
    }

    function getRecentWinner() public view returns (address) {
        return s_recentWinner;
    }

    function getRaffleState() public view returns (RaffleState) {
        return raffleState;
    }

    // if it is declared pure it gives warning since it does not read in storage and simple return 1. So better make it pure so that it can read from memory.
    function getNumWords() public pure returns (uint256) {
        return NUM_WORDS;
    }

    function getNumberofPlayers() public view returns (uint256) {
        return s_players.length;
    }

    function getLastTimeStamp() public view returns (uint256) {
        return s_lastTimeStamp;
    }

    function requestConfirmations() public pure returns (uint256) {
        return REQUEST_CONFIRMATIONS;
    }

    function getInterval() public view returns (uint256) {
        return i_interval;
    }
}
