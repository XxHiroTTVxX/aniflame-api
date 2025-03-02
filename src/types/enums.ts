
// Gogo Types Enum
// Represents the different types of content available on Gogoanime
export enum GogoTypes {
  SUB = 'sub', // Subtitled content
  DUB = 'dub', // Dubbed content
  CHINESE = 'chinese', // Chinese content
}

// Media Types Enum
// Represents the different types of media
export const enum Type {
  ANIME = 'ANIME', // Anime media type
  MANGA = 'MANGA', // Manga media type
}

// Provider Types Enum
// Represents the different types of providers
export const enum ProviderType {
  ANIME = 'ANIME', // Anime provider type
  MANGA = 'MANGA', // Manga provider type
  META = 'META', // Meta provider type
  INFORMATION = 'INFORMATION', // Information provider type
  BASE = 'BASE', // Base provider type
}

// Sub Types Enum
// Represents the different types of subtitles
export const enum SubType {
  DUB = 'dub', // Dubbed subtitles
  SUB = 'sub', // Subtitled subtitles
}

// Media Status Enum
// Represents the different statuses of media
export const enum MediaStatus {
  FINISHED = 'FINISHED', // Media has finished airing
  RELEASING = 'RELEASING', // Media is currently airing
  NOT_YET_RELEASED = 'NOT_YET_RELEASED', // Media has not yet been released
  CANCELLED = 'CANCELLED', // Media has been cancelled
  HIATUS = 'HIATUS', // Media is on hiatus
}

// Format Enum
// Represents the different formats of media
export const enum Format {
  TV = 'TV', // Television format
  TV_SHORT = 'TV_SHORT', // Short television format
  MOVIE = 'MOVIE', // Movie format
  SPECIAL = 'SPECIAL', // Special format
  OVA = 'OVA', // Original video animation format
  ONA = 'ONA', // Original net animation format
  MUSIC = 'MUSIC', // Music format
  MANGA = 'MANGA', // Manga format
  NOVEL = 'NOVEL', // Novel format
  ONE_SHOT = 'ONE_SHOT', // One-shot format
  UNKNOWN = 'UNKNOWN', // Unknown format
}

// Formats Array
// An array of all possible formats
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

// Season Enum
// Represents the different seasons
export const enum Season {
  WINTER = 'WINTER', // Winter season
  SPRING = 'SPRING', // Spring season
  SUMMER = 'SUMMER', // Summer season
  FALL = 'FALL', // Fall season
  UNKNOWN = 'UNKNOWN', // Unknown season
}

// Genres Enum
// Represents the different genres of media
export const enum Genres {
  ACTION = 'Action',
  ADVENTURE = 'Adventure',
  ANIME_INFLUENCED = 'Anime Influenced',
  AVANT_GARDE = 'Avant Garde',
  AWARD_WINNING = 'Award Winning',
  BOYS_LOVE = 'Boys Love',
  CARS = 'Cards',
  COMEDY = 'Comedy',
  DEMENTIA = 'Dementia',
  DEMONS = 'Demons',
  DOUJINSHI = 'Doujinshi',
  DRAMA = 'Drama',
  ECCHI = 'Ecchi',
  EROTICA = 'Erotica',
  FAMILY = 'Family',
  FANTASY = 'Fantasy',
  FOOD = 'Food',
  FRIENDSHIP = 'Friendship',
  GAME = 'Game',
  GENDER_BENDER = 'Gender Bender',
  GIRLS_LOVE = 'Girls Love',
  GORE = 'Gore',
  GOURMET = 'Gourmet',
  HAREM = 'Harem',
  HENTAI = 'Hentai',
  HISTORICAL = 'Historical',
  HORROR = 'Horror',
  ISEKAI = 'Isekai',
  KIDS = 'Kids',
  MAGIC = 'Magic',
  MAHOU_SHOUJO = 'Mahou Shoujo',
  MARTIAL_ARTS = 'Martial Arts',
  MECHA = 'Mecha',
  MEDICAL = 'Medical',
  MILITARY = 'Military',
  MUSIC = 'Music',
  MYSTERY = 'Mystery',
  PARODY = 'Parody',
  POLICE = 'Police',
  POLITICAL = 'Political',
  PSYCHOLOGICAL = 'Psychological',
  RACING = 'Racing',
  ROMANCE = 'Romance',
  SAMURAI = 'Samurai',
  SCHOOL = 'School',
  SCI_FI = 'Sci-Fi',
  SHOUJO_AI = 'Shoujo Ai',
  SHOUNEN_AI = 'Shounen Ai',
  SLICE_OF_LIFE = 'Slice of Life',
  SPACE = 'Space',
  SPORTS = 'Sports',
  SUPER_POWER = 'Super Power',
  SUPERNATURAL = 'Supernatural',
  SUSPENCE = 'Suspence',
  THRILLER = 'Thriller',
  VAMPIRE = 'Vampire',
  WORKPLACE = 'Workplace',
  YAOI = 'Yaoi',
  YURI = 'Yuri',
  ZOMBIES = 'Zombies',
}

// Streaming Servers Enum
// Represents the different streaming servers
export const enum StreamingServers {
  AsianLoad = 'asianload',
  GogoCDN = 'gogocdn',
  StreamSB = 'streamsb',
  MixDrop = 'mixdrop',
  UpCloud = 'upcloud',
  VidCloud = 'vidcloud',
  StreamTape = 'streamtape',
  VizCloud = 'vidplay',
  MyCloud = 'mycloud',
  Filemoon = 'filemoon',
  VidStreaming = 'vidstreaming',
  AllAnime = 'allanime',
  FPlayer = 'fplayer',
  Kwik = 'kwik',
  DuckStream = 'duckstream',
  DuckStreamV2 = 'duckstreamv2',
  BirdStream = 'birdstream',
  AnimeFlix = 'animeflix',
  MegaUp = "MegaUp",
}
