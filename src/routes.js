import { BigNumber, ethers } from "ethers";
import React from "react";
import { StaticRouter } from "react-router-dom";
import { renderToString } from "react-dom/server";
import Token from "../abis/v1/Token.json";
import Reader from "../abis/Reader.json";
import IWitnetFeed from "../abis/IWitnetFeed.json";
import { createHttpError } from "./utils";
import { gql } from "@apollo/client";
import { METERTEST, AVALANCHE, getAddress } from "./addresses";
import { ApolloClient, InMemoryCache, HttpLink } from "@apollo/client";
import fetch from "cross-fetch";
import {
  getPricesLimit,
  getLastUpdatedTimestamp,
  VALID_PERIODS,
} from "./prices";

import App from "./App";
import { getLogger } from "./helpers";
import { queryEarnData } from "./dataProvider";
import { allTokens } from "./tokens";

export function expandDecimals(n, decimals) {
  return ethers.BigNumber.from(n).mul(ethers.BigNumber.from(10).pow(decimals));
}

const apolloOptions = {
  query: {
    fetchPolicy: "no-cache",
  },
  watchQuery: {
    fetchPolicy: "no-cache",
  },
};
const meterStatsClient = new ApolloClient({
  link: new HttpLink({
    uri: "http://graphtest.meter.io:8000/subgraphs/name/gmx/gmx-stats",
    fetch,
  }),
  cache: new InMemoryCache(),
  defaultOptions: apolloOptions,
});

const IS_PRODUCTION = process.env.NODE_ENV === "production";

const assets = require(process.env.RAZZLE_ASSETS_MANIFEST);

const { JsonRpcProvider } = ethers.providers;
const providers = {
  [METERTEST]: new JsonRpcProvider("https://rpctest.meter.io"),
};

function getProvider(chainName) {
  if (!(chainName in providers)) {
    throw new Error(`Unknown chain ${chainName}`);
  }
  return providers[chainName];
}

const cssLinksFromAssets = (assets, entrypoint) => {
  return assets[entrypoint]
    ? assets[entrypoint].css
      ? assets[entrypoint].css
          .map((asset) => `<link rel="stylesheet" href="${asset}">`)
          .join("")
      : ""
    : "";
};

const jsScriptTagsFromAssets = (assets, entrypoint, extra = "") => {
  return assets[entrypoint]
    ? assets[entrypoint].js
      ? assets[entrypoint].js
          .map((asset) => `<script src="${asset}"${extra}></script>`)
          .join("")
      : ""
    : "";
};

const { formatUnits } = ethers.utils;

const logger = getLogger("routes");

export default function routes(app) {
  app.get("/api/earn/:account", async (req, res, next) => {
    const chainName = req.query.chain || "arbitrum";
    const validChainNames = new Set(["arbitrum", "avalanche"]);
    if (!validChainNames.has(chainName)) {
      next(
        createHttpError(400, `Valid chains are: ${Array.from(validChainNames)}`)
      );
      return;
    }
    try {
      const earnData = await queryEarnData(chainName, req.params.account);
      res.send(earnData);
    } catch (ex) {
      logger.error(ex);
      next(createHttpError(500, ex.message));
      return;
    }
  });

  app.get("/api/gmx_supply", async (req, res) => {
    const provider = getProvider(METERTEST);
    const gmx = new ethers.Contract(
      getAddress(METERTEST, "GMX"),
      Token.abi,
      provider
    );
    const totalSupply = await gmx.totalSupply();
    res.set("Content-Type", "text/plain");
    res.send(formatUnits(totalSupply));
  });
  app.get("/api/ui_version", async (req, res) => {
    res.set("Content-Type", "text/plain");
    res.send("1.0");
  });

  async function getInfoTokens() {
    const tokenArr = Object.values(allTokens.metertest);
    const provider = getProvider(METERTEST);
    const reader = new ethers.Contract(
      getAddress(METERTEST, "Reader"),
      Reader.abi,
      provider
    );
    const vaultTokenInfo = await reader.getVaultTokenInfo(
      getAddress(METERTEST, "Vault"),
      getAddress(METERTEST, "MTR"),
      expandDecimals(1, 18),
      tokenArr.map((t) => t.address)
    );
    const infoTokens = {};
    const vaultPropsLength = 10;

    for (let i = 0; i < tokenArr.length; i++) {
      const token = JSON.parse(JSON.stringify(tokenArr[i]));

      token.poolAmount = vaultTokenInfo[i * vaultPropsLength];
      token.reservedAmount = vaultTokenInfo[i * vaultPropsLength + 1];
      token.usdgAmount = vaultTokenInfo[i * vaultPropsLength + 2];
      token.redemptionAmount = vaultTokenInfo[i * vaultPropsLength + 3];
      token.weight = vaultTokenInfo[i * vaultPropsLength + 4];
      token.minPrice = vaultTokenInfo[i * vaultPropsLength + 5];
      token.maxPrice = vaultTokenInfo[i * vaultPropsLength + 6];
      token.guaranteedUsd = vaultTokenInfo[i * vaultPropsLength + 7];
      token.maxPrimaryPrice = vaultTokenInfo[i * vaultPropsLength + 8];
      token.minPrimaryPrice = vaultTokenInfo[i * vaultPropsLength + 9];

      infoTokens[token.address] = token;
    }

    return infoTokens;
  }

  app.get("/api/tokens", async (req, res) => {
    const tokenArr = Object.values(allTokens.metertest);
    const provider = getProvider(METERTEST);
    const reader = new ethers.Contract(
      getAddress(METERTEST, "Reader"),
      Reader.abi,
      provider
    );
    const vaultTokenInfo = await getInfoTokens();
    let results = [];
    for (let i = 0; i < tokenArr.length; i++) {
      let t = vaultTokenInfo[tokenArr[i].address];
      let token = {
        id: t.address,
        data: {
          poolAmount: t.poolAmount.toString(),
          reservedAmount: t.reservedAmount.toString(),
          redemptionAmount: t.redemptionAmount.toString(),
          weight: t.weight.toString(),
          minPrice: t.minPrice.toString(),
          maxPrice: t.maxPrice.toString(),
          guaranteedUsd: t.guaranteedUsd.toString(),
          maxPrimaryPrice: t.maxPrimaryPrice.toString(),
          minPrimaryPrice: t.minPrimaryPrice.toString(),
        },
      };
      results.push(token);
    }
    res.set("Content-Type", "text/plain");
    res.send(results);
  });

  app.get("/api/fees_summary", async (req, res) => {
    const tokenArr = Object.values(allTokens.metertest);
    const provider = getProvider(METERTEST);
    const reader = new ethers.Contract(
      getAddress(METERTEST, "Reader"),
      Reader.abi,
      provider
    );
    const vaultTokenInfo = await getInfoTokens();
    const feeAmounts = await reader.getFees(
      getAddress(METERTEST, "Vault"),
      tokenArr.map((t) => t.address)
    );
    let feesUsd = BigNumber.from(0);
    for (let i = 0; i < tokenArr.length; i++) {
      const token = tokenArr[i];
      const feeAmount = feeAmounts[i];
      const feeInUsd = feeAmount
        .mul(vaultTokenInfo[token.address].minPrice)
        .div(expandDecimals(1, token.decimals));
      feesUsd = feesUsd.add(feeInUsd);
    }
    res.set("Content-Type", "text/plain");
    res.send({
      lastUpdatedtotalFeesAt: Math.floor(Date.now() / 1000),
      totalFees: feesUsd.toString(),
    });
  });

  async function getVolumes(where) {
    const PROPS = "id token timestamp group volume action";
    const getQuery = () => `{
    volumes(
      first: 600
      orderBy: timestamp
      orderDirection: desc
      where: { ${where} }
    ) { ${PROPS} }
  }`;
    const query = getQuery();
    const start = Date.now();
    logger.info("requesting volumes %s", where);
    const { data } = await meterStatsClient.query({ query: gql(query) });
    logger.info(
      "request done in %sms loaded %s volumes",
      Date.now() - start,
      data.volumes.length
    );
    let volumes = [];
    for (let i = 0; i < data.volumes.length; i++) {
      volumes[i] = {
        id: data.volumes[i].id,
        data: {
          token: data.volumes[i].token,
          timestamp: data.volumes[i].timestamp,
          group: data.volumes[i].group,
          volume: data.volumes[i].volume,
          action: data.volumes[i].action,
        },
      };
    }
    return volumes;
  }
  app.get("/api/hourly_volume", async (req, res) => {
    const now = Math.floor(Date.now() / 1000);
    const hourly = now - (now % 3600);
    const where = `timestamp: ${hourly}`;
    const volumes = await getVolumes(where);

    res.set("Content-Type", "text/plain");
    res.send(volumes);
  });

  app.get("/api/daily_volume", async (req, res) => {
    const now = Math.floor(Date.now() / 1000);
    const daily = now - (now % 86400);
    const where = `timestamp: ${daily}`;
    const volumes = await getVolumes(where);

    res.set("Content-Type", "text/plain");
    res.send(volumes);
  });

  app.get("/api/total_volume", async (req, res) => {
    const where = ``;
    const volumes = await getVolumes(where);

    res.set("Content-Type", "text/plain");
    res.send(volumes);
  });

  app.get("/api/prices", async (req, res) => {
    const provider = getProvider(METERTEST);
    const witnetFeed_MTR = new ethers.Contract(
      getAddress(METERTEST, "IWitnetFeed_MTR"),
      IWitnetFeed.abi,
      provider
    );
    const witnetFeed_MTRG = new ethers.Contract(
      getAddress(METERTEST, "IWitnetFeed_MTRG"),
      IWitnetFeed.abi,
      provider
    );

    const lastPrice_MTR = (await witnetFeed_MTR.lastPrice()).mul(1e12);
    const lastPrice_MTRG = (await witnetFeed_MTRG.lastPrice()).mul(1e12);

    res.set("Content-Type", "text/plain");
    res.send({
      [getAddress(METERTEST, "MTR")]: lastPrice_MTR.toString(),
      [getAddress(METERTEST, "MTRG")]: lastPrice_MTRG.toString(),
    });
  });

  app.get("/api/ui_version", async (req, res) => {
    res.set("Content-Type", "text/plain");
    res.send("1.0");
  });

  app.get("/api/position_stats", async (req, res) => {
    res.set("Content-Type", "text/plain");
    res.send({
      totalShortPositionCollaterals: "0",
      totalLongPositionCollaterals: "0",
      totalActivePositions: 5709,
      totalShortPositionSizes: "0",
      totalLongPositionSizes: "0",
    });
  });

  async function getActions(where) {
    const PROPS = "id action params timestamp account txhash blockNumber";
    const getQuery = () => `{
    actions(
      first: 600
      orderBy: timestamp
      orderDirection: desc
      where: { ${where} }
    ) { ${PROPS} }
  }`;
    const query = getQuery();
    const start = Date.now();
    logger.info("requesting actions %s", where);
    const { data } = await meterStatsClient.query({ query: gql(query) });
    logger.info(
      "request done in %sms loaded %s actions",
      Date.now() - start,
      data.actions.length
    );
    let actions = [];
    for (let i = 0; i < data.actions.length; i++) {
      actions[i] = {
        id: data.actions[i].id,
        data: {
          params: data.volumes[i].params,
          timestamp: data.volumes[i].timestamp,
          account: data.volumes[i].account,
          txhash: data.volumes[i].txhash,
          action: data.volumes[i].action,
          blockNumber: data.volumes[i].blockNumber,
        },
      };
    }
    return actions;
  }

  app.get("/api/actions", async (req, res) => {
    const account = req.query.account?.toLowerCase() || null;
    let where = "";
    if (account != null) {
      where = `account: ${account}`;
    }
    const actions = await getActions(where);

    res.set("Content-Type", "text/plain");
    res.send(actions);
  });

  app.get("/api/orders_indices", async (req, res) => {
    const account = req.query.account?.toLowerCase() || null;
    let where = "";

    res.set("Content-Type", "text/plain");
    res.send({
      Swap: [],
      Increase: [],
      Decrease: [],
    });
  });

  app.get("/api/candles/:symbol", async (req, res, next) => {
    const period = req.query.period?.toLowerCase();
    if (!period || !VALID_PERIODS.has(period)) {
      next(
        createHttpError(
          400,
          `Invalid period. Valid periods are ${Array.from(VALID_PERIODS)}`
        )
      );
      return;
    }

    const validSymbols = new Set(["MTR", "MTRG", "BNB", "UNI", "LINK", "AVAX"]);
    const symbol = req.params.symbol;
    if (!validSymbols.has(symbol)) {
      next(createHttpError(400, `Invalid symbol ${symbol}`));
      return;
    }
    const preferableChainId = Number(req.query.preferableChainId);
    const validSources = new Set([METERTEST, AVALANCHE]);
    if (!validSources.has(preferableChainId)) {
      next(
        createHttpError(
          400,
          `Invalid preferableChainId ${preferableChainId}. Valid options are ${METERTEST}, ${AVALANCHE}`
        )
      );
      return;
    }
    let prices;
    try {
      prices = getPricesLimit(
        5000,
        preferableChainId,
        req.params.symbol,
        period
      );
    } catch (ex) {
      next(ex);
      return;
    }

    res.set("Cache-Control", "max-age=60");
    res.send({
      prices,
      period,
      updatedAt: getLastUpdatedTimestamp(),
    });
  });

  const cssAssetsTag = cssLinksFromAssets(assets, "client");
  const jsAssetsTag = jsScriptTagsFromAssets(
    assets,
    "client",
    " defer crossorigin"
  );

  app.get("/*", (req, res, next) => {
    if (res.headersSent) {
      next();
      return;
    }

    const context = {};
    const markup = renderToString(
      <StaticRouter context={context} location={req.url}>
        <App />
      </StaticRouter>
    );
    res.set("Content-Type", "text/html");

    res.status(200).send(
      `<!doctype html>
          <html lang="">
          <head>
              <meta http-equiv="X-UA-Compatible" content="IE=edge" />
              <meta charset="utf-8" />
              <title>GMX analytics</title>
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <link rel="icon" type="image/png" href="/favicon.png" />
              ${cssAssetsTag}
          </head>
          <body>
              <div id="root">${markup}</div>
              ${jsAssetsTag}
          </body>
      </html>`
    );
    next();
  });

  // eslint-disable-next-line no-unused-vars
  app.use("/api", function (err, req, res, _) {
    res.set("Content-Type", "text/plain");
    const statusCode = Number(err.code) || 500;
    let response = "";
    if (IS_PRODUCTION) {
      if (err.code === 400) {
        response = err.message;
      }
    } else {
      response = err.stack;
    }
    res.status(statusCode);
    res.send(response);
  });
}
