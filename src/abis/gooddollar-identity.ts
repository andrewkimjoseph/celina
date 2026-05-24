import type { Abi } from "viem";

export const goodDollarIdentityAbi = [
  {
    name: "identities",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [
      { name: "dateAuthenticated", type: "uint256" },
      { name: "dateAdded", type: "uint256" },
      { name: "did", type: "string" },
      { name: "whitelistedOnChainId", type: "uint256" },
      { name: "status", type: "uint8" },
      { name: "authCount", type: "uint32" },
    ],
  },
  {
    name: "isWhitelisted",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "authenticationPeriod",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "reverifyDaysOptions",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [{ name: "", type: "uint8" }],
  },
] as const satisfies Abi;
