import fetch from 'node-fetch';

async function debug() {
    const username = '_isnehasahu_';
    const response = await fetch(`https://www.instagram.com/${username}/`, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        }
    });
    const html = await response.text();

    const ogMatch = html.match(/meta property="og:description" content="([^"]+)"/);
    const metaMatch = html.match(/meta name="description" content="([^"]+)"/);

    console.log('OG Content:', ogMatch ? ogMatch[1] : 'NOT FOUND');
    console.log('Meta Content:', metaMatch ? metaMatch[1] : 'NOT FOUND');

    if (!ogMatch && !metaMatch) {
        console.log('Full HTML preview (first 500 chars):', html.substring(0, 500));
    }
}

debug();
