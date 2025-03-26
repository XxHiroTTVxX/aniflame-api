// =========================================
// Core Media Types
// =========================================

export const enum Type {
    ANIME = 'ANIME',
    MANGA = 'MANGA',
}

export const enum ProviderType {
    ANIME = 'ANIME',
    INFO = 'INFO',
}

export const enum SubType {
    DUB = 'dub',
    SUB = 'sub',
}

// =========================================
// Media Status & Format
// =========================================

export const enum MediaStatus {
    FINISHED = 'FINISHED',
    RELEASING = 'RELEASING',
    NOT_YET_RELEASED = 'NOT_YET_RELEASED',
    CANCELLED = 'CANCELLED',
    HIATUS = 'HIATUS',
}

export const enum Format {
    // Video Formats
    TV = 'TV',
    TV_SHORT = 'TV_SHORT',
    MOVIE = 'MOVIE',
    SPECIAL = 'SPECIAL',
    OVA = 'OVA',
    ONA = 'ONA',
    
    // Other Media Formats
    MUSIC = 'MUSIC',
    MANGA = 'MANGA',
    NOVEL = 'NOVEL',
    ONE_SHOT = 'ONE_SHOT',
    
    // Default
    UNKNOWN = 'UNKNOWN',
}

// Format helper array for iteration/validation
export const Formats = [
    Format.TV,
    Format.TV_SHORT,
    Format.MOVIE,
    Format.SPECIAL,
    Format.OVA,
    Format.ONA,
    Format.MUSIC,
    Format.MANGA,
    Format.NOVEL,
    Format.ONE_SHOT,
    Format.UNKNOWN,
];

// =========================================
// Seasonal & Categorization
// =========================================

export const enum Season {
    WINTER = 'WINTER',
    SPRING = 'SPRING',
    SUMMER = 'SUMMER',
    FALL = 'FALL',
    UNKNOWN = 'UNKNOWN',
}

export const enum Genres {
    // Action & Adventure
    ACTION = 'Action',
    ADVENTURE = 'Adventure',
    MARTIAL_ARTS = 'Martial Arts',
    MILITARY = 'Military',
    SAMURAI = 'Samurai',
    SUPER_POWER = 'Super Power',

    // Drama & Slice of Life
    DRAMA = 'Drama',
    SLICE_OF_LIFE = 'Slice of Life',
    WORKPLACE = 'Workplace',
    SCHOOL = 'School',
    FAMILY = 'Family',
    FRIENDSHIP = 'Friendship',

    // Comedy & Parody
    COMEDY = 'Comedy',
    PARODY = 'Parody',
    GOURMET = 'Gourmet',
    FOOD = 'Food',

    // Romance & Relationships
    ROMANCE = 'Romance',
    HAREM = 'Harem',
    BOYS_LOVE = 'Boys Love',
    GIRLS_LOVE = 'Girls Love',
    GENDER_BENDER = 'Gender Bender',
    SHOUJO_AI = 'Shoujo Ai',
    SHOUNEN_AI = 'Shounen Ai',
    YAOI = 'Yaoi',
    YURI = 'Yuri',

    // Fantasy & Supernatural
    FANTASY = 'Fantasy',
    SUPERNATURAL = 'Supernatural',
    MAGIC = 'Magic',
    MAHOU_SHOUJO = 'Mahou Shoujo',
    DEMONS = 'Demons',
    VAMPIRE = 'Vampire',
    ZOMBIES = 'Zombies',
    ISEKAI = 'Isekai',

    // Sci-Fi & Mecha
    SCI_FI = 'Sci-Fi',
    MECHA = 'Mecha',
    SPACE = 'Space',

    // Mystery & Psychological
    MYSTERY = 'Mystery',
    PSYCHOLOGICAL = 'Psychological',
    THRILLER = 'Thriller',
    SUSPENCE = 'Suspence',
    HORROR = 'Horror',
    GORE = 'Gore',
    DEMENTIA = 'Dementia',

    // Sports & Games
    SPORTS = 'Sports',
    CARS = 'Cards',
    RACING = 'Racing',
    GAME = 'Game',

    // Adult Content
    ECCHI = 'Ecchi',
    EROTICA = 'Erotica',
    HENTAI = 'Hentai',

    // Other Categories
    HISTORICAL = 'Historical',
    KIDS = 'Kids',
    MEDICAL = 'Medical',
    MUSIC = 'Music',
    POLICE = 'Police',
    POLITICAL = 'Political',
    ANIME_INFLUENCED = 'Anime Influenced',
    AVANT_GARDE = 'Avant Garde',
    AWARD_WINNING = 'Award Winning',
    DOUJINSHI = 'Doujinshi',
}

// =========================================
// Streaming Infrastructure
// =========================================

export const enum StreamingServers {
    // Primary CDNs
    GogoCDN = 'gogocdn',
    VizCloud = 'vidplay',
    VidCloud = 'vidcloud',
    VidStreaming = 'vidstreaming',
    
    // Cloud Storage Based
    UpCloud = 'upcloud',
    MyCloud = 'mycloud',
    
    // Specialized Anime Servers
    AsianLoad = 'asianload',
    AllAnime = 'allanime',
    AnimeFlix = 'animeflix',
    
    // General Purpose Servers
    StreamSB = 'streamsb',
    MixDrop = 'mixdrop',
    StreamTape = 'streamtape',
    Filemoon = 'filemoon',
    FPlayer = 'fplayer',
    
    // Duck/Bird Streaming Family
    DuckStream = 'duckstream',
    DuckStreamV2 = 'duckstreamv2',
    BirdStream = 'birdstream',
    
    // File Hosting
    MegaUp = "MegaUp",
    
    // Specialized Players
    Kwik = 'kwik',
}