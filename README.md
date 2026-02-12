# Boardgames

A shared boardgame library manager. Track, borrow, and return boardgames from a shared collection.

## Features

- Google authentication
- Browse boardgames with filtering and search
- Filter by: players, time, age, complexity, party/co-op
- Borrow and return games
- Add new games from Ludopedia
- Real-time updates via Firestore

## Tech Stack

- [Alpine.js](https://alpinejs.dev/) - Reactivity
- [DaisyUI](https://daisyui.com/) / [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Firebase](https://firebase.google.com/) - Auth & Firestore

## Setup

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Google Sign-In in Authentication
3. Create a Firestore database

### Local Development

1. Copy the env example and fill in your values:

```bash
cp .env.example .env
```

2. Generate the config:

```bash
node scripts/generate-config.js
```

### CI/CD (GitHub Actions)

Set the following in your repository settings:

**Secret** (Settings → Secrets and variables → Actions → Secrets):
- `FIREBASE_API_KEY`

**Variables** (Settings → Secrets and variables → Actions → Variables):
- `FIREBASE_AUTH_DOMAIN`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_STORAGE_BUCKET`
- `FIREBASE_MESSAGING_SENDER_ID`
- `FIREBASE_APP_ID`

## Firestore Structure

```
boardgames/
  {gameId}/
    name: string
    playersMin: number
    playersMax: number
    time: number
    age: number
    complexity: string
    coop: string
    party: string
    rating: number
    rank: number
    image: string
    link: string
    borrowedBy: string (email)
    borrowedByName: string
```

## License

MIT
