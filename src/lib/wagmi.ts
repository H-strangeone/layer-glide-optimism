import { http } from 'wagmi';
import { mainnet, optimism } from 'wagmi/chains';
import { createConfig } from 'wagmi';
import { metaMask } from 'wagmi/connectors';

export const config = createConfig({
    chains: [mainnet, optimism],
    transports: {
        [mainnet.id]: http(),
        [optimism.id]: http(),
    },
    connectors: [
        metaMask()
    ],
}); 