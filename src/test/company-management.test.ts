import { describe, expect, it } from "vitest";
import { companyAvailable, companySuspensionMessage } from "@/lib/company-management";

describe("Owner company management", () => {
  it("removed companies cannot be opened even if active", () => {
    expect(companyAvailable({ active: true, expires_at: null, archived_at: "2026-10-20T05:10:00Z" })).toBe(false);
    expect(companyAvailable({ active: true, expires_at: null, archived_at: null })).toBe(true);
  });
  it("suspending the subscription prevents workspace access", () => {
    expect(companyAvailable({ active: false, expires_at: null })).toBe(false);
  });
  it("shows the owner's custom suspension message", () => {
    expect(companySuspensionMessage({ active: false, expires_at: null, suspension_message: "يرجى التواصل لتجديد الاشتراك" })).toBe("يرجى التواصل لتجديد الاشتراك");
  });
});