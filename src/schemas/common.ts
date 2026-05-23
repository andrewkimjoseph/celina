import { z } from "zod";
import type { CeloNetwork } from "../config/env.js";

export const addressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address");

export const networkSchema = z
  .enum(["mainnet", "sepolia"])
  .default("mainnet")
  .describe("Celo network to use");

export const blockIdSchema = z
  .union([
    z.number().int().nonnegative(),
    z.string().regex(/^0x[a-fA-F0-9]+$/, "Invalid block hash"),
    z.literal("latest"),
    z.literal("pending"),
  ])
  .describe("Block number, hash, or latest/pending");

export const tokenSymbolSchema = z
  .string()
  .describe("Token symbol (e.g. CELO, cUSD) or 0x contract address");

export type NetworkInput = z.infer<typeof networkSchema>;

export function resolveNetwork(
  network: NetworkInput | undefined,
  fallback: CeloNetwork,
): CeloNetwork {
  return network ?? fallback;
}
