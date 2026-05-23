import type { CeloNetwork } from "../config/env.js";
import type { CeloClientFactory } from "../clients/celo-client.js";

export class BlockchainService {
  constructor(private readonly clientFactory: CeloClientFactory) {}

  async getNetworkStatus(network: CeloNetwork) {
    const { public: client } = this.clientFactory.getClients(network);
    const [chainId, blockNumber, gasPrice] = await Promise.all([
      client.getChainId(),
      client.getBlockNumber(),
      client.getGasPrice(),
    ]);

    return {
      network,
      chainId,
      blockNumber: blockNumber.toString(),
      gasPriceWei: gasPrice.toString(),
    };
  }

  async getBlock(
    network: CeloNetwork,
    blockId: number | string | "latest" | "pending",
  ) {
    const { public: client } = this.clientFactory.getClients(network);
    const blockParams =
      typeof blockId === "number"
        ? { blockNumber: BigInt(blockId), includeTransactions: false as const }
        : blockId === "latest" || blockId === "pending"
          ? {
              blockTag: blockId as "latest" | "pending",
              includeTransactions: false as const,
            }
          : { blockHash: blockId as `0x${string}`, includeTransactions: false as const };

    const block = await client.getBlock(blockParams);

    if (!block) {
      throw new Error(`Block not found: ${blockId}`);
    }

    return {
      number: block.number?.toString(),
      hash: block.hash,
      timestamp: block.timestamp.toString(),
      parentHash: block.parentHash,
      gasUsed: block.gasUsed.toString(),
      gasLimit: block.gasLimit.toString(),
      miner: block.miner,
      transactionCount: block.transactions.length,
    };
  }

  async getLatestBlocks(network: CeloNetwork, count = 5) {
    const { public: client } = this.clientFactory.getClients(network);
    const latest = await client.getBlockNumber();
    const start = latest - BigInt(Math.max(count - 1, 0));

    const blocks = await Promise.all(
      Array.from({ length: count }, (_, index) =>
        client.getBlock({ blockNumber: start + BigInt(index) }),
      ),
    );

    return blocks.filter(Boolean).map((block) => ({
      number: block!.number?.toString(),
      hash: block!.hash,
      timestamp: block!.timestamp.toString(),
      transactionCount: block!.transactions.length,
    }));
  }

  async getTransaction(network: CeloNetwork, hash: `0x${string}`) {
    const { public: client } = this.clientFactory.getClients(network);
    const [tx, receipt] = await Promise.all([
      client.getTransaction({ hash }),
      client.getTransactionReceipt({ hash }),
    ]);

    if (!tx) {
      throw new Error(`Transaction not found: ${hash}`);
    }

    return {
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: tx.value.toString(),
      nonce: tx.nonce,
      gas: tx.gas.toString(),
      gasPrice: tx.gasPrice?.toString(),
      input: tx.input,
      blockNumber: tx.blockNumber?.toString(),
      status: receipt?.status,
      gasUsed: receipt?.gasUsed.toString(),
    };
  }
}
