import { Format, Genres, MediaStatus, ProviderType, Season, SubType, Type } from "./enums";

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

export type Anime = {
    id: string;
    title: string;
    episodes: Episode[];
};

export type Manga = {
    id: string;
    title: string;
    chapters: Chapter[];
};

export type AnimeInfo = {
    id: string;
    title: string;
    synopsis: string;
    episodes: Episode[];
};

export type MangaInfo = {
    id: string;
    title: string;
    synopsis: string;
    chapters: Chapter[];
};
export type Source = {
    sources: { url: string; quality: string }[];
    subtitles: { url: string; lang: string; label: string }[];
    audio: { url: string; name: string; language: string }[];
    intro: { start: number; end: number };
    outro: { start: number; end: number };
    headers?: { [key: string]: string };
};


export type Result = {
    id: string;
    title: string;
    altTitles: string[];
    year: number;
    format: Format;
    img: string | null;
    providerId: string;
};

export type Server = {
    name: string;
    url: string;
    type?: SubType;
};


export type Episode = {
    id: string;
    title: string;
    duration?: number; // Optional because it's not always provided
    number: number; // Add this line
    isFiller?: boolean; // Optional because it's not always provided
    img?: string | null; // Optional because it's not always provided
    hasDub?: boolean; // Optional because it's not always provided
    description?: string | null; // Optional because it's not always provided
    rating?: number | null; // Optional because it's not always provided
};

export type Chapter = {
    id: string;
    title: string;
    pages: number;
};

export type MediaInfoKeys = keyof AnimeInfo | keyof MangaInfo;