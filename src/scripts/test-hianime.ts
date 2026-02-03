import { HianimeScraper } from '../scrapers/anime/hianime';

async function main() {
    try {
        const scraper = new HianimeScraper();
        console.log("Searching 'One Piece'...");
        const results = await scraper.search('One Piece');
        console.log(`Found ${results.length} results.`);
        
        if (results.length > 0) {
            const first = results[0];
            console.log(`First: ${first.title} (${first.id})`);
            
            console.log(`Getting episodes for ${first.id}...`);
            const episodes = await scraper.getEpisodes(first.id);
            console.log(`Found ${episodes.length} episodes.`);
            
            if (episodes.length > 0) {
                // Try first episode
                const ep = episodes[0];
                console.log(`Getting sources for Ep ${ep.number} (${ep.id})...`);
                const sources = await scraper.getSources(ep.id);
                console.log("Sources:", JSON.stringify(sources, null, 2));
            }
        }
    } catch (e) {
        console.error("Test Error:", e);
    }
}
main();
