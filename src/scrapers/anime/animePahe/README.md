# AnimePahe Provider

This module provides functionality to scrape anime information from AnimePahe and store it in the database.

## Features

- Fetch anime information from AnimePahe
- Extract episode data including titles, numbers, and streaming URLs
- Store anime information in the database with provider tracking
- Get m3u8 links for streaming episodes

## Usage

### Fetching Anime Information

```typescript
import { animePaheProvider } from '../scrapers/anime/animePahe';

// Fetch anime info by ID
const animeInfo = await animePaheProvider.fetchAnimeInfo('d58fc9f8-582e-fdf0-3618-112cd54ed5ab');

console.log(`Title: ${animeInfo.title}`);
console.log(`Episodes: ${animeInfo.totalEpisodes}`);
```

### Getting m3u8 Links for Streaming

```typescript
import { paheSource } from '../scrapers/anime/animePahe';

// Get m3u8 links for a specific episode
const episodeId = 'd58fc9f8-582e-fdf0-3618-112cd54ed5ab/e83e4ca081f86316aff2525a323a3980b854769fb16467f0824e7a77514b106b';
const videoData = await paheSource(episodeId);

// Access the m3u8 links
if (!Array.isArray(videoData)) {
  const highestQualityLink = videoData.sub['1080p']?.src || 
                            videoData.sub['720p']?.src || 
                            videoData.sub['480p']?.src || 
                            videoData.sub['360p']?.src;
  
  console.log(`Streaming URL: ${highestQualityLink}`);
}
```

## Database Integration

The provider automatically stores anime information in the database with the provider field set to "animePahe". This allows you to track which source the anime data came from.

### Database Schema

The anime table includes a `provider` column that indicates the source of the anime data:

```sql
ALTER TABLE anime
ADD COLUMN IF NOT EXISTS provider TEXT;
```

### Running the Migration

To add the provider column to your database:

```bash
bun run src/db/migrations/add_provider_column.ts
```

## Example Script

A demonstration script is available to show how to fetch anime information and store it in the database:

```bash
bun run src/scripts/fetchAnimePaheInfo.ts <anime_id>
```

Example:
```bash
bun run src/scripts/fetchAnimePaheInfo.ts d58fc9f8-582e-fdf0-3618-112cd54ed5ab
``` 