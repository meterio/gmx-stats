import fetch from 'cross-fetch';
import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client'

import { ARBITRUM, AVALANCHE, METERTEST } from './addresses'

const apolloOptions = {
  query: {
    fetchPolicy: 'no-cache'
  },
  watchQuery: {
    fetchPolicy: 'no-cache'
  }
}

const meterPricesClient = new ApolloClient({
  link: new HttpLink({ uri: 'http://graphtest.meter.io:8000/subgraphs/name/gmx/gmx-price', fetch }),
  cache: new InMemoryCache(),
  defaultOptions: apolloOptions
})

const arbitrumPricesClient = new ApolloClient({
  link: new HttpLink({ uri: 'https://api.thegraph.com/subgraphs/name/gmx-io/gmx-arbitrum-prices', fetch }),
  cache: new InMemoryCache(),
  defaultOptions: apolloOptions
})

const avalanchePricesClient = new ApolloClient({
  link: new HttpLink({ uri: 'https://api.thegraph.com/subgraphs/name/gmx-io/gmx-avalanche-prices', fetch }),
  cache: new InMemoryCache(),
  defaultOptions: apolloOptions
})

function getPricesClient(chainId) {
  if (chainId === ARBITRUM) {
    return arbitrumPricesClient
  } else if (chainId === AVALANCHE) {
    return avalanchePricesClient
  } else if (chainId === METERTEST) {
    return meterPricesClient
  } else {
    throw new Error(`Invalid chainId ${chainId}`)
  }
}

module.exports = {
  getPricesClient
}
