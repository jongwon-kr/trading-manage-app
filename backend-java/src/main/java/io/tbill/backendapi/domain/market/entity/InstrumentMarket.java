package io.tbill.backendapi.domain.market.entity;

/**
 * 시세·분석 대상 시장. backend-python app.market.models.Market 과 동일해야 한다.
 * (매매일지의 MarketType 과는 별개 — 일지는 STOCK 하나로 KR/US 를 구분하지 않음)
 */
public enum InstrumentMarket {
    KR_STOCK,
    US_STOCK,
    CRYPTO
}
