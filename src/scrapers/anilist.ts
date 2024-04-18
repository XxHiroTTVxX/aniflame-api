// AniList.ts
interface Character {
    name: string;
    image: string | null;
}

interface Relation {
    title: string;
    bannerImage: string | null;
}

interface MediaInfo {
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

class AniList {
    [x: string]: any;
    private readonly api: string;

    constructor() {
        this.api = "https://graphql.anilist.co";
    }

    async getInfo(mediaType: string, mediaId: number): Promise<MediaInfo | null> {
        const query = `
            query ($id: Int) {
                Media (id: $id) {
                    id
                    title {
                        english
                        romaji
                        native
                    }
                    coverImage {
                        extraLarge
                        large
                    }
                    bannerImage
                    genres
                    description
                    characters {
                        edges {
                            node {
                                name {
                                    full
                                }
                                image {
                                    large
                                }
                            }
                        }
                    }
                    relations {
                        edges {
                            node {
                                title {
                                    english
                                    romaji
                                    native
                                }
                                bannerImage
                            }
                        }
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
