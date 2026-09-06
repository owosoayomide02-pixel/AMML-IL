import { describe, expect, it } from "vitest";
import { isSafePublicUrl, needsWebBrowse } from "@/lib/ai/web";

describe("needsWebBrowse", () => {
  it("browses market and lookup questions", () => {
    expect(needsWebBrowse("Look up Siemens 24V relay prices in Nigeria")).toBe(true);
    expect(needsWebBrowse("What is an Omron proximity sensor?")).toBe(true);
    expect(needsWebBrowse("Search the web for naira dollar news")).toBe(true);
  });

  it("stays on the books for clear internal questions", () => {
    expect(needsWebBrowse("What is this month's revenue?")).toBe(false);
    expect(needsWebBrowse("How many unpaid invoices do we have?")).toBe(false);
  });
});

describe("isSafePublicUrl", () => {
  it("allows public https and blocks local addresses", () => {
    expect(isSafePublicUrl("https://en.wikipedia.org/wiki/Relay")).toBe(true);
    expect(isSafePublicUrl("http://127.0.0.1/secret")).toBe(false);
    expect(isSafePublicUrl("http://192.168.1.8/admin")).toBe(false);
  });
});
