const axios = require('axios');

const API_KEY = '174086911248808f387dd28e0866625c6135f12b5';
const URL = 'http://localhost:3000/info/21?apiKey=' + API_KEY;

async function testRateLimit() {
    const requestCount = 100; // Number of requests to send
    let successCount = 0;
    let rateLimitExceeded = 0;
    let requestsInLastMinute = 0;
    const startTime = Date.now();

    const timer = setInterval(() => {
        const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
        console.log(`Requests in last 60 seconds: ${requestsInLastMinute}`);
        requestsInLastMinute = 0; // Reset counter
    }, 60000);

    for (let i = 0; i < requestCount; i++) {
        try {
            await axios.get(URL);
            successCount++;
            requestsInLastMinute++;
        } catch (error: any) {
            console.error(error);
            if (error.response && error.response.status === 429) {
                rateLimitExceeded++;
                requestsInLastMinute++;
            }
        }
    }

    clearInterval(timer);
    console.log(`Success: ${successCount}, Rate Limit Exceeded: ${rateLimitExceeded}`);
}

testRateLimit();