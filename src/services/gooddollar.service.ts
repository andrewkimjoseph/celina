import type { CeloClientFactory } from "../clients/celo-client.js";
import { goodDollarIdentityAbi } from "../abis/gooddollar-identity.js";
import { GOODDOLLAR_IDENTITY_ADDRESS } from "../config/gooddollar.js";
import { formatUnixDate } from "../utils/format-date.js";

const STATUS_LABELS: Record<number, string> = {
  0: "none",
  1: "whitelisted",
  2: "dao_contract",
  255: "blacklisted",
};

// Post-upgrade users authenticated before this timestamp use the last reverify step.
const LEGACY_AUTH_CUTOFF = 1772697574;

function statusLabel(status: number): string {
  return STATUS_LABELS[status] ?? "unknown";
}

export class GoodDollarService {
  constructor(private readonly clientFactory: CeloClientFactory) {}

  async getWhitelistingInfo(address: `0x${string}`) {
    const { public: client } = this.clientFactory.getClients();
    const contract = GOODDOLLAR_IDENTITY_ADDRESS;

    const [
      identityResult,
      isCurrentlyWhitelisted,
      maxReverificationPeriodDays,
      reverifyDaysOptions,
    ] = await Promise.all([
      client.readContract({
        address: contract,
        abi: goodDollarIdentityAbi,
        functionName: "identities",
        args: [address],
      }),
      client.readContract({
        address: contract,
        abi: goodDollarIdentityAbi,
        functionName: "isWhitelisted",
        args: [address],
      }),
      client.readContract({
        address: contract,
        abi: goodDollarIdentityAbi,
        functionName: "authenticationPeriod",
      }),
      this.fetchReverifyDaysOptions(client, contract),
    ]);

    const [
      dateAuthenticated,
      dateAdded,
      did,
      whitelistedOnChainId,
      status,
      authCount,
    ] = identityResult;

    const statusNum = Number(status);
    const dateAuthenticatedNum = Number(dateAuthenticated);
    const dateAddedNum = Number(dateAdded);
    const authCountNum = Number(authCount);

    let currentReverificationPeriodDays: number | null = null;
    if (statusNum === 1 && dateAuthenticatedNum > 0 && reverifyDaysOptions.length > 0) {
      const effectiveAuthCount = this.effectiveAuthCount(
        dateAuthenticatedNum,
        authCountNum,
        reverifyDaysOptions.length,
      );
      currentReverificationPeriodDays =
        reverifyDaysOptions[effectiveAuthCount] ?? null;
    }

    const isWhitelistedStatus = statusNum === 1 && dateAddedNum > 0;

    const reverification =
      statusNum === 1 && dateAuthenticatedNum > 0 && currentReverificationPeriodDays !== null
        ? this.buildReverificationProgress(
            dateAuthenticatedNum,
            currentReverificationPeriodDays,
            Number(maxReverificationPeriodDays),
          )
        : null;

    return {
      address,
      contract,
      isCurrentlyWhitelisted,
      status: statusNum,
      statusLabel: statusLabel(statusNum),
      whitelistedOn: isWhitelistedStatus ? formatUnixDate(dateAddedNum) : null,
      lastAuthenticatedOn:
        dateAuthenticatedNum > 0 ? formatUnixDate(dateAuthenticatedNum) : null,
      fieldDescriptions: {
        whitelistedOn:
          "When the wallet was first added to the GoodDollar whitelist.",
        lastAuthenticatedOn:
          "When the wallet last verified its identity. Periodic reverification is required to remain whitelisted.",
      },
      reverification,
      identity: {
        dateAuthenticated: dateAuthenticatedNum,
        dateAdded: dateAddedNum,
        did,
        whitelistedOnChainId: Number(whitelistedOnChainId),
        status: statusNum,
        authCount: authCountNum,
      },
    };
  }

  private effectiveAuthCount(
    dateAuthenticated: number,
    authCount: number,
    optionsLength: number,
  ): number {
    if (dateAuthenticated < LEGACY_AUTH_CUTOFF) {
      return optionsLength - 1;
    }
    if (authCount >= optionsLength) {
      return 0;
    }
    return authCount;
  }

  private async fetchReverifyDaysOptions(
    client: ReturnType<CeloClientFactory["getClients"]>["public"],
    contract: typeof GOODDOLLAR_IDENTITY_ADDRESS,
  ): Promise<number[]> {
    const options: number[] = [];
    for (let index = 0; index < 8; index++) {
      try {
        const value = await client.readContract({
          address: contract,
          abi: goodDollarIdentityAbi,
          functionName: "reverifyDaysOptions",
          args: [BigInt(index)],
        });
        options.push(Number(value));
      } catch {
        break;
      }
    }
    return options;
  }

  private buildReverificationProgress(
    dateAuthenticated: number,
    currentReverificationPeriodDays: number,
    maxReverificationPeriodDays: number,
  ) {
    const nowSec = Math.floor(Date.now() / 1000);
    const daysSinceLastAuthentication = Math.floor(
      (nowSec - dateAuthenticated) / 86400,
    );
    const daysUntilReverificationRequired =
      currentReverificationPeriodDays - daysSinceLastAuthentication;
    const reverificationRequiredTimestamp =
      dateAuthenticated + currentReverificationPeriodDays * 86400;
    const isReverificationOverdue = daysUntilReverificationRequired < 0;
    const reverificationProgressPercent = Math.min(
      100,
      Math.max(
        0,
        Math.round(
          (daysSinceLastAuthentication / currentReverificationPeriodDays) *
            100,
        ),
      ),
    );

    return {
      daysSinceLastAuthentication,
      currentReverificationPeriodDays,
      maxReverificationPeriodDays,
      daysUntilReverificationRequired,
      reverificationRequiredOn: formatUnixDate(reverificationRequiredTimestamp),
      reverificationProgressPercent,
      isReverificationOverdue,
    };
  }
}
