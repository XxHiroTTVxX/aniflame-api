const axios = require('axios');

const API_KEY = '171071993075086a1fa61ca47d3885e421ebc40c9';
const URL = 'http://localhost:3000/info?apiKey=' + API_KEY;

async function testRateLimit() {
    const requestCount = 100; // Number of requests to send
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