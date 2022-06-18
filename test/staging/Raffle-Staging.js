const { getNamedAccounts, deployments, network, ethers } = require("hardhat");
const { assert, expect } = require("chai");
const { inputToConfig } = require("@ethereum-waffle/compiler");

if (network.config.chainId != 31337) {
  describe("Raffle", async function () {
    let raffle, raffleEntranceFee, interval, deployer;
    const chainId = network.config.chainId;

    beforeEach(async function () {
      deployer = (await getNamedAccounts()).deployer;
      raffle = await ethers.getContract("Raffle", deployer);
      raffleEntranceFee = await raffle.getEntranceFees();
      interval = raffle.getInterval();
    });

    describe("fulfillRandomWords", async function () {
      it("works with chainLink Keepers and chainLink VRF", async function () {
        const startingTimeStamp = await raffle.getLastTimeStamp();
        console.log(startingTimeStamp);
        await new Promise(async (resolve, reject) => {
          raffle.once("Winners", async () => {
            console.log("Winner Picked event fired!!!");
            try {
              const endingTimeStamp = await raffle.getLastTimeStamp();
              const raffleState = await raffle.getRaffleState();
              await expect(raffle.getPlayer(0)).to.be.reverted;
              assert.equal(raffleState.toString(), "0");
              assert(endingTimeStamp > startingTimeStamp);
              resolve();
            } catch (err) {
              reject(err);
            }
          });
          await raffle.enterRaffle({ value: raffleEntranceFee });
        });
      });
    });
  });
}
