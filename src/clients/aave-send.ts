import type { TransactionExecutionResult } from "@aave/client";
import type { ExecutionPlan, TransactionRequest } from "@aave/graphql";
import { txHash } from "@aave/types";
import type { PublicClient, WalletClient } from "viem";

function toTxParams(request: TransactionRequest) {
  return {
    to: request.to as `0x${string}`,
    data: request.data as `0x${string}`,
    value: BigInt(request.value),
  };
}

async function sendTransactionRequest(
  wallet: WalletClient,
  publicClient: PublicClient,
  request: TransactionRequest,
): Promise<TransactionExecutionResult> {
  const account = wallet.account;
  if (!account) {
    throw new Error("Wallet account unavailable.");
  }

  const chain = publicClient.chain;
  if (!chain) {
    throw new Error("Chain configuration missing.");
  }

  const hash = await wallet.sendTransaction({
    chain,
    account,
    ...toTxParams(request),
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status === "reverted") {
    throw new Error(`Transaction reverted: ${hash}`);
  }

  return {
    txHash: txHash(hash),
    operation: request.operation ?? null,
  };
}

export async function sendExecutionPlan(
  wallet: WalletClient,
  publicClient: PublicClient,
  plan: ExecutionPlan,
): Promise<{ result: TransactionExecutionResult; approvalHash?: `0x${string}` }> {
  switch (plan.__typename) {
    case "InsufficientBalanceError":
      throw new Error(
        `Insufficient balance: required ${plan.required.value}, available ${plan.available.value}.`,
      );
    case "TransactionRequest": {
      const result = await sendTransactionRequest(wallet, publicClient, plan);
      return { result };
    }
    case "ApprovalRequired": {
      const approval = await sendTransactionRequest(
        wallet,
        publicClient,
        plan.approval,
      );
      const result = await sendTransactionRequest(
        wallet,
        publicClient,
        plan.originalTransaction,
      );
      return { result, approvalHash: approval.txHash as `0x${string}` };
    }
    default:
      throw new Error(
        `Unknown execution plan: ${(plan as { __typename: string }).__typename}`,
      );
  }
}
