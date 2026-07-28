import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
	const baseURL = site ?? new URL('https://landfallbox.github.io');
	const sitemapURL = new URL('sitemap-index.xml', baseURL);

	return new Response(`User-agent: *\nAllow: /\n\nSitemap: ${sitemapURL.href}\n`, {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
		},
	});
};