import type { Config } from '@netlify/functions';

/**
 * Daily production rebuild so massage prices are fetched from Bokadirekt again.
 * Set BUILD_HOOK_URL to a Netlify build hook. The URL is a secret; do not commit it.
 * Schedule is midnight UTC (`@daily`).
 */
export default async function scheduledRebuild(request: Request): Promise<Response> {
    const hook = process.env.BUILD_HOOK_URL;
    if (!hook) {
        console.warn(
            'BUILD_HOOK_URL is not set. Skipped the daily Bokadirekt rebuild. Add a Netlify build hook URL in the site environment variables.'
        );
        return new Response('BUILD_HOOK_URL is not set', { status: 500 });
    }

    let nextRun = '';
    try {
        const body = (await request.json()) as { next_run?: string };
        if (body?.next_run) nextRun = ` Next run: ${body.next_run}.`;
    } catch {
        // A manual invocation may not send JSON.
    }

    const response = await fetch(hook, { method: 'POST' });
    if (!response.ok) {
        const text = await response.text();
        console.error(`Build hook responded ${response.status}: ${text.slice(0, 300)}`);
        return new Response('Build hook failed', { status: 502 });
    }

    console.log(`Scheduled Bokadirekt rebuild requested.${nextRun}`);
    return new Response('Rebuild requested');
}

export const config: Config = {
    schedule: '@daily'
};
