/**
 * @author Adapted from various anime mapping implementations
 */

import axios from 'axios';
import { db } from '../../db';
import { anime } from '../../db/schema';
import { distance } from 'fastest-levenshtein';
import { eq } from 'drizzle-orm';

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
      synonyms
      startDate {
        year
      }
      nextAiringEpisode {
        episode
      }
    }
  }
`;

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    // Remove common suffixes and annotations with more variations
    .replace(/[\s-]*\(?(?:dub|sub|dubbed|subbed|uncensored|uncut|censored|raw)\)?/gi, '')
    .replace(/\s*[\(\[\{](?:dub|sub|dubbed|subbed|uncensored|uncut|censored|raw)[\)\]\}]/gi, '')
    .replace(/\s*(season\s*\d+|\d+st|\d+nd|\d+rd|\d+th\s+season)/gi, '')
    .replace(/\s*(part\s*\d+)/gi, '')
    .replace(/\s*(480p|720p|1080p|2160p|4k)/gi, '')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getAllTitles(animeTitle: any): string[] {
  const titles = [];
  if (animeTitle.romaji) titles.push(animeTitle.romaji);
  if (animeTitle.english) titles.push(animeTitle.english);
  if (animeTitle.native) titles.push(animeTitle.native);
  return titles;
}

async function findMatchingAnime() {
  const gogoData = await db
    .select({
      id: anime.id,
      title: anime.title,
      released: anime.released,
      anilistId: anime.anilistId
    })
    .from(anime);

  if (!gogoData.length) {
    console.error('No anime data found in database');
    return [];
  }

  console.log(`Found ${gogoData.length} anime in database`);
  const matches = [];

  for (const animeEntry of gogoData) {
    if (animeEntry.anilistId) {
      console.log('\x1b[33m%s\x1b[0m', `Skipping "${animeEntry.title}" - already has AniList ID: ${animeEntry.anilistId}`);
      continue;
    }

    const gogoTitle = animeEntry.title;
    const normalizedTitle = normalizeTitle(gogoTitle);
    const gogoYear = animeEntry.released;

    try {
      console.log('\x1b[34m%s\x1b[0m', `\nSearching for: ${normalizedTitle}`);
      const anilistResponse = await axios.post(ANILIST_API_URL, {
        query: SEARCH_QUERY,
        variables: { search: normalizedTitle },
      });

      const media = anilistResponse.data?.data?.Media;
      if (!media) {
        console.log(`No results found for: ${normalizedTitle}`);
        continue;
      }

      const candidates = Array.isArray(media) ? media : [media];
      let foundMatch = false;

      // 1. Try exact match with year
      if (gogoYear && !foundMatch) {
        const exactYearMatch = candidates.find((candidate: any) => 
          candidate.startDate.year === gogoYear &&
          getAllTitles(candidate.title).some(title => title === gogoTitle)
        );
        if (exactYearMatch) {
          console.log(`Match found! AniList ID: ${exactYearMatch.id} (${exactYearMatch.title.romaji})`);
          await db.update(anime)
            .set({ anilistId: exactYearMatch.id.toString() })
            .where(eq(anime.id, animeEntry.id));
          console.log('\x1b[32m%s\x1b[0m', `✓ Successfully updated database with AniList ID: ${exactYearMatch.id}`);
          matches.push({ 
            match: exactYearMatch, 
            matchType: 'exact-year', 
            originalTitle: gogoTitle,
            year: gogoYear
          });
          foundMatch = true;
        }
      }

      // 2. Try normalized match with year
      if (gogoYear && !foundMatch) {
        const normalizedGogoTitle = normalizeTitle(gogoTitle);
        const normalizedMatch = candidates.find((candidate: any) =>
          candidate.startDate.year === gogoYear &&
          getAllTitles(candidate.title).some(title => 
            normalizeTitle(title) === normalizedGogoTitle
          )
        );
        if (normalizedMatch) {
          console.log(`Match found! AniList ID: ${normalizedMatch.id} (${normalizedMatch.title.romaji})`);
          await db.update(anime)
            .set({ anilistId: normalizedMatch.id.toString() })
            .where(eq(anime.id, animeEntry.id));
          console.log('\x1b[32m%s\x1b[0m', `✓ Successfully updated database with AniList ID: ${normalizedMatch.id}`);
          matches.push({ 
            match: normalizedMatch, 
            matchType: 'normalized-year', 
            originalTitle: gogoTitle,
            year: gogoYear
          });
          foundMatch = true;
        }
      }

      // 3. Try fuzzy match with high similarity
      if (!foundMatch) {
        const normalizedGogoTitle = normalizeTitle(gogoTitle);
        let bestMatch = null;
        let highestSimilarity = 0;

        for (const candidate of candidates) {
          for (const title of getAllTitles(candidate.title)) {
            const normalizedTitle = normalizeTitle(title);
            const dist = distance(normalizedTitle, normalizedGogoTitle);
            const maxLength = Math.max(normalizedTitle.length, normalizedGogoTitle.length);
            const similarity = 1 - dist / maxLength;

            if (similarity > highestSimilarity && similarity >= 0.8) {
              highestSimilarity = similarity;
              bestMatch = { 
                match: candidate, 
                matchType: 'fuzzy', 
                similarity, 
                originalTitle: gogoTitle,
                year: gogoYear
              };
            }
          }
        }

        if (bestMatch) {
          console.log(`Match found! AniList ID: ${bestMatch.match.id} (${bestMatch.match.title.romaji})`);
          await db.update(anime)
            .set({ anilistId: bestMatch.match.id.toString() })
            .where(eq(anime.id, animeEntry.id));
          console.log('\x1b[32m%s\x1b[0m', `✓ Successfully updated database with AniList ID: ${bestMatch.match.id}`);
          matches.push(bestMatch);
          foundMatch = true;
        }
      }

      if (!foundMatch) {
        console.log(`No matching anime found for: ${normalizedTitle}`);
      }

      // Add a small delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(`Error searching for "${normalizedTitle}": ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        console.error(`Unexpected error for "${normalizedTitle}":`, error);
      }
    }
  }

  console.log(`\nFinished processing all anime entries. Found ${matches.length} matches.`);
  return matches;
}

(async () => {
  try {
    const results = await findMatchingAnime();
    console.log('\nMatching Results:');
    results.forEach((result, index) => {
      console.log(`\n${index + 1}. Original Title: ${result.originalTitle}`);
      console.log(`   Matched Title: ${result.match.title.romaji}`);
      console.log(`   Year: ${result.year || 'N/A'}`);
      console.log(`   Match Type: ${result.matchType}${result.similarity ? `, Similarity: ${result.similarity.toFixed(2)}` : ''}`);
    });
  } catch (error) {
    console.error('Script failed:', error);
  }
})();