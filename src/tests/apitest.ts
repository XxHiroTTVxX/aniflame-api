const axios = require('axios');

const API_KEY = '';
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