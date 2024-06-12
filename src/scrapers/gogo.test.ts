import GogoAnime from "./anime/gogoanime"; // Ensure this path is correct
import AniList from "./info/anilist";import { Format, StreamingServers, SubType } from '../types/enums';
import Extractor from '../lib/extractor';
import axios from 'axios';
import type AnimeProvider from "./anime";
const ANIME_PROVIDERS: AnimeProvider[] = [ new GogoAnime()];

jest.mock('axios');
jest.mock('../lib/extractor');

describe('GogoAnime', () => {
    let gogoAnime: GogoAnime;

    beforeEach(() => {
        gogoAnime = new GogoAnime();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('search', () => {
        it('should return search results', async () => {
            const mockHtml = `
                <ul class="items">
                    <li>
                        <p class="name"><a>Test Anime</a></p>
                        <div class="img"><a href="/anime/test-anime"><img src="test.jpg" /></a></div>
                        <p class="released">Released: 2021</p>
                    </li>
                </ul>
            `;
            (axios.get as jest.MockedFunction<typeof axios.get>).mockResolvedValue({ data: mockHtml });

            const results = await gogoAnime.search('test');

            expect(results).toEqual([{
                id: '/anime/test-anime',
                title: 'Test Anime',
                altTitles: [],
                img: 'test.jpg',
                format: Format.UNKNOWN,
                year: 2021,
                providerId: 'gogoanime',
            }]);
        });
    });

    describe('fetchEpisodes', () => {
        it('should return episodes', async () => {
            const mockHtml = `
                <div id="episode_page">
                    <li><a ep_start="1"></a></li>
                    <li><a ep_end="12"></a></li>
                </div>
                <input id="movie_id" value="12345" />
                <input id="alias_anime" value="test-alias" />
            `;
            const mockAjaxHtml = `
                <ul id="episode_related">
                    <li>
                        <a href="/episode/1"></a>
                        <div class="name">EP 1</div>
                    </li>
                </ul>
            `;
            (axios.get as jest.MockedFunction<typeof axios.get>)
                .mockResolvedValueOnce({ data: mockHtml })
                .mockResolvedValueOnce({ data: mockAjaxHtml });

            const episodes = await gogoAnime.fetchEpisodes('/anime/test-anime');

            expect(episodes).toEqual([{
                id: '/episode/1',
                number: 1,
                title: 'EP 1',
                isFiller: false,
                img: null,
                hasDub: false,
                description: null,
                rating: null,
            }]);
        });
    });

    describe('fetchSources', () => {
        it('should return sources', async () => {
            const mockHtml = `
                <div id="load_anime">
                    <div><div><iframe src="https://example.com/video"></iframe></div></div>
                </div>
            `;
            (axios.get as jest.MockedFunction<typeof axios.get>).mockResolvedValue({ data: mockHtml });

            const mockExtractor = {
                extract: jest.fn().mockResolvedValue({
                    sources: ['source1'],
                    subtitles: [],
                    audio: [],
                    intro: { start: 0, end: 0 },
                    outro: { start: 0, end: 0 },
                    headers: {},
                }),
            };
            (Extractor as jest.Mock).mockImplementation(() => mockExtractor);

            const sources = await gogoAnime.fetchSources('/episode/1');

            expect(sources).toEqual({
                sources: ['source1'],
                subtitles: [],
                audio: [],
                intro: { start: 0, end: 0 },
                outro: { start: 0, end: 0 },
                headers: {},
            });
        });
    });
});