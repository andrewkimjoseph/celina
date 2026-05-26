import { erc20Abi, parseEther } from "viem";
import type { CeloClientFactory, CeloClients } from "../clients/celo-client.js";
import { CELINA_DATA_SUFFIX } from "../config/celina-tag.js";
import { decryptPrivateKey } from "../crypto/wallet-key-crypto.js";
import { TokenService } from "./token.service.js";

export class TransactionService {
  private readonly tokenService: TokenService;

  constructor(private readonly clientFactory: CeloClientFactory) {
    this.tokenService = new TokenService(clientFactory);
  }

  private resolveClients(encryptedPrivateKey?: string): CeloClients {
    if (encryptedPrivateKey) {
      const privateKey = decryptPrivateKey(encryptedPrivateKey);
      return this.clientFactory.getClientsForAccount(privateKey);
    }

    const clients = this.clientFactory.getClients();
    if (!clients.wallet || !clients.accountAddress) {
      throw new Error(
        "No wallet configured. Set CELO_PRIVATE_KEY in the MCP server env.",
      );
    }

    return clients;
  }

  async estimateSend(
    to: `0x${string}`,
    token: string,
    amount: string,
    encryptedPrivateKey?: string,
  ) {
    const { public: client, accountAddress: from } = this.resolveClients(
      encryptedPrivateKey,
    );

    if (!from) {
      throw new Error("Wallet address unavailable.");
    }

    const resolved = this.tokenService.resolveToken(token);

    if (resolved.address === "native") {
      const value = parseEther(amount);
      const gas = await client.estimateGas({
        account: from,
        to,
        value,
      });

      return {
        network: "mainnet",
        from,
        to,
        token: resolved.symbol,
        amount,
        gas: gas.toString(),
      };
    }

    const tokenAmount = this.tokenService.parseAmount(amount, resolved.decimals);
    const gas = await client.estimateContractGas({
      account: from,
      address: resolved.address,
      abi: erc20Abi,
      functionName: "transfer",
      args: [to, tokenAmount],
    });

    return {
      network: "mainnet",
      from,
      to,
      token: resolved.symbol,
      amount,
      gas: gas.toString(),
    };
  }

  async sendToken(
    to: `0x${string}`,
    token: string,
    amount: string,
    encryptedPrivateKey?: string,
  ) {
    const { public: client, wallet, accountAddress: from } = this.resolveClients(
      encryptedPrivateKey,
    );

    if (!wallet || !from) {
      throw new Error(
        "Wallet client unavailable. Set CELO_PRIVATE_KEY in the MCP server env.",
      );
    }

    const account = wallet.account;
    if (!account) {
      throw new Error("Wallet account unavailable.");
    }

    const resolved = this.tokenService.resolveToken(token);
    const chain = client.chain;
    if (!chain) {
      throw new Error("Chain configuration missing");
    }

    if (resolved.address === "native") {
      const hash = await wallet.sendTransaction({
        chain,
        account,
        to,
        value: parseEther(amount),
        data: CELINA_DATA_SUFFIX,
      });

      const receipt = await client.waitForTransactionReceipt({ hash });
      return {
        network: "mainnet",
        hash,
        status: receipt.status,
        from,
        to,
        token: resolved.symbol,
        amount,
      };
    }

    const tokenAmount = this.tokenService.parseAmount(amount, resolved.decimals);
    const hash = await wallet.writeContract({
      chain,
      account,
      address: resolved.address,
      abi: erc20Abi,
      functionName: "transfer",
      args: [to, tokenAmount],
      dataSuffix: CELINA_DATA_SUFFIX,
    });

    const receipt = await client.waitForTransactionReceipt({ hash });
    return {
      network: "mainnet",
      hash,
      status: receipt.status,
      from,
      to,
      token: resolved.symbol,
      amount,
    };
  }
}
