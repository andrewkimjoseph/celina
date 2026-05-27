import { describe, expect, it } from "vitest";
import {
  formatSelfSessionLinksDisplay,
  resolveSelfSessionLinks,
} from "../../src/utils/self-format.js";
import { okSelfSession } from "../../src/tools/helpers.js";

describe("resolveSelfSessionLinks", () => {
  it("uses scanUrl when provided", () => {
    expect(
      resolveSelfSessionLinks({
        sessionToken: "abc123",
        deepLink: "self://register/abc123",
        scanUrl: "https://app.ai.self.xyz/scan/custom",
      }),
    ).toEqual({
      qr_code_url: "https://app.ai.self.xyz/scan/custom",
      deep_link: "self://register/abc123",
    });
  });

  it("falls back to the default QR URL from session token", () => {
    expect(
      resolveSelfSessionLinks({
        sessionToken: "abc123",
        deepLink: "self://register/abc123",
      }),
    ).toEqual({
      qr_code_url: "https://app.ai.self.xyz/scan/abc123",
      deep_link: "self://register/abc123",
    });
  });

  it("throws when deep link is missing", () => {
    expect(() =>
      resolveSelfSessionLinks({
        sessionToken: "abc123",
        deepLink: "",
      }),
    ).toThrow("missing a deep link");
  });
});

describe("okSelfSession", () => {
  it("includes both links in tool text and structured content", () => {
    const result = okSelfSession({
      session_id: "abc123",
      qr_code_url: "https://app.ai.self.xyz/scan/abc123",
      deep_link: "self://register/abc123",
      agent_address: "0xabc",
    });

    const text = result.content[0]?.text ?? "";
    expect(text).toContain("QR code URL: https://app.ai.self.xyz/scan/abc123");
    expect(text).toContain("Deep link: self://register/abc123");
    expect(text).toContain("Present BOTH links");
    expect(result.structuredContent).toMatchObject({
      qr_code_url: "https://app.ai.self.xyz/scan/abc123",
      qr_url: "https://app.ai.self.xyz/scan/abc123",
      deep_link: "self://register/abc123",
    });
  });

  it("formats a readable display block", () => {
    const display = formatSelfSessionLinksDisplay({
      qr_code_url: "https://app.ai.self.xyz/scan/abc123",
      deep_link: "self://register/abc123",
    });

    expect(display).toContain("QR code URL:");
    expect(display).toContain("Deep link:");
    expect(display).toContain("never omit one");
  });
});
