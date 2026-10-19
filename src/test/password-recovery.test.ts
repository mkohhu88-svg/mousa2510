import { describe, expect, it } from "vitest";
import { recoveryLinkState } from "@/lib/password-recovery";

describe("password recovery link authorization", () => {
  it("rejects expired recovery links", () => {
    expect(recoveryLinkState("#error=access_denied&error_code=otp_expired", "")).toBe("invalid");
  });
  it("does not accept ordinary sign-in tokens as recovery", () => {
    expect(recoveryLinkState("#type=signup&access_token=test", "")).toBe("missing");
  });
  it("requires a recovery token, not just a type flag", () => {
    expect(recoveryLinkState("#type=recovery", "")).toBe("missing");
    expect(recoveryLinkState("#type=recovery&access_token=test", "")).toBe("recovery");
  });
  it("rejects query errors before accepting a recovery fragment", () => {
    expect(recoveryLinkState("#type=recovery&access_token=test", "?error=access_denied")).toBe("invalid");
  });
});