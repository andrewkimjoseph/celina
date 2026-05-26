import { z } from "zod";

export const addressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address");

export const addressOrEnsSchema = z
  .string()
  .min(3)
  .describe(
    "Recipient 0x address or ENS name (e.g. andrewkimjoseph.celo.eth, celina.eth)",
  );

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
  .describe("Token symbol (e.g. CELO, USDm, G$, GoodDollar) or 0x contract address");

export const ensNameSchema = z
  .string()
  .min(3)
  .describe("ENS name, e.g. celina.eth or vitalik.eth");
