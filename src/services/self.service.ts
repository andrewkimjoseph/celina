import * as ed from "@noble/ed25519";
import {
  concat,
  getAddress,
  hexToBytes,
  isAddressEqual,
  keccak256,
  pad,
  recoverMessageAddress,
  zeroAddress,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { selfRegistryAbi } from "../abis/self-registry.js";
import {
  getAgentInfo,
  requestDeregistration,
  requestProofRefresh,
  requestRegistration,
  SelfApiError,
  SelfExpiredSessionError,
  type SelfRegistrationDisclosures,
} from "../clients/self-api.js";
import type { SelfRegistrationMode } from "../config/self.js";
import type { CeloClientFactory } from "../clients/celo-client.js";
import {
  SELF_DEFAULT_MAX_AGE_MS,
  SELF_DEMO_NETWORK,
  SELF_FETCH_MAX_BYTES,
  SELF_HEADERS,
  SELF_REGISTRY_ADDRESS,
  selfDemoUrl,
} from "../config/self.js";
import { CELINA_DATA_SUFFIX } from "../config/celina-tag.js";
import {
  deleteSelfSession,
  getSelfSession,
  storeSelfSession,
} from "./self-session-store.js";
import {
  formatAgentInfo,
  formatCredentialsSummary,
  proofExpiryFields,
  resolveSelfSessionLinks,
  truncateBody,
} from "../utils/self-format.js";
import { computeSigningMessage } from "../utils/self-signing.js";

export interface VerifySelfAgentParams {
  agentAddress: `0x${string}`;
  requireAge?: 0 | 18 | 21;
  requireOfac?: boolean;
  requireSelfProvider?: boolean;
}

export interface VerifySelfRequestParams {
  agentSignature: Hex;
  agentTimestamp: string;
  method: string;
  path: string;
  body?: string;
  keytype?: string;
  agentKey?: Hex;
}

export interface RegisterSelfAgentParams {
  mode?: SelfRegistrationMode;
  minimumAge?: 0 | 18 | 21;
  ofac?: boolean;
  humanAddress?: `0x${string}`;
  agentName?: string;
  agentDescription?: string;
}

function agentKeyFromAddress(address: `0x${string}`): Hex {
  return pad(address, { size: 32 });
}

function buildSelfSessionPayload(
  session: {
    sessionToken: string;
    deepLink: string;
    scanUrl?: string;
    expiresAt: string;
    humanInstructions: string[];
  },
  extra: Record<string, unknown> = {},
) {
  const { qr_code_url, deep_link } = resolveSelfSessionLinks({
    sessionToken: session.sessionToken,
    deepLink: session.deepLink,
    scanUrl: session.scanUrl,
  });

  return {
    session_id: session.sessionToken,
    qr_code_url,
    qr_url: qr_code_url,
    deep_link,
    expires_at: session.expiresAt,
    instructions: session.humanInstructions.join("\n"),
    ...extra,
  };
}

function normalizeCredentials(raw: {
  nationality: string;
  olderThan: bigint;
  ofac: readonly boolean[];
}) {
  return {
    nationality: raw.nationality || undefined,
    older_than: Number(raw.olderThan),
    ofac_clear: raw.ofac[0] === true,
  };
}

export class SelfService {
  constructor(
    private readonly clientFactory: CeloClientFactory,
    private readonly envSelfAgentPrivateKey?: `0x${string}`,
  ) {}

  private resolveAgentPrivateKey(): `0x${string}` {
    if (this.envSelfAgentPrivateKey) {
      return this.envSelfAgentPrivateKey;
    }

    throw new Error(
      "No Self agent key configured. Set SELF_AGENT_PRIVATE_KEY in the MCP server env.",
    );
  }

  private registryClient() {
    return this.clientFactory.getClients().public;
  }

  private async assertProofRefreshEligible(agentId: number) {
    const client = this.registryClient();
    const agentIdBigInt = BigInt(agentId);

    const [isProofFresh, proofExpiresAtRaw] = await Promise.all([
      client.readContract({
        address: SELF_REGISTRY_ADDRESS,
        abi: selfRegistryAbi,
        functionName: "isProofFresh",
        args: [agentIdBigInt],
      }),
      client.readContract({
        address: SELF_REGISTRY_ADDRESS,
        abi: selfRegistryAbi,
        functionName: "proofExpiresAt",
        args: [agentIdBigInt],
      }),
    ]);

    const expiry = proofExpiryFields(proofExpiresAtRaw);
    const proofExpiresAtSecs = Number(proofExpiresAtRaw);
    const isExpired = !isProofFresh && proofExpiresAtSecs > 0;

    if (isProofFresh) {
      const expiringHint = expiry.is_expiring_soon
        ? ` Proof expires in ${expiry.days_until_expiry} days — refresh will be available after expiry.`
        : "";
      throw new Error(
        `Proof refresh is not available yet for agent #${agentId}. ` +
          `The human proof is still fresh until ${expiry.proof_expires_at ?? "unknown"} ` +
          `(${expiry.days_until_expiry} days remaining).${expiringHint} ` +
          `Self only supports refresh after on-chain proof expiry (isProofFresh is false). ` +
          `Until then, use get_self_identity to monitor expiry; after expiry call refresh_self_proof, ` +
          `or deregister_self_agent then register_self_agent per Self SDK guidance.`,
      );
    }

    if (proofExpiresAtSecs <= 0) {
      throw new Error(
        `Agent #${agentId} has no on-chain human proof to refresh.`,
      );
    }

    return {
      ...expiry,
      is_expired: isExpired,
      is_proof_fresh: isProofFresh,
    };
  }

  async verifyAgent(params: VerifySelfAgentParams) {
    const {
      agentAddress,
      requireAge = 0,
      requireOfac = false,
      requireSelfProvider = true,
    } = params;
    const agentKey = agentKeyFromAddress(agentAddress);
    const client = this.registryClient();

    const isVerified = await client.readContract({
      address: SELF_REGISTRY_ADDRESS,
      abi: selfRegistryAbi,
      functionName: "isVerifiedAgent",
      args: [agentKey],
    });

    if (!isVerified) {
      return {
        verified: false,
        agent_address: agentAddress,
        reason: "Agent is not registered or not verified on-chain.",
        network: "mainnet" as const,
      };
    }

    const agentId = await client.readContract({
      address: SELF_REGISTRY_ADDRESS,
      abi: selfRegistryAbi,
      functionName: "getAgentId",
      args: [agentKey],
    });

    const nullifier = await client.readContract({
      address: SELF_REGISTRY_ADDRESS,
      abi: selfRegistryAbi,
      functionName: "getHumanNullifier",
      args: [agentId],
    });

    const [
      agentCount,
      proofProvider,
      selfProvider,
      registeredAt,
      proofExpiresAtRaw,
      isProofFresh,
      siblingAgentIds,
      rawCredentials,
    ] = await Promise.all([
      client.readContract({
        address: SELF_REGISTRY_ADDRESS,
        abi: selfRegistryAbi,
        functionName: "getAgentCountForHuman",
        args: [nullifier],
      }),
      client.readContract({
        address: SELF_REGISTRY_ADDRESS,
        abi: selfRegistryAbi,
        functionName: "getProofProvider",
        args: [agentId],
      }),
      client.readContract({
        address: SELF_REGISTRY_ADDRESS,
        abi: selfRegistryAbi,
        functionName: "selfProofProvider",
      }),
      client.readContract({
        address: SELF_REGISTRY_ADDRESS,
        abi: selfRegistryAbi,
        functionName: "agentRegisteredAt",
        args: [agentId],
      }),
      client.readContract({
        address: SELF_REGISTRY_ADDRESS,
        abi: selfRegistryAbi,
        functionName: "proofExpiresAt",
        args: [agentId],
      }),
      client.readContract({
        address: SELF_REGISTRY_ADDRESS,
        abi: selfRegistryAbi,
        functionName: "isProofFresh",
        args: [agentId],
      }),
      client.readContract({
        address: SELF_REGISTRY_ADDRESS,
        abi: selfRegistryAbi,
        functionName: "getAgentsForNullifier",
        args: [nullifier],
      }),
      client.readContract({
        address: SELF_REGISTRY_ADDRESS,
        abi: selfRegistryAbi,
        functionName: "getAgentCredentials",
        args: [agentId],
      }),
    ]);

    const credentials = normalizeCredentials(rawCredentials);
    const expiryFields = {
      ...proofExpiryFields(proofExpiresAtRaw),
      sibling_agent_ids: siblingAgentIds.map((id) => Number(id)),
    };

    const failures: string[] = [];

    if (
      requireSelfProvider &&
      !isAddressEqual(proofProvider, selfProvider)
    ) {
      failures.push(
        `Agent's proof provider (${proofProvider}) does not match Self Protocol provider (${selfProvider}).`,
      );
    }

    if (requireAge > 0 && credentials.older_than < requireAge) {
      failures.push(
        `Agent's verified age (${credentials.older_than}+) does not meet minimum age requirement (${requireAge}+).`,
      );
    }

    if (requireOfac && !credentials.ofac_clear) {
      failures.push("Agent has not passed OFAC screening.");
    }

    const isSelfProvider = isAddressEqual(proofProvider, selfProvider);
    let verificationStrength = "unknown";
    if (isSelfProvider) {
      verificationStrength = "self-protocol";
    } else if (!isAddressEqual(proofProvider, zeroAddress)) {
      verificationStrength = "third-party";
    }

    if (failures.length > 0) {
      return {
        verified: false,
        agent_address: agentAddress,
        agent_id: Number(agentId),
        reason: failures.join(" "),
        credentials,
        ...expiryFields,
        verification_strength: verificationStrength,
        network: "mainnet" as const,
      };
    }

    return {
      verified: true,
      agent_address: agentAddress,
      agent_id: Number(agentId),
      credentials,
      ...expiryFields,
      verification_strength: verificationStrength,
      registered_at: Number(registeredAt),
      agent_count: Number(agentCount),
      is_proof_fresh: isProofFresh,
      network: "mainnet" as const,
    };
  }

  async lookupAgent(agentId: number) {
    const info = await getAgentInfo(agentId);
    const formatted = formatAgentInfo(info);
    const credentialsSummary = formatCredentialsSummary(
      info.credentials as
        | { nationality?: string; olderThan?: number; ofac?: boolean[] }
        | undefined,
    );

    const client = this.registryClient();
    const [proofExpiresAtRaw, isProofFresh] = await Promise.all([
      client.readContract({
        address: SELF_REGISTRY_ADDRESS,
        abi: selfRegistryAbi,
        functionName: "proofExpiresAt",
        args: [BigInt(agentId)],
      }),
      client.readContract({
        address: SELF_REGISTRY_ADDRESS,
        abi: selfRegistryAbi,
        functionName: "isProofFresh",
        args: [BigInt(agentId)],
      }),
    ]);

    const proofExpiresAtSecs = Number(proofExpiresAtRaw);

    return {
      ...formatted,
      credentialsSummary,
      ...proofExpiryFields(proofExpiresAtRaw),
      is_expired: !isProofFresh && proofExpiresAtSecs > 0,
      network: "mainnet" as const,
    };
  }

  async verifyRequest(params: VerifySelfRequestParams) {
    const {
      agentSignature,
      agentTimestamp,
      method,
      path,
      body,
      keytype,
      agentKey,
    } = params;

    const ts = parseInt(agentTimestamp, 10);
    if (Number.isNaN(ts) || Math.abs(Date.now() - ts) > SELF_DEFAULT_MAX_AGE_MS) {
      return {
        valid: false,
        reason: "Timestamp expired or invalid",
      };
    }

    const message = computeSigningMessage(
      agentTimestamp,
      method,
      path,
      body,
    );
    let signerAddress: `0x${string}`;
    let derivedAgentKey: Hex;

    if (keytype === "ed25519") {
      if (!agentKey) {
        return { valid: false, reason: "Missing agent key for Ed25519 verification" };
      }

      try {
        const valid = await ed.verifyAsync(
          hexToBytes(agentSignature),
          hexToBytes(message),
          hexToBytes(agentKey),
        );
        if (!valid) {
          return { valid: false, reason: "Invalid Ed25519 signature" };
        }
      } catch {
        return { valid: false, reason: "Invalid Ed25519 signature" };
      }

      derivedAgentKey = agentKey;
      const hash = keccak256(hexToBytes(agentKey));
      signerAddress = getAddress(`0x${hash.slice(-40)}`);
    } else {
      try {
        signerAddress = await recoverMessageAddress({
          message: { raw: hexToBytes(message) },
          signature: agentSignature,
        });
      } catch {
        return { valid: false, reason: "Invalid signature" };
      }

      derivedAgentKey = agentKeyFromAddress(signerAddress);
    }

    const client = this.registryClient();
    const isVerified = await client.readContract({
      address: SELF_REGISTRY_ADDRESS,
      abi: selfRegistryAbi,
      functionName: "isVerifiedAgent",
      args: [derivedAgentKey],
    });

    if (!isVerified) {
      return {
        valid: false,
        agent_address: signerAddress,
        reason: "Agent not verified on-chain",
      };
    }

    const agentId = await client.readContract({
      address: SELF_REGISTRY_ADDRESS,
      abi: selfRegistryAbi,
      functionName: "getAgentId",
      args: [derivedAgentKey],
    });

    const nullifier = await client.readContract({
      address: SELF_REGISTRY_ADDRESS,
      abi: selfRegistryAbi,
      functionName: "getHumanNullifier",
      args: [agentId],
    });

    const [isProofFresh, agentCount, proofProvider, selfProvider, rawCredentials] =
      await Promise.all([
        client.readContract({
          address: SELF_REGISTRY_ADDRESS,
          abi: selfRegistryAbi,
          functionName: "isProofFresh",
          args: [agentId],
        }),
        client.readContract({
          address: SELF_REGISTRY_ADDRESS,
          abi: selfRegistryAbi,
          functionName: "getAgentCountForHuman",
          args: [nullifier],
        }),
        client.readContract({
          address: SELF_REGISTRY_ADDRESS,
          abi: selfRegistryAbi,
          functionName: "getProofProvider",
          args: [agentId],
        }),
        client.readContract({
          address: SELF_REGISTRY_ADDRESS,
          abi: selfRegistryAbi,
          functionName: "selfProofProvider",
        }),
        client.readContract({
          address: SELF_REGISTRY_ADDRESS,
          abi: selfRegistryAbi,
          functionName: "getAgentCredentials",
          args: [agentId],
        }),
      ]);

    if (!isProofFresh) {
      return {
        valid: false,
        agent_address: signerAddress,
        agent_id: Number(agentId),
        reason: "Agent's human proof has expired",
      };
    }

    if (!isAddressEqual(proofProvider, selfProvider)) {
      return {
        valid: false,
        agent_address: signerAddress,
        agent_id: Number(agentId),
        reason: "Agent was not verified by Self — proof provider mismatch",
      };
    }

    const credentials = normalizeCredentials(rawCredentials);

    return {
      valid: true,
      agent_address: signerAddress,
      agent_id: Number(agentId),
      agent_count: Number(agentCount),
      nullifier: Number(nullifier),
      credentials,
      note:
        "Replay protection is not enforced at the MCP layer. If you are building a service, implement your own nonce or replay cache.",
    };
  }

  private async getAgentInfoFromKey(privateKey: `0x${string}`) {
    const account = privateKeyToAccount(privateKey);
    const agentKey = agentKeyFromAddress(account.address);
    const client = this.registryClient();

    const agentId = await client.readContract({
      address: SELF_REGISTRY_ADDRESS,
      abi: selfRegistryAbi,
      functionName: "getAgentId",
      args: [agentKey],
    });

    if (agentId === 0n) {
      return {
        registered: false as const,
        address: account.address,
        network: "mainnet" as const,
      };
    }

    const nullifier = await client.readContract({
      address: SELF_REGISTRY_ADDRESS,
      abi: selfRegistryAbi,
      functionName: "getHumanNullifier",
      args: [agentId],
    });

    const [
      isVerified,
      agentCount,
      proofExpiresAt,
      isProofFresh,
      siblingAgentIds,
      proofProvider,
      selfProvider,
      rawCredentials,
    ] = await Promise.all([
      client.readContract({
        address: SELF_REGISTRY_ADDRESS,
        abi: selfRegistryAbi,
        functionName: "hasHumanProof",
        args: [agentId],
      }),
      client.readContract({
        address: SELF_REGISTRY_ADDRESS,
        abi: selfRegistryAbi,
        functionName: "getAgentCountForHuman",
        args: [nullifier],
      }),
      client.readContract({
        address: SELF_REGISTRY_ADDRESS,
        abi: selfRegistryAbi,
        functionName: "proofExpiresAt",
        args: [agentId],
      }),
      client.readContract({
        address: SELF_REGISTRY_ADDRESS,
        abi: selfRegistryAbi,
        functionName: "isProofFresh",
        args: [agentId],
      }),
      client.readContract({
        address: SELF_REGISTRY_ADDRESS,
        abi: selfRegistryAbi,
        functionName: "getAgentsForNullifier",
        args: [nullifier],
      }),
      client.readContract({
        address: SELF_REGISTRY_ADDRESS,
        abi: selfRegistryAbi,
        functionName: "getProofProvider",
        args: [agentId],
      }),
      client.readContract({
        address: SELF_REGISTRY_ADDRESS,
        abi: selfRegistryAbi,
        functionName: "selfProofProvider",
      }),
      client.readContract({
        address: SELF_REGISTRY_ADDRESS,
        abi: selfRegistryAbi,
        functionName: "getAgentCredentials",
        args: [agentId],
      }),
    ]);

    const credentialsSummary = formatCredentialsSummary({
      nationality: rawCredentials.nationality,
      olderThan: rawCredentials.olderThan,
      ofac: [...rawCredentials.ofac],
    });

    const expiry = proofExpiryFields(proofExpiresAt);
    const proofExpiresAtSecs = Number(proofExpiresAt);
    const isExpired = !isProofFresh && proofExpiresAtSecs > 0;

    let verificationStrength = "unknown";
    if (isAddressEqual(proofProvider, selfProvider)) {
      verificationStrength = "self-protocol";
    } else if (!isAddressEqual(proofProvider, zeroAddress)) {
      verificationStrength = "third-party";
    }

    let expiryWarning: string | undefined;
    if (isExpired) {
      expiryWarning =
        "Your proof has EXPIRED. Call refresh_self_proof to renew it, or deregister_self_agent then register_self_agent.";
    } else if (expiry.is_expiring_soon) {
      expiryWarning = `Your proof expires in ${expiry.days_until_expiry} days. After expiry, call refresh_self_proof or deregister and re-register.`;
    }

    return {
      registered: true as const,
      address: account.address,
      agentKey,
      agentId: Number(agentId),
      isVerified,
      nullifier: Number(nullifier),
      agentCount: Number(agentCount),
      verificationStrength,
      credentials_summary: credentialsSummary,
      ...expiry,
      is_expired: isExpired,
      sibling_agent_ids: siblingAgentIds.map((id) => Number(id)),
      network: "mainnet" as const,
      ...(expiryWarning ? { expiry_warning: expiryWarning } : {}),
    };
  }

  async getIdentity() {
    const privateKey = this.resolveAgentPrivateKey();
    const info = await this.getAgentInfoFromKey(privateKey);

    if (!info.registered) {
      return {
        ...info,
        message:
          "This agent address is not registered on-chain. Use register_self_agent to register, or lookup_self_agent to check a different agent.",
      };
    }

    return info;
  }

  async registerAgent(params: RegisterSelfAgentParams = {}) {
    const disclosures: SelfRegistrationDisclosures = {
      ...(params.minimumAge != null ? { minimumAge: params.minimumAge } : {}),
      ...(params.ofac != null ? { ofac: params.ofac } : {}),
    };

    const session = await requestRegistration({
      mode: params.mode,
      disclosures,
      humanAddress: params.humanAddress,
      agentName: params.agentName,
      agentDescription: params.agentDescription,
    });

    storeSelfSession(session.sessionToken, {
      kind: "registration",
      session,
      createdAt: Date.now(),
    });

    return buildSelfSessionPayload(session, {
      agent_address: session.agentAddress,
      next_step:
        "Have the human scan the QR/deep link, then call check_self_registration with this session_id. The private key will be returned only after verification completes.",
    });
  }

  async checkRegistration(sessionId: string) {
    const entry = getSelfSession(sessionId);
    if (!entry) {
      throw new Error(
        `No active session found for "${sessionId}". Sessions expire after 10 minutes and are lost when the server restarts. Use register_self_agent or refresh_self_proof to start a new session.`,
      );
    }

    const isRefresh = entry.kind === "refresh";
    const isDeregister = entry.kind === "deregistration";

    try {
      const result = await entry.session.waitForCompletion({
        timeoutMs: 5000,
        pollIntervalMs: 2000,
      });

      if (isDeregister) {
        deleteSelfSession(sessionId);
        return {
          status: "deregistered" as const,
          message: "Agent deregistered successfully.",
        };
      }

      if (isRefresh) {
        deleteSelfSession(sessionId);
        const refreshResult = result as { proofExpiresAt: Date };
        return {
          status: "refreshed" as const,
          proof_expires_at: refreshResult.proofExpiresAt.toISOString(),
          message:
            "Proof refreshed successfully! The agent's human proof has been renewed.",
        };
      }

      const registrationSession = entry.session as import("../clients/self-api.js").SelfRegistrationSession;
      let privateKeyHex: string;
      try {
        privateKeyHex = await registrationSession.exportKey();
      } catch (error) {
        throw new Error(
          `Registration completed, but key export is not available yet: ${error instanceof Error ? error.message : String(error)}. Call check_self_registration again in a few seconds.`,
        );
      }

      deleteSelfSession(sessionId);
      const registrationResult = result as import("../clients/self-api.js").SelfRegistrationResult;

      return {
        status: "verified" as const,
        agent_id: registrationResult.agentId,
        agent_address: registrationResult.agentAddress,
        private_key_hex: privateKeyHex,
        tx_hash: registrationResult.txHash,
        message:
          "Agent registered successfully! Set SELF_AGENT_PRIVATE_KEY to private_key_hex to use this identity.",
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const lowerMessage = message.toLowerCase();

      if (
        lowerMessage.includes("timeout") ||
        lowerMessage.includes("did not complete within")
      ) {
        return {
          status: "pending" as const,
          message: isDeregister
            ? "Deregistration not yet complete. The human has not scanned the QR code yet. Call check_self_registration again to keep polling."
            : isRefresh
              ? "Proof refresh not yet complete. The human has not scanned the QR code yet. Call check_self_registration again to keep polling."
              : "Registration not yet complete. The human has not scanned the QR code yet. Call check_self_registration again to keep polling.",
        };
      }

      if (error instanceof SelfExpiredSessionError) {
        deleteSelfSession(sessionId);
        return {
          status: "expired" as const,
          message: isDeregister
            ? "Deregistration session expired. Use deregister_self_agent to start again."
            : isRefresh
              ? "Refresh session expired. Use refresh_self_proof to start a new refresh."
              : "Registration session expired. Use register_self_agent to start a new registration.",
        };
      }

      if (error instanceof SelfApiError) {
        throw error;
      }

      throw error instanceof Error ? error : new Error(message);
    }
  }

  async refreshProof(params: { agentId?: number } = {}) {
    let agentId = params.agentId;

    if (agentId == null) {
      const privateKey = this.resolveAgentPrivateKey();
      const info = await this.getAgentInfoFromKey(privateKey);
      if (!info.registered) {
        throw new Error(
          "Configured agent is not registered on-chain. Provide agent_id explicitly.",
        );
      }
      agentId = info.agentId;
    }

    const proofStatus = await this.assertProofRefreshEligible(agentId);

    const session = await requestProofRefresh({ agentId });
    storeSelfSession(session.sessionToken, {
      kind: "refresh",
      session,
      createdAt: Date.now(),
    });

    return buildSelfSessionPayload(session, {
      agent_id: agentId,
      ...proofStatus,
      next_step:
        "Have the human scan the QR/deep link with the Self app, then call check_self_registration with this session_id to poll for completion.",
    });
  }

  async deregisterAgent() {
    const privateKey = this.resolveAgentPrivateKey();
    const account = privateKeyToAccount(privateKey);

    const session = await requestDeregistration({
      agentAddress: account.address,
    });

    storeSelfSession(session.sessionToken, {
      kind: "deregistration",
      session,
      createdAt: Date.now(),
    });

    return buildSelfSessionPayload(session, {
      warning:
        "WARNING: Deregistration is IRREVERSIBLE. The agent's on-chain identity will be permanently revoked. The human owner must scan the QR code with the Self app to confirm.",
      next_step:
        "After the human scans the QR code, call check_self_registration with this session_id to poll for completion.",
    });
  }

  async signRequest(params: {
    method: string;
    url: string;
    body?: string;
  }) {
    const privateKey = this.resolveAgentPrivateKey();
    const account = privateKeyToAccount(privateKey);
    const timestamp = Date.now().toString();
    const message = computeSigningMessage(
      timestamp,
      params.method,
      params.url,
      params.body,
    );
    const signature = await account.signMessage({
      message: { raw: hexToBytes(message) },
    });

    return {
      headers: {
        [SELF_HEADERS.ADDRESS]: account.address,
        [SELF_HEADERS.SIGNATURE]: signature,
        [SELF_HEADERS.TIMESTAMP]: timestamp,
      },
      instructions:
        `Add these three headers to your HTTP request. The receiving service can verify them with verify_self_request to confirm this agent is backed by a real human. For Self demo APIs use ?network=${SELF_DEMO_NETWORK} (e.g. POST ${selfDemoUrl("/api/demo/verify")}).`,
    };
  }

  async authenticatedFetch(params: {
    method: string;
    url: string;
    body?: string;
    contentType?: string;
  }) {
    const privateKey = this.resolveAgentPrivateKey();
    const account = privateKeyToAccount(privateKey);
    const method = params.method.toUpperCase();
    const body = params.body;
    const timestamp = Date.now().toString();
    const message = computeSigningMessage(timestamp, method, params.url, body);
    const signature = await account.signMessage({
      message: { raw: hexToBytes(message) },
    });

    const response = await fetch(params.url, {
      method,
      body,
      headers: {
        ...(params.contentType ? { "Content-Type": params.contentType } : {}),
        [SELF_HEADERS.ADDRESS]: account.address,
        [SELF_HEADERS.SIGNATURE]: signature,
        [SELF_HEADERS.TIMESTAMP]: timestamp,
      },
    });

    const rawBody = await response.text();
    const { body: truncatedBody, truncated } = truncateBody(
      rawBody,
      SELF_FETCH_MAX_BYTES,
    );

    return {
      status: response.status,
      body: truncatedBody,
      truncated,
    };
  }

  /** Reserved for future on-chain Self writes (e.g. metadata updates). */
  protected taggedCalldata(data: Hex): Hex {
    return concat([data, CELINA_DATA_SUFFIX]);
  }
}
