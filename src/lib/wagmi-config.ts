import { createConfig, http } from 'wagmi'
import { polygon } from 'wagmi/chains'
import { metaMask, injected } from 'wagmi/connectors'

export const wagmiConfig = createConfig({
  chains: [polygon],
  connectors: [
    metaMask({
      dappMetadata: {
        name: 'Polymer',
        url: 'https://polymer.app',
        iconUrl: '/polymarket.png',
      },
    }),
    injected({
      target: 'metaMask',
    }),
    injected(), // fallback for any injected wallet
  ],
  transports: {
    [polygon.id]: http('https://polygon-rpc.com'),
  },
})