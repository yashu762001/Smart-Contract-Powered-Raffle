const { assert, expect } = require("chai");
const { getNamedAccounts, deployments, ethers, network } = require("hardhat");
const { boolean } = require("hardhat/internal/core/params/argumentTypes");
const {
  developmentChains,
  networkConfig,
} = require("../../helper-hardhat-config");

if (developmentChains.includes(network.name)) {
  describe("Raffle", async function () {
    let vrfCoordinatorV2Mock, raffle, raffleEntranceFee, deployer, interval;
    const chainId = network.config.chainId;

    beforeEach(async function () {
      deployer = (await getNamedAccounts()).deployer;
      await deployments.fixture(["all"]); // deploy everything

      raffle = await ethers.getContract("Raffle", deployer);
      vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock");
      raffleEntranceFee = await raffle.getEntranceFees();
      interval = await raffle.getInterval();
    });

    describe("Constructor", async function () {
      it("raffle is initialised correctly", async function () {
        const raffleState = await raffle.getRaffleState();
        assert.equal(raffleState.toString(), "0");
        assert.equal(interval.toString(), networkConfig[chainId]["interval"]);
      });
    });

    describe("enterRaffle", async function () {
      it("reverts if does not pay enough", async function () {
        await expect(raffle.enterRaffle()).to.be.revertedWith(
          "Please transfer more money to participate in raffle"
        );
      });

      it("records players when enter", async function () {
        await raffle.enterRaffle({ value: raffleEntranceFee });
        const playerFromContract = await raffle.getPlayer(0);
        assert.equal(playerFromContract, deployer);
      });

      it("emits event when enter", async function () {
        await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.emit(
          raffle,
          "RaffleEnter"
        );
      });

      it("doesn't allow entrance when raffle is not open", async function () {
        await raffle.enterRaffle({ value: raffleEntranceFee });
        await network.provider.send("evm_increaseTime", [
          interval.toNumber() + 1,
        ]);
        await network.provider.send("evm_mine", []);
        await raffle.performUpkeep([]);
        await expect(
          raffle.enterRaffle({ value: raffleEntranceFee })
        ).to.be.revertedWith("Raffle__NotOpen");
      });
    });

    describe("CheckUpKeep", async function () {
      it("returns false if people haven't sent any eth", async function () {
        await network.provider.send("evm_increaseTime", [
          interval.toNumber() + 1,
        ]);
        await network.provider.send("evm_mine", []);
        const { upKeepNeeded } = await raffle.callStatic.checkUpkeep([]);

        assert(!upKeepNeeded);
      });

      it("returns false if raffle is not open", async function () {
        await raffle.enterRaffle({ value: raffleEntranceFee });
        await network.provider.send("evm_increaseTime", [
          interval.toNumber() + 1,
        ]);
        await network.provider.send("evm_mine", []);

        await raffle.performUpkeep([]);

        const raffleState = raffle.getRaffleState();

        const { upKeepNeeded } = raffle.callStatic.checkUpkeep([]);
        assert.notEqual(raffleState.toString(), "1");
        assert(!upKeepNeeded);
      });
    });

    describe("performUpKeep", async function () {
      it("can only run if checkUpKeep is true", async function () {
        await raffle.enterRaffle({ value: raffleEntranceFee });
        await network.provider.send("evm_increaseTime", [
          interval.toNumber() + 1,
        ]);
        await network.provider.send("evm_mine", []);

        const tx = await raffle.performUpkeep([]);

        assert(tx);
      });

      it("reverts when checkUpKeep is false", async function () {
        await expect(raffle.performUpkeep([])).to.be.revertedWith(
          "Raffle__UpKeepNotNeeded"
        );
      });

      it("updates raffle state, emits an event, calls vrf function", async function () {
        await raffle.enterRaffle({ value: raffleEntranceFee });
        await network.provider.send("evm_increaseTime", [
          interval.toNumber() + 1,
        ]);
        await network.provider.send("evm_mine", []);

        const transactionResponse = await raffle.performUpkeep([]);
        const transactionReceipt = await transactionResponse.wait(1);
        const requestId = transactionReceipt.events[1].args.requestId;
        const raffleState = await raffle.getRaffleState();

        assert(requestId.toNumber() > 0);
        assert.equal(raffleState.toString(), "1");
      });
    });

    describe("fullfill Random Words", async function () {
      beforeEach(async function () {
        await raffle.enterRaffle({ value: raffleEntranceFee });
        await network.provider.send("evm_increaseTime", [
          interval.toNumber() + 1,
        ]);
        await network.provider.send("evm_mine", []);
      });

      it("only be called after performUpKeep", async function () {
        await expect(
          vrfCoordinatorV2Mock.fulfillRandomWords(0, raffle.address)
        ).to.be.revertedWith("nonexistent request");
        await expect(
          vrfCoordinatorV2Mock.fulfillRandomWords(1, raffle.address)
        ).to.be.revertedWith("nonexistent request");
      });

      it("picks a winner, resets the lottery and sends money", async function () {
        const additionalEntrance = 3;
        const startingAccountindex = 1;
        const accounts = await ethers.getSigners();
        for (let i = 1; i < startingAccountindex + additionalEntrance; i++) {
          await raffle.connect(accounts[i]);
          await raffle.enterRaffle({ value: raffleEntranceFee });
        }

        const startTimeStamp = await raffle.getLastTimeStamp();
        // perform upKeep =>  thereby calling fulfillRandomWords.
        await new Promise(async function (resolve, reject) {
          raffle.once("Winners", async () => {
            console.log("Winner found out");
            try {
              const winner = await raffle.getRecentWinner();
              const raffleState = await raffle.getRaffleState();
              const endingTimeStamp = await raffle.getLastTimeStamp();
              const numPlayers = await raffle.getNumberofPlayers();

              assert.equal(numPlayers.toString(), "0");
              assert.equal(raffleState.toString(), "0");
              assert(startTimeStamp < endingTimeStamp);
              resolve();
            } catch (err) {
              reject(err);
            }
          });

          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);

          await network.provider.send("evm_mine", []);

          const transactionResponse = await raffle.performUpkeep([]);
          const transactionReceipt = await transactionResponse.wait(1);

          await vrfCoordinatorV2Mock.fulfillRandomWords(
            transactionReceipt.events[1].args.requestId,
            raffle.address
          );
          console.log("This also done");
        });
      });
    });
  });
}
