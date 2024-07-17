
import type { MediaInfo } from "../../types/types";

class AniList {
    [x: string]: any;
    private readonly api: string;

    constructor() {
        this.api = "https://graphql.anilist.co";
    }

    async getInfo(mediaType: string, mediaId: number): Promise<MediaInfo | null> {
        const query = `
        query ($id: Int) {
          Media(id: $id) {
            id
            idMal
            title {
              english
              native
              romaji
              userPreferred
            }
            synonyms
            countryOfOrigin
            isLicensed
            isAdult
            externalLinks {
              url
              site
              type
              language
            }
            coverImage {
              extraLarge
              large
              medium
              color
            }
            bannerImage
            season
            seasonYear
            description
            type
            format
            status(version: 2)
            episodes
            duration
            chapters
            volumes
            trailer {
              id
              site
              thumbnail
            }
            genres
            source
            averageScore
            popularity
            meanScore
            nextAiringEpisode {
              airingAt
              timeUntilAiring
              episode
            }
            characters(sort: ROLE) {
              edges {
                role
                node {
                  id
                  name {
                    first
                    middle
                    last
                    full
                    native
                    userPreferred
                  }
                  image {
                    large
                    medium
                  }
                }
                voiceActors {
                  image {
                    large
                    medium
                  }
                  name {
                    first
                    middle
                    last
                    full
                    native
                    alternative
                    userPreferred
                  }
                }
              }
            }
            recommendations {
              edges {
                node {
                  id
                  mediaRecommendation {
                    id
                    idMal
                    title {
                      romaji
                      english
                      native
                      userPreferred
                    }
                    status(version: 2)
                    episodes
                    coverImage {
                      extraLarge
                      large
                      medium
                      color
                    }
                    bannerImage
                    format
                    chapters
                    meanScore
                    nextAiringEpisode {
                      episode
                      timeUntilAiring
                      airingAt
                    }
                  }
                }
              }
            }
            relations {
              edges {
                id
                relationType
                node {
                  season
                  seasonYear
                  id
                  idMal
                  status(version: 2)
                  coverImage {
                    extraLarge
                    large
                    medium
                    color
                  }
                  bannerImage
                  title {
                    romaji
                    english
                    native
                    userPreferred
                  }
                  episodes
                  chapters
                  format
                  nextAiringEpisode {
                    airingAt
                    timeUntilAiring
                    episode
                  }
                  meanScore
                }
              }
            }
            studios {
              edges {
                isMain
                node {
                  id
                  name
                }
                id
              }
            }
            startDate {
              year
              month
              day
            }
            endDate {
              year
              month
              day
            }
          }
        }`;
    
        const variables = { id: mediaId };
    
        try {
            const response = await fetch(this.api, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    origin: "graphql.anilist.co",
                },
                body: JSON.stringify({ query, variables }),
            });
    
            const responseData = await response.json() as { data: { Media: MediaInfo } };
            const data = responseData.data;
            if (!data) {
                throw new Error("No data received from AniList API");
            }
            return this.formatData(data.Media);
        } catch (error) {
            console.error("Error fetching data from AniList:", error);
            return null;
        }
    }
    
    
    
    

    private formatData(data: any): MediaInfo {
        return {
            id: data.id,
            title: {
                english: data.title.english,
                romaji: data.title.romaji,
                native: data.title.native,
            },
            coverImage: data.coverImage.extraLarge || data.coverImage.large || null,
            bannerImage: data.bannerImage || null,
            genres: data.genres || [],
            description: data.description || null,
            characters: data.characters.edges.map((edge: any) => ({
                name: edge.node.name.full,
                image: edge.node.image.large || null
            })),
            relations: data.relations.edges.map((edge: any) => ({
                title: edge.node.title,
            })),
        };
    }
}

export default AniList;
