import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { refreshServices } from './tools/bokadirekt/fetch-services.mjs';

export default defineConfig({
    site: 'https://bjornmassage.se',
    vite: {
        plugins: [tailwindcss()]
    },
    integrations: [
        sitemap({
            filter: (page) =>
                !page.endsWith('/404') &&
                !page.endsWith('/410') &&
                !page.includes('/404/') &&
                !page.includes('/410/') &&
                !page.includes('/rorelser')
        }),
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
