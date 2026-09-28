import { describe, expect, it } from "vitest";
import { changeColorClass, cryptoPrecision, formatMoney, formatPercent, formatPrice, formatSigned } from "./format";

describe("format", () => {
  it("시장별 가격 자릿수", () => {
    expect(formatPrice(271500, "KR_STOCK")).toBe("271,500");
    expect(formatPrice(341.069, "US_STOCK")).toBe("341.07");
    expect(formatPrice(112934000, "CRYPTO")).toBe("112,934,000");
    expect(formatPrice(25.8, "CRYPTO")).toBe("25.80");
    expect(formatPrice(null, "KR_STOCK")).toBe("-");
  });

  it("코인 자릿수는 가격대별", () => {
    expect(cryptoPrecision(1500)).toBe(0);
    expect(cryptoPrecision(150)).toBe(1);
    expect(cryptoPrecision(0.05)).toBe(6);
  });

  it("등락률은 부호 포함", () => {
    expect(formatPercent(0.0153)).toBe("+1.53%");
    expect(formatPercent(-0.049)).toBe("-4.90%");
    expect(formatPercent(0)).toBe("0.00%");
    expect(formatPercent(0.1085, 1, false)).toBe("10.9%");
  });

  it("부호 포함 가격·통화", () => {
    expect(formatSigned(-14000, "KR_STOCK")).toBe("-14,000");
    expect(formatSigned(5.15, "US_STOCK")).toBe("+5.15");
    expect(formatMoney(341.07, "US_STOCK")).toBe("$341.07");
    expect(formatMoney(271500, "KR_STOCK")).toBe("271,500원");
  });

  it("한국식 등락 색", () => {
    expect(changeColorClass(0.01)).toBe("text-price-up");
    expect(changeColorClass(-0.01)).toBe("text-price-down");
    expect(changeColorClass(0)).toBe("text-muted-foreground");
  });
});
