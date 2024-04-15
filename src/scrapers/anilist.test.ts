// testAniList.ts
import AniList from './AniList';

describe('AniList', () => {
    let aniList: AniList;

    beforeAll(() => {
        aniList = new AniList();
    });

    test('Get anime info', async () => {
        const animeInfo = await aniList.getInfo("anime", 21);
        expect(animeInfo).toBeTruthy();
        console.log("Anime Info:", animeInfo);
    });

    test('Get manga info', async () => {
        const mangaInfo = await aniList.getInfo("manga", 1);
        expect(mangaInfo).toBeTruthy();
        console.log("Manga Info:", mangaInfo);
    });
});
