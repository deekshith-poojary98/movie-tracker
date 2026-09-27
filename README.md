# Shelf

Netflix-style tracker for movies you've watched. Data lives in MongoDB Atlas.

## Setup

```bash
npm install
cp .env.example .env.local
```

Add to `.env.local`:

```env
TMDB_API_KEY=your_key_here
MONGODB_URI=mongodb+srv://USER:PASS@CLUSTER.mongodb.net/reellog?retryWrites=true&w=majority
MONGODB_DB=reellog
```

Get a free [TMDB API key](https://www.themoviedb.org/settings/api).

## Migrate from SQLite (one-time)

If you still have `data/movies.db`:

```bash
npx tsx scripts/migrate-sqlite-to-mongo.ts
```

## Seed from your sheet

Imports titles from `Watched movies list/sheet.html` and (when a TMDB key is set) fetches posters and overviews:

```bash
npm run seed
```

Re-running `npm run seed` clears the MongoDB collection and imports again.

Without `TMDB_API_KEY`, movies still import — posters stay empty until you re-seed or edit via TMDB search in the UI.

### Refresh genres & metadata from TMDB

Keeps your list (dates, language, titles) and overwrites genres / posters / overview / runtime / rating / tagline / director / cast / trailer from TMDB:

```bash
npm run enrich
```

## Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Features

- Browse by year, genre, and language (horizontal poster rails)
- Search and filter (viewable by anyone with the URL)
- Admin login to add / edit / delete movies
- TMDB search when logging a new title

## Admin login

Hardcoded defaults (override in `.env.local`):

- Username: `admin`
- Password: `reellog2018`

Guests can browse only. Add / Edit / Delete require login.

## Stack

Next.js (App Router) · MongoDB Atlas · Tailwind · TMDB
