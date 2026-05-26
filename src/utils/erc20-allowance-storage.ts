import {
  encodeAbiParameters,
  keccak256,
  pad,
  parseAbiParameters,
  toHex,
  type Address,
  type Hex,
  type StateOverride,
} from "viem";

/** Common base slots for ERC-20 allowance mappings (Mento stablecoins use 7). */
const ALLOWANCE_MAPPING_SLOTS = [
  7n,
  1n,
  0n,
  2n,
  3n,
  4n,
  5n,
  6n,
  8n,
  9n,
  10n,
  11n,
  12n,
  13n,
  14n,
] as const;

export function erc20AllowanceStorageSlot(
  owner: Address,
  spender: Address,
  mappingSlot: bigint,
): Hex {
  const ownerSlot = keccak256(
    encodeAbiParameters(parseAbiParameters("address, uint256"), [owner, mappingSlot]),
  );
  return keccak256(
    encodeAbiParameters(parseAbiParameters("address, bytes32"), [spender, ownerSlot]),
  );
}

export function erc20AllowanceStateOverride(
  token: Address,
  owner: Address,
  spender: Address,
  amount: bigint,
  mappingSlot: bigint,
): StateOverride {
  return [
    {
      address: token,
      stateDiff: [
        {
          slot: erc20AllowanceStorageSlot(owner, spender, mappingSlot),
          value: pad(toHex(amount)),
        },
      ],
    },
  ];
}

export function isLikelyTransferFailed(error: unknown): boolean {
  const message =
    error instanceof Error
      ? `${error.message} ${error.cause instanceof Error ? error.cause.message : ""}`
      : String(error);
  return /transfer failed/i.test(message);
}

export { ALLOWANCE_MAPPING_SLOTS };
