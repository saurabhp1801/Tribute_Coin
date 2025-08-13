// hardhat.config.js
require("@nomicfoundation/hardhat-toolbox");
require("hardhat-gas-reporter");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200  // Lower value optimizes for contract size but may increase gas costs
      },
      viaIR: true, // Enable the new IR-based optimizer pipeline
    },
  },
  gasReporter: {
    enabled: true,
    currency: "USD",
    showTimeSpent: true,
  },
  networks: {
    hardhat: {},
    // Add your network configurations here
  },
};
