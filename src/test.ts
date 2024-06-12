
// $ bun run src/lib/key.ts Hieo true
// New API key generated and stored: 17182082986742e6115cb3ed317c5d6954ad0cebb (Name: Hieo) (Whitelisted: true) Success: 120, Rate Limit Exceeded: 0
// hiro@MainUse:/mnt/c/Users/hirob/Documents/aniflame-api$ bun run generate:apikey
// $ bun run src/lib/key.ts
// New API key generated and stored: 1718207994632ff29813a6e3b48337aa5399d81cc (Name: unknown) (Whitelisted: false) Success: 90, Rate Limit Exceeded: 30

const axios = require('axios');

const API_KEY = '17182082986742e6115cb3ed317c5d6954ad0cebb';
const URL = 'http://localhost:3000/info/21?apiKey=' + API_KEY;

async function testRateLimit() {
    const requestCount = 120; // Number of requests to send
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