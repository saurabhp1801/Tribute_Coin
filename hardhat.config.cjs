
// hardhat.config.cjs
const dotenvConfig = require("dotenv").config;
const { HardhatUserConfig } = require("hardhat/config");
require("@nomicfoundation/hardhat-toolbox");

dotenvConfig();

// Load environment variables
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "0a2581afa36e6d0524945bfe1a64acc9865ec9a263a7f57a4c294d6ef048977c"; // Replace with your private key
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";

const config = {
  solidity: {
    compilers: [
      {
        version: "0.8.19",
      },
      {
        version: "0.8.0", // Add this if you need compatibility with OpenZeppelin contracts
      },
      
    ],  settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    sepolia: {
      url: SEPOLIA_RPC_URL,
      accounts: [PRIVATE_KEY],
      chainId: 11155111,
      gasMultiplier: 1.2
    }
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
    outputFile: "gas-report.txt",
    noColors: true
  }
};

module.exports = config;










// // // hardhat.config.js
// // require("@nomicfoundation/hardhat-toolbox");

// // /** @type import('hardhat/config').HardhatUserConfig */
// // module.exports = {
// //   solidity: "0.8.28",
// //   networks: {
// //     localhost: {
// //       url: "http://127.0.0.1:8545"
// //     },
// //     hardhat: {
// //       chainId: 1337
// //     }
// //   },
// //   paths: {
// //     sources: "./contracts",
// //     artifacts: "./artifacts",
// //     cache: "./cache",
// //     tests: "./test"
// //   }
// // };



// require("@nomicfoundation/hardhat-toolbox");
// // require("@nomiclabs/hardhat-etherscan");
// require("solidity-coverage");
// require("hardhat-gas-reporter");
// require("dotenv").config();

// /**
//  * @type import('hardhat/config').HardhatUserConfig
//  */
// module.exports = {
//   solidity: {
//     version: "0.8.9",
//     settings: {
//       optimizer: {
//         enabled: true,
//         runs: 200
//       }
//     }
//   },
//   networks: {
//     hardhat: {
//       chainId: 31337
//     },
//     localhost: {
//       url: "http://127.0.0.1:8545",
//       chainId: 31337
//     },
//     sepolia: {
//       url: process.env.SEPOLIA_RPC_URL || "",
//       accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
//     },
//     goerli: {
//       url: process.env.GOERLI_RPC_URL || "",
//       accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
//     },
//     mainnet: {
//       url: process.env.MAINNET_RPC_URL || "",
//       accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
//       gasPrice: 30000000000 // 30 gwei
//     }
//   },
//   etherscan: {
//     apiKey: process.env.ETHERSCAN_API_KEY || ""
//   },
//   gasReporter: {
//     enabled: process.env.REPORT_GAS ? true : false,
//     currency: "USD",
//     coinmarketcap: process.env.COINMARKETCAP_API_KEY || "",
//     outputFile: "gas-report.txt",
//     noColors: true,
//   }
// };










// require("@nomicfoundation/hardhat-toolbox");
// require("dotenv").config();

// /** @type import('hardhat/config').HardhatUserConfig */
// module.exports = {
//   solidity: "0.8.28",
//   networks: {
//     sepolia: {
//       url: process.env.SEPOLIA_RPC_URL,
//       accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      
//     },
//   },
//   etherscan: {
//     apiKey: process.env.ETHERSCAN_API_KEY,
//   },
// };
