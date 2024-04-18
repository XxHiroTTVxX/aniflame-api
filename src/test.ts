
// $ bun run src/lib/key.ts Hieo true
// New API key generated and stored: 1713141632297c925dd2c43080d1442e2e030ce74 (Name: Hieo) (Whitelisted: true)
// hiro@MainUse:/mnt/c/Users/hirob/Documents/aniflame-api$ bun run generate:apikey
// $ bun run src/lib/key.ts
// New API key generated and stored: 17131416547102f118cb12d1f67f9bfbc4878731a (Name: unknown) (Whitelisted: false)#

const axios = require('axios');

const API_KEY = '17131416547102f118cb12d1f67f9bfbc4878731a';
const URL = 'http://localhost:3000/info/21?apiKey=' + API_KEY;

async function testRateLimit() {
    const requestCount = 200; // Number of requests to send
    let successCount = 0;
    let rateLimitExceeded = 0;

    for (let i = 0; i < requestCount; i++) {
        try {
            await axios.get(URL);
            successCount++;
        } catch (error: any) {
            console.error(error);
            if (error.response && error.response.status === 429) {
                rateLimitExceeded++;
            }
        }
    }

    console.log(`Success: ${successCount}, Rate Limit Exceeded: ${rateLimitExceeded}`);
}

testRateLimit();