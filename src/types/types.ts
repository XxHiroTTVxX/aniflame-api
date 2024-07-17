import { Format, Genres, Season, SubType, ProviderType, MediaStatus, Type} from "./enums";

// Type for Titles
export type Title = {
    english: string | null;
    romaji: string | null;
    native: string | null;
};

// Type for Character
export type Character = {
    name: string;
    image: string | null;
    voiceActor: {
        name: string | null;
        image: string | null;
    };
};

// Type for Relation
export type Relation = {
    title: Title;
};

// Type for MediaInfo
export type MediaInfo = {
    id: number;
    title: Title;
    coverImage: string | null;
    bannerImage: string | null;
    genres: string[];
    description: string | null;
    characters: Character[];
    relations: Relation[];
};

// Type for Body
export type Body = {
    fields?: string[];
};

// Type for Result
export type Result = {
    id: string;
    title: string;
    altTitles: string[];
    year: number;
    format: Format;
    img: string | null;
    providerId: string;
};

// Type for Episode
export type Episode = {
    id: string;
    title: string;
    duration?: number;
    number: number;
    isFiller?: boolean;
    img?: string | null;
    hasDub?: boolean;
    description?: string | null;
    rating?: number | null;
};

// Type for ChapterData
export type ChapterData = {
    providerId: string;
    chapters: Chapter[];
};

// Type for Chapter
export type Chapter = {
    id: string;
    title: string;
    number: number;
    rating: number | null;
    updatedAt?: number;
    mixdrop?: string;
};

// Type for Anime
export type Anime = {
    id: string;
    slug: string;
    coverImage: string | null;
    bannerImage: string | null;
    trailer: string | null;
    status: MediaStatus | null;
    season: Season;
    title: Title;
    currentEpisode: number | null;
    mappings: { id: string; providerId: string; similarity: number; providerType: ProviderType | null }[];
    synonyms: string[];
    countryOfOrigin: string | null;
    description: string | null;
    duration: number | null;
    color: string | null;
    year: number | null;
    rating: { [key: string]: number } | null;
    popularity: { [key: string]: number } | null;
    averageRating?: number;
    averagePopularity?: number;
    type: Type.ANIME;
    genres: Genres[];
    format: Format;
    relations: Relations[];
    totalEpisodes?: number;
    episodes: {
        latest: {
            updatedAt: number;
            latestEpisode: number;
            latestTitle: string;
        };
        data: EpisodeData[];
    };
    tags: string[];
    artwork: Artwork[];
    characters: Character[];
};

// Type for Relations
export type Relations = {
    id: string;
    type: Type;
    title: Title;
    format: Format;
    relationType: string;
};

// Type for Artwork
export type Artwork = {
    type: "banner" | "poster" | "clear_logo" | "top_banner" | "icon" | "clear_art";
    img: string;
    providerId: string;
};

// Type for EpisodeData
export type EpisodeData = {
    providerId: string;
    episodes: Episode[];
};

// Type for Manga
export type Manga = {
    id: string;
    slug: string;
    coverImage: string | null;
    bannerImage: string | null;
    status: MediaStatus | null;
    title: Title;
    mappings: { id: string; providerId: string; similarity: number; providerType: ProviderType | null }[];
    synonyms: string[];
    countryOfOrigin: string | null;
    description: string | null;
    currentChapter: number | null;
    totalVolumes: number | null;
    color: string | null;
    year: number | null;
    rating: { [key: string]: number } | null;
    popularity: { [key: string]: number } | null;
    averageRating?: number;
    averagePopularity?: number;
    genres: Genres[];
    type: Type.MANGA;
    format: Format;
    relations: Relations[];
    publisher: string | null;
    author: string | null;
    totalChapters: number | null;
    chapters: {
        latest: {
            updatedAt: number;
            latestChapter: number;
            latestTitle: string;
        };
        data: ChapterData[];
    };
    tags: string[];
    artwork: Artwork[];
    characters: Character[];
};

type SharedKeys<T, U> = {
    [K in keyof T]: K extends keyof U ? K : never;
}[keyof T];

export type MediaInfoKeys = SharedKeys<AnimeInfo, MangaInfo>;
// Type for AnimeInfo
export type AnimeInfo = Pick<
    Anime,
    "id" | "title" | "artwork" | "synonyms" | "totalEpisodes" | "currentEpisode" | "bannerImage" | "coverImage" | "color" | "season" | "year" | "status" | "genres" | "description" | "format" | "duration" | "trailer" | "countryOfOrigin" | "tags" | "relations" | "characters" | "type"
> & {
    rating: number | null;
    popularity: number | null;
};

// Type for MangaInfo
export type MangaInfo = Pick<
    Manga,
    "id" | "title" | "artwork" | "synonyms" | "totalChapters" | "bannerImage" | "coverImage" | "color" | "year" | "status" | "genres" | "description" | "format" | "totalVolumes" | "countryOfOrigin" | "tags" | "relations" | "characters" | "type" | "author" | "publisher"
> & {
    rating: number | null;
    popularity: number | null;
};


export type Source = {
    sources: { url: string; quality: string }[];
    subtitles: { url: string; lang: string; label: string }[];
    audio: { url: string; name: string; language: string }[];
    intro: {
        start: number;
        end: number;
    };
    outro: {
        start: number;
        end: number;
    };
    headers: { [key: string]: string };
};
