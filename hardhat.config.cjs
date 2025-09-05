// hardhat.config.js
require("@nomicfoundation/hardhat-toolbox");
require("hardhat-gas-reporter");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200, // Lower value optimizes for contract size but may increase gas costs
      },
      viaIR: true, // Enable the new IR-based optimizer pipeline
    },
  },
 networks: {
    hardhat: {},
    sepolia: {
      url:
        process.env.SEPOLIA_RPC_URL ||
        "https://sepolia.infura.io/v3/7cc37636a4af4ee5a21c19d4ffe2b82d",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || "",
  },
  gasReporter: {
    enabled: true,
    currency: "USD",
    // outputFile: "gas-report.txt", // Optional file output
    noColors: true,
    showMethodSig: true, // Shows function signatures
    showTimeSpent: true,
  },
};
