export interface Character {
    name: string;
    image: string | null;
}

export interface Relation {
    title: string;
    bannerImage: string | null;
}

export interface MediaInfo {
    id: number;
    title: {
        english: string | null;
        romaji: string | null;
        native: string | null;
    };
    coverImage: string | null;
    bannerImage: string | null;
    genres: string[];
    description: string | null;
    characters: Character[];
    relations: Relation[];
}

export type Body = {
    id: string;
    fields?: string[];
};


import { Format, Genres, MediaStatus, ProviderType, Season,  Type } from "./enums";

export type Anime = {
    id: string;
    slug: string;
    coverImage: string | null;
    bannerImage: string | null;
    trailer: string | null;
    status: MediaStatus | null;
    season: Season;
    title: {
        romaji: string | null;
        english: string | null;
        native: string | null;
    };
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

export type Manga = {
    id: string;
    slug: string;
    coverImage: string | null;
    bannerImage: string | null;
    status: MediaStatus | null;
    title: {
        romaji: string | null;
        english: string | null;
        native: string | null;
    };
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

export type AnimeInfo = Pick<
    Anime,
    "id" | "title" | "artwork" | "synonyms" | "totalEpisodes" | "currentEpisode" | "bannerImage" | "coverImage" | "color" | "season" | "year" | "status" | "genres" | "description" | "format" | "duration" | "trailer" | "countryOfOrigin" | "tags" | "relations" | "characters" | "type"
> & {
    rating: number | null;
    popularity: number | null;
};

export type MangaInfo = Pick<
    Manga,
    "id" | "title" | "artwork" | "synonyms" | "totalChapters" | "bannerImage" | "coverImage" | "color" | "year" | "status" | "genres" | "description" | "format" | "totalVolumes" | "countryOfOrigin" | "tags" | "relations" | "characters" | "type" | "author" | "publisher"
> & {
    rating: number | null;
    popularity: number | null;
};

type SharedKeys<T, U> = {
    [K in keyof T]: K extends keyof U ? K : never;
}[keyof T];

export type MediaInfoKeys = SharedKeys<AnimeInfo, MangaInfo>;

export interface Character {
    name: string;
    image: string | null;
    voiceActor: {
        name: string;
        image: string | null;
    };
}

export type Relations = {
    id: string;
    type: Type;
    title: {
        english: string | null;
        romaji: string | null;
        native: string | null;
    };
    format: Format;
    relationType: string;
};

export type Artwork = {
    type: "banner" | "poster" | "clear_logo" | "top_banner" | "icon" | "clear_art";
    img: string;
    providerId: string;
};

export type EpisodeData = {
    providerId: string;
    episodes: Episode[];
};

export type Episode = {
    id: string;
    title: string;
    number: number;
    isFiller: boolean;
    img: string | null;
    hasDub: boolean;
    description: string | null;
    rating: number | null;
    updatedAt?: number;
};

export type ChapterData = {
    providerId: string;
    chapters: Chapter[];
};

export type Chapter = {
    id: string;
    title: string;
    number: number;
    rating: number | null;
    updatedAt?: number;
    mixdrop?: string;
};
