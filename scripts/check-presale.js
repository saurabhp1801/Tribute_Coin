import pkg from "hardhat";
const { ethers } = pkg;

async function main() {
  const presaleAddress = "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9";
  const presaleAbi = [
    {
      inputs: [
        {
          internalType: "address",
          name: "tokenAddr",
          type: "address",
        },
        {
          internalType: "address",
          name: "vestingAddr",
          type: "address",
        },
        {
          internalType: "uint256",
          name: "ratePerEth",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "startTs",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "endTs",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "hardCapTokens",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "minPerW",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "maxPerW",
          type: "uint256",
        },
        {
          components: [
            {
              internalType: "uint32",
              name: "startDelay",
              type: "uint32",
            },
            {
              internalType: "uint32",
              name: "cliff",
              type: "uint32",
            },
            {
              internalType: "uint32",
              name: "duration",
              type: "uint32",
            },
            {
              internalType: "uint32",
              name: "slice",
              type: "uint32",
            },
            {
              internalType: "bool",
              name: "revocable",
              type: "bool",
            },
          ],
          internalType: "struct PreSellMagaFox.VestingTemplate",
          name: "vt",
          type: "tuple",
        },
      ],
      stateMutability: "nonpayable",
      type: "constructor",
    },
    {
      inputs: [],
      name: "AmountTooLarge",
      type: "error",
    },
    {
      inputs: [],
      name: "AmountTooSmall",
      type: "error",
    },
    {
      inputs: [],
      name: "CapExceeded",
      type: "error",
    },
    {
      inputs: [],
      name: "InsufficientPresaleBalance",
      type: "error",
    },
    {
      inputs: [],
      name: "InsufficientVestingAllowance",
      type: "error",
    },
    {
      inputs: [],
      name: "InvalidParams",
      type: "error",
    },
    {
      inputs: [],
      name: "NothingToApprove",
      type: "error",
    },
    {
      inputs: [],
      name: "SaleNotOpen",
      type: "error",
    },
    {
      inputs: [],
      name: "ZeroAddress",
      type: "error",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: false,
          internalType: "uint256",
          name: "hardCap",
          type: "uint256",
        },
        {
          indexed: false,
          internalType: "uint256",
          name: "minPerWallet",
          type: "uint256",
        },
        {
          indexed: false,
          internalType: "uint256",
          name: "maxPerWallet",
          type: "uint256",
        },
      ],
      name: "CapsUpdated",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "to",
          type: "address",
        },
        {
          indexed: false,
          internalType: "uint256",
          name: "amountWei",
          type: "uint256",
        },
      ],
      name: "FundsWithdrawn",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "previousOwner",
          type: "address",
        },
        {
          indexed: true,
          internalType: "address",
          name: "newOwner",
          type: "address",
        },
      ],
      name: "OwnershipTransferred",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: false,
          internalType: "address",
          name: "account",
          type: "address",
        },
      ],
      name: "Paused",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "payer",
          type: "address",
        },
        {
          indexed: true,
          internalType: "address",
          name: "beneficiary",
          type: "address",
        },
        {
          indexed: false,
          internalType: "uint256",
          name: "weiAmount",
          type: "uint256",
        },
        {
          indexed: false,
          internalType: "uint256",
          name: "tokenAmount",
          type: "uint256",
        },
        {
          indexed: false,
          internalType: "bytes32",
          name: "scheduleId",
          type: "bytes32",
        },
      ],
      name: "Purchased",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: false,
          internalType: "uint256",
          name: "newRate",
          type: "uint256",
        },
      ],
      name: "RateUpdated",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: false,
          internalType: "address",
          name: "token",
          type: "address",
        },
        {
          indexed: false,
          internalType: "address",
          name: "to",
          type: "address",
        },
        {
          indexed: false,
          internalType: "uint256",
          name: "amount",
          type: "uint256",
        },
      ],
      name: "RecoveredERC20",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: false,
          internalType: "uint256",
          name: "start",
          type: "uint256",
        },
        {
          indexed: false,
          internalType: "uint256",
          name: "end",
          type: "uint256",
        },
      ],
      name: "TimesUpdated",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: false,
          internalType: "address",
          name: "account",
          type: "address",
        },
      ],
      name: "Unpaused",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: false,
          internalType: "uint256",
          name: "allowance",
          type: "uint256",
        },
      ],
      name: "VestingAllowanceApproved",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: false,
          internalType: "uint32",
          name: "startDelay",
          type: "uint32",
        },
        {
          indexed: false,
          internalType: "uint32",
          name: "cliff",
          type: "uint32",
        },
        {
          indexed: false,
          internalType: "uint32",
          name: "duration",
          type: "uint32",
        },
        {
          indexed: false,
          internalType: "uint32",
          name: "slice",
          type: "uint32",
        },
        {
          indexed: false,
          internalType: "bool",
          name: "revocable",
          type: "bool",
        },
      ],
      name: "VestingTemplateUpdated",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: false,
          internalType: "bool",
          name: "enabled",
          type: "bool",
        },
      ],
      name: "WhitelistEnabled",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "who",
          type: "address",
        },
        {
          indexed: false,
          internalType: "bool",
          name: "allowed",
          type: "bool",
        },
      ],
      name: "Whitelisted",
      type: "event",
    },
    {
      stateMutability: "payable",
      type: "fallback",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "amount",
          type: "uint256",
        },
      ],
      name: "approveVesting",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "beneficiary",
          type: "address",
        },
      ],
      name: "buy",
      outputs: [
        {
          internalType: "bytes32",
          name: "",
          type: "bytes32",
        },
      ],
      stateMutability: "payable",
      type: "function",
    },
    {
      inputs: [],
      name: "hardCap",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "isOpen",
      outputs: [
        {
          internalType: "bool",
          name: "",
          type: "bool",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      name: "isWhitelisted",
      outputs: [
        {
          internalType: "bool",
          name: "",
          type: "bool",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "maxPerWallet",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "minPerWallet",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "owner",
      outputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "pause",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [],
      name: "paused",
      outputs: [
        {
          internalType: "bool",
          name: "",
          type: "bool",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      name: "purchased",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "weiAmount",
          type: "uint256",
        },
      ],
      name: "quoteTokens",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "rate",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "erc20",
          type: "address",
        },
        {
          internalType: "address",
          name: "to",
          type: "address",
        },
        {
          internalType: "uint256",
          name: "amount",
          type: "uint256",
        },
      ],
      name: "recoverERC20",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [],
      name: "remaining",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "renounceOwnership",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [],
      name: "saleEnd",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "saleStart",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "newHardCap",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "newMinPer",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "newMaxPer",
          type: "uint256",
        },
      ],
      name: "setCaps",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "newRate",
          type: "uint256",
        },
      ],
      name: "setRate",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "startTs",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "endTs",
          type: "uint256",
        },
      ],
      name: "setTimes",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint32",
          name: "startDelay",
          type: "uint32",
        },
        {
          internalType: "uint32",
          name: "cliff",
          type: "uint32",
        },
        {
          internalType: "uint32",
          name: "duration",
          type: "uint32",
        },
        {
          internalType: "uint32",
          name: "slice",
          type: "uint32",
        },
        {
          internalType: "bool",
          name: "revocable",
          type: "bool",
        },
      ],
      name: "setVestingTemplate",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address[]",
          name: "addrs",
          type: "address[]",
        },
        {
          internalType: "bool",
          name: "allowed",
          type: "bool",
        },
      ],
      name: "setWhitelist",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "bool",
          name: "enabled",
          type: "bool",
        },
      ],
      name: "setWhitelistEnabled",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [],
      name: "token",
      outputs: [
        {
          internalType: "contract IERC20",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "totalSold",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "newOwner",
          type: "address",
        },
      ],
      name: "transferOwnership",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [],
      name: "unpause",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [],
      name: "vesting",
      outputs: [
        {
          internalType: "contract IMAGAFox47Vesting",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "vestingTemplate",
      outputs: [
        {
          components: [
            {
              internalType: "uint32",
              name: "startDelay",
              type: "uint32",
            },
            {
              internalType: "uint32",
              name: "cliff",
              type: "uint32",
            },
            {
              internalType: "uint32",
              name: "duration",
              type: "uint32",
            },
            {
              internalType: "uint32",
              name: "slice",
              type: "uint32",
            },
            {
              internalType: "bool",
              name: "revocable",
              type: "bool",
            },
          ],
          internalType: "struct PreSellMagaFox.VestingTemplate",
          name: "",
          type: "tuple",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "whitelistEnabled",
      outputs: [
        {
          internalType: "bool",
          name: "",
          type: "bool",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address payable",
          name: "to",
          type: "address",
        },
        {
          internalType: "uint256",
          name: "amountWei",
          type: "uint256",
        },
      ],
      name: "withdrawFunds",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      stateMutability: "payable",
      type: "receive",
    },
  ];

  const [signer] = await ethers.getSigners();
  const presale = new ethers.Contract(presaleAddress, presaleAbi, signer);

  const start = await presale.saleStart();
  const end = await presale.saleEnd();
  console.log("📌 Sale times:", {
    start: start.toString(),
    end: end.toString(),
  });
}

main().catch(console.error);
