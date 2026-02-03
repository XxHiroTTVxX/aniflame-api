
import axios from 'axios';
import { load } from 'cheerio';
import { MegaCloud } from '../../../lib/extractors/megacloud';
import { AnimeScraper, type AnimeEpisode, type AnimeSource, type SearchResult } from '..';
import type { MediaInfo } from '../../../types/types';

export class HianimeScraper extends AnimeScraper {
    private megacloud: MegaCloud;

    constructor() {
        super('https://hianime.to');
        this.megacloud = new MegaCloud();
    }

    /**
     * Standard search method
     */
    async search(query: string, page: number = 1): Promise<SearchResult[]> {
        try {
            const searchUrl = `${this.baseUrl}/search?keyword=${decodeURIComponent(query)}&page=${page}`;
            const { data } = await axios.get(searchUrl);
            const $ = load(data);

            const results: SearchResult[] = [];

            $('.flw-item').each((i, ele) => {
                const card = $(ele);
                const atag = card.find('.film-name a');
                const href = atag.attr('href');
                if (!href) return;

                // ID format: /watch/one-piece-100 OR just /one-piece-100 ??
                // Consumet: href.split('/')[1]?.split('?')[0]; 
                // Example href: /one-piece-100?ref=search
                const id = href.split('/')[1]?.split('?')[0];
                if (!id) return;

                const title = atag.text();
                const image = card.find('img').attr('data-src') || card.find('img').attr('src');
                const type = card.find('.fdi-item').first().text().trim(); // TV, Movie etc

                // Extract release year if available (often mixed in text)
                // Usually Hianime lists it in .fdi-item or similar?
                // Consumet snippet didn't extract year explicitly for SearchResult.
                // We can try to grab it from details if visible.

                results.push({
                    id: id,
                    title: title,
                    image: image,
                    type: type,
                    // releaseDate: ??? 
                });
            });

            return results;
        } catch (error) {
            console.error('Hianime search error:', error);
            return [];
        }
    }

    /**
     * Get Media Info
     */
    async getInfo(id: string): Promise<MediaInfo> {
        return {
            id: id,
            title: { romaji: 'Unknown', english: 'Unknown', native: null },
            coverImage: null,
            bannerImage: null,
            genres: [],
            description: null,
            characters: [],
            relations: []
        };
    }

    /**
     * Get Episodes
     */
    async getEpisodes(id: string): Promise<AnimeEpisode[]> {
        try {
            // Hianime needs the numeric ID at end of slug
            // e.g. one-piece-100 -> 100
            const numericId = id.split('-').pop();

            const ajaxUrl = `${this.baseUrl}/ajax/v2/episode/list/${numericId}`;
            const { data } = await axios.get(ajaxUrl, {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Referer': `${this.baseUrl}/watch/${id}`
                }
            });

            const $ = load(data.html);
            const episodes: AnimeEpisode[] = [];

            $('.detail-infor-content > div > a').each((i, el) => {
                const element = $(el);
                const title = element.attr('title');
                const numberStr = element.attr('data-number');
                const number = numberStr ? parseFloat(numberStr) : 0;

                // ID extraction often involves ?ep=...
                // Consumet: href.split('/')[2].replace('?ep=', '$episode$')
                // Example href: /watch/one-piece-100?ep=12345
                // We just want the episode ID "12345" (from ?ep=)
                // Or full slug? 
                // Consumet makes ID "12345" (from ?ep=).
                // Standard getSources needs this.

                const href = element.attr('href');
                const epId = href?.split('?ep=')[1];

                if (epId) {
                    episodes.push({
                        id: epId, // This is the specific episode ID
                        number: number,
                        title: title,
                        isFiller: element.hasClass('ssl-item-filler')
                    });
                }
            });

            return episodes;
        } catch (error) {
            console.error('Hianime getEpisodes error:', error);
            return [];
        }
    }

    /**
     * Get Sources
     */
    async getSources(episodeId: string): Promise<AnimeSource[]> {
        try {
            // 1. Get Servers
            // /ajax/v2/episode/servers?episodeId=...
            const serversUrl = `${this.baseUrl}/ajax/v2/episode/servers?episodeId=${episodeId}`;
            const { data } = await axios.get(serversUrl, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            });

            const $ = load(data.html);

            // Select Server. We prefer "MegaCloud" (VidCloud) or "VidStreaming"
            // Consumet logic:
            // VidCloud (RapidCloud) -> Index 1
            // VidStreaming -> Index 4
            // We try Index 4 first (VidStreaming/MegaCloud)

            let serverId = this.retrieveServerId($, 4);
            if (!serverId) {
                serverId = this.retrieveServerId($, 1); // Fallback to index 1
            }

            if (!serverId) return [];

            // 2. Get Source Link
            const sourcesUrl = `${this.baseUrl}/ajax/v2/episode/sources?id=${serverId}`;
            const sourceRes = await axios.get(sourcesUrl, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            });

            const link = sourceRes.data?.link;
            if (!link) return [];

            // 3. Extract MegaCloud
            // Consumet passes the link to MegaCloud extractor
            const extracted = await this.megacloud.extract(link);

            if (!extracted) return [];

            return [{
                url: extracted,
                quality: 'auto',
                type: 'hls'
            }];

        } catch (error) {
            console.error('Hianime getSources error:', error);
            return [];
        }
    }

    private retrieveServerId($: any, index: number) {
        // Try sub first (servers-sub), then raw/dub if needed? 
        // We usually want SUB.
        // Class: .ps_-block.ps_-block-sub.servers-sub > .ps__-list .server-item

        let el = $(`.ps_-block.ps_-block-sub.servers-sub .server-item[data-server-id="${index}"]`);
        if (el.length === 0) {
            // Try dub?
            el = $(`.ps_-block.ps_-block-sub.servers-dub .server-item[data-server-id="${index}"]`);
        }
        return el.attr('data-id');
    }
}
