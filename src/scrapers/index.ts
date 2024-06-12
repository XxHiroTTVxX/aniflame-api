import type { Anime, AnimeInfo, Manga, MangaInfo } from "../types/types";
import AnimeProvider from "./anime";
import GogoAnime from "./anime/gogoanime";
// import BaseProvider from "./impl/base";
import InformationProvider from "./info";
import AniList from "./info/anilist";
// import MangaProvider from "./manga";
// import MetaProvider from "./meta";


const ANIME_PROVIDERS: AnimeProvider[] = [ new GogoAnime()];
const animeProviders: Record<string, AnimeProvider> = ANIME_PROVIDERS.reduce(
    (acc, provider) => {
        acc[provider.id] = provider;
        return acc;
    },
    {} as Record<string, AnimeProvider>,
);


// const INFORMATION_PROVIDERS: InformationProvider<Anime | Manga, AnimeInfo | MangaInfo>[] = [new AniList(), new MangaDexInfo(), new NovelUpdatesInfo()];
// const infoProviders: Record<string, InformationProvider<Anime | Manga, AnimeInfo | MangaInfo>> = INFORMATION_PROVIDERS.reduce(
//     (acc, provider) => {
//         acc[provider.id] = provider;
//         return acc;
//     },
//     {} as Record<string, InformationProvider<Anime | Manga, AnimeInfo | MangaInfo>>,
// );


export { ANIME_PROVIDERS, animeProviders};