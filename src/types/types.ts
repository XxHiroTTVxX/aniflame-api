import { Format, Genres, Season, SubType, ProviderType, MediaStatus, Type } from "./enums.ts";

// =========================================
// Common / Shared Types
// =========================================

export type Title = {
    english: string | null;
    romaji: string | null;
    native: string | null;
};

export type Character = {
    name: string;
    image: string | null;
    voiceActor: {
        name: string | null;
        image: string | null;
    };
};

export type Relations = {
    id: string;
    type: Type;
    title: Title;
    format: Format;
    relationType: string;
};

export type Artwork = {
    type: "banner" | "poster" | "clear_logo" | "top_banner" | "icon" | "clear_art";
    img: string;
    providerId: string;
};

export type Body = {
    fields?: string[];
};

// =========================================
// Anime-specific Types
// =========================================

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
    updatedAt?: number;
};

export type EpisodeData = {
    providerId: string;
    episodes: Episode[];
};

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

export type AnimeInfo = Pick<
    Anime,
    "id" | "title" | "artwork" | "synonyms" | "totalEpisodes" | "currentEpisode" | "bannerImage" | "coverImage" | "color" | "season" | "year" | "status" | "genres" | "description" | "format" | "duration" | "trailer" | "countryOfOrigin" | "tags" | "relations" | "characters" | "type"
> & {
    rating: number | null;
    popularity: number | null;
    episodes?: {
        id: string;
        number: number;
        title: string;
        url: string;
    }[];
};

// =========================================
// Manga-specific Types
// =========================================

export enum MangaStatus {
  ONGOING = "Ongoing",
  COMPLETED = "Completed",
  HIATUS = "Hiatus",
  CANCELLED = "Cancelled",
  NOT_YET_PUBLISHED = "Not yet published",
  UNKNOWN = "Unknown"
}

export enum MangaFormat {
  MANGA = "MANGA",
  MANHWA = "MANHWA",
  MANHUA = "MANHUA",
  NOVEL = "NOVEL",
  ONE_SHOT = "ONE_SHOT",
  UNKNOWN = "UNKNOWN"
}

export interface IMangaChapter {
  id: string;
  number: number;
  title?: string;
  volume?: string;
  pages?: number;
  language?: string;
  hash?: string;
  dataSaver?: boolean;
  uploader?: string;
  externalUrl?: string;
  publishAt?: string;
  readableAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface IMangaInfo {
  id: string;
  title: string;
  altTitles?: Record<string, string>[];
  description?: string;
  authors?: string[];
  artists?: string[];
  genres?: string[];
  themes?: string[];
  status?: MangaStatus;
  format?: MangaFormat;
  version?: number;
  language?: string;
  originalLanguage?: string;
  lastVolume?: string;
  lastChapter?: string;
  publicationDemographic?: string;
  chapters?: IMangaChapter[];
  relations?: any[];
  recommendations?: any[];
  createdAt?: string;
  updatedAt?: string;
}

export type Chapter = {
    id: string;
    title: string;
    number: number;
    rating: number | null;
    updatedAt?: number;
    mixdrop?: string;
};

export type ChapterData = {
    providerId: string;
    chapters: Chapter[];
};

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

export type MangaInfo = Pick<
    Manga,
    "id" | "title" | "artwork" | "synonyms" | "totalChapters" | "bannerImage" | "coverImage" | "color" | "year" | "status" | "genres" | "description" | "format" | "totalVolumes" | "countryOfOrigin" | "tags" | "relations" | "characters" | "type" | "author" | "publisher"
> & {
    rating: number | null;
    popularity: number | null;
};

// =========================================
// Media Source Types
// =========================================

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

export type Server = {
    name: string;
    url: string;
    type?: SubType;
};

export type MediaSource = {
    file: string;
    [key: string]: any;
};

export type TrackSource = {
    file?: string;
    tracks?: MediaSource[];
    [key: string]: any;
};

export type MediaSources = {
    [key: string]: MediaSource | MediaSource[] | TrackSource;
};

// =========================================
// Data Types
// =========================================

export type AnimeData = {
    title: string;
    detailUrl: string;
    synopsis: string;
    genres: string[];
    episodes: number;
    type: string;
    releaseYear: number;
    status: string;
    image: string;
};

export interface MediaInfo {
  id: number | string;
  title: {
    english: string | null;
    romaji: string | null;
    native: string | null;
  };
  coverImage: string | null;
  bannerImage: string | null;
  genres: string[];
  description: string | null;
  characters: {
    name: string;
    image: string | null;
  }[];
  relations: {
    title: {
      english?: string | null;
      romaji?: string | null;
      native?: string | null;
      userPreferred?: string | null;
    };
  }[];
  // Additional fields for AniZip data
  mappings?: {
    mal_id?: number;
    anidb_id?: number;
    thetvdb_id?: number;
    imdb_id?: string;
  };
  episodeCount?: number;
  specialCount?: number;
  episodes?: {
    number: number | null;
    title: string | null;
    airDate?: string;
    summary?: string;
    image?: string;
    rating?: number | null;
    type: 'episode' | 'special';
  }[];
  specials?: {
    number: number | null;
    title: string | null;
    airDate?: string;
    summary?: string;
    image?: string;
    rating?: number | null;
    type: 'episode' | 'special';
  }[];
}