import axios from 'axios';
import { db } from '../../db';
import { anime } from '../../db/schema';

const ANILIST_API_URL = 'https://graphql.anilist.co/';

const SEARCH_QUERY = `
  query ($search: String) {
    Media(search: $search, type: ANIME) {
      id
      title {
        romaji
        english
        native
      }
      startDate {
        year
      }
      nextAiringEpisode {
        episode
      }
    }
  }
`;



async function searchAniList(title: string) {
  try {
    const response = await axios.post(
      ANILIST_API_URL,
      {
        query: SEARCH_QUERY,
        variables: { search: title },
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.data.Media;
  } catch (error) {
    throw new Error('Error fetching data from AniList: ' + error);
  }
}


const gogoTitle = (await db
  .select({
    title: anime.title,
  })
  .from(anime))[0].title;


function matchStrings( anilistTitle: string): boolean {
  // Normalize strings by converting to lowercase and trimming whitespace
  const normalize = (str: string) => str.toLowerCase().trim();

  return normalize(gogoTitle) === normalize(anilistTitle);
}

const gogoYear = (await db
  .select({
    released: anime.released,
  })
  .from(anime))[0].released;

function matchDates( anilistYear: number): boolean {
  return gogoYear === anilistYear;
}

async function findMatchingAnime (){
  const anilistData = searchAniList(gogoTitle);
  if (!anilistData) {
    console.error('No data found from AniList');
    return;
  }

  let matchingAnime;
  for (const anime of await anilistData) {
    if (matchStrings(anime.title.romaji) && matchDates(anime.startDate.year)) {
      matchingAnime = anime;
      break;
    }
  }

  if (matchingAnime) {
    console.log(`Matching anime found: ${matchingAnime.title.romaji}`);
  } else {
    console.log('No matching anime found');
  }
}

(async () => {

  await findMatchingAnime();
})();