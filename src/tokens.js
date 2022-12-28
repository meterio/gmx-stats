export const allTokens = {
  metertest: {
    MTR: {
      name: "MTR",
      address: "0xfAC315d105E5A7fe2174B3EB1f95C257A9A5e271",
      decimals: 18,
      priceFeed: "0xCd5CB72EF809059Fa10773c6a4E13C9aa7D1983f",
      priceDecimals: 18,
      fastPricePrecision: 1000,
      maxCumulativeDeltaDiff: 0.10 * 10 * 1000 * 1000, // 10%
      isStrictStable: false,
      tokenWeight: 7000,
      minProfitBps: 0,
      maxUsdgAmount: 5 * 1000 *1000,
      bufferAmount: 200000,
      isStable: false,
      isShortable: true,
      maxGlobalLongSize: 1 * 1000 * 1000,
      maxGlobalShortSize: 500 * 1000,
      spreadBasisPoints: 0
    },
    MTRG: {
      name: "MTRG",
      address: "0x8a419ef4941355476cf04933e90bf3bbf2f73814",
      decimals: 18,
      priceFeed: "0x10312f9cc653c09E30789e053be322D17b0C7cF5",
      priceDecimals: 18,
      fastPricePrecision: 1000,
      maxCumulativeDeltaDiff: 0.10 * 10 * 1000 * 1000, // 10%
      isStrictStable: false,
      tokenWeight: 20000,
      minProfitBps: 0,
      maxUsdgAmount: 30 * 1000 * 1000,
      bufferAmount: 5500,
      isStable: false,
      isShortable: true,
      maxGlobalLongSize: 15 * 1000 * 1000,
      maxGlobalShortSize: 8 * 1000 * 1000
    }
  }
}
