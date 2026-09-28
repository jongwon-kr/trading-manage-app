import { describe, expect, it } from "vitest";
import { journalSymbolPath, parseMarketParam, symbolPath } from "./market";

describe("market", () => {
  it("URL slug ↔ 시장 코드", () => {
    expect(parseMarketParam("kr")).toBe("KR_STOCK");
    expect(parseMarketParam("CRYPTO")).toBe("CRYPTO");
    expect(parseMarketParam("fx")).toBeNull();
    expect(symbolPath("US_STOCK", "BRK-B")).toBe("/market/us/BRK-B");
  });

  it("일지 시장·코드로 상세 경로 추정", () => {
    expect(journalSymbolPath("STOCK", "005930")).toBe("/market/kr/005930");
    expect(journalSymbolPath("STOCK", "aapl")).toBe("/market/us/AAPL");
    expect(journalSymbolPath("CRYPTO", "btc")).toBe("/market/crypto/KRW-BTC");
    expect(journalSymbolPath("CRYPTO", "KRW-ETH")).toBe("/market/crypto/KRW-ETH");
    expect(journalSymbolPath("FOREX", "EURUSD")).toBeNull();
  });
});
