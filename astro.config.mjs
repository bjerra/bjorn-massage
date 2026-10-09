import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import { refreshServices } from './tools/bokadirekt/fetch-services.mjs';

// https://astro.build/config
export default defineConfig({
    vite: {
        plugins: [tailwindcss()]
    },
    integrations: [
        react(),
        {
            name: 'bokadirekt-services',
            hooks: {
                'astro:build:start': async () => {
                    await refreshServices();
                }
            }
        }
    ],
    adapter: netlify({
        devFeatures: {
            environmentVariables: true
        }
    })
});
