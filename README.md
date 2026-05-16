# Cozy Recipes

A cute offline-first recipe PWA built with React, TypeScript, Vite, TailwindCSS, and IndexedDB.

Designed as a lightweight personal recipe book with:
- local-first storage
- offline support
- image uploads
- image compression
- keyword search
- mobile-friendly UI
- cozy rose/pink aesthetic

## Features

- Add and edit recipes
- Store multiple recipe images
- Automatic image compression and resizing
- Local IndexedDB persistence
- Offline support
- Fast keyword search
- Recently used recipes
- Mobile-first responsive design
- Installable PWA

## Tech Stack

- React
- TypeScript
- Vite
- TailwindCSS
- Dexie.js
- IndexedDB
- browser-image-compression
- react-easy-crop

## Development

Install dependencies:

```bash
npm install
```

Start development server:

```bash
npm run dev
```

Build project:

```bash
npm run build
```

## Notes

This project is currently fully local-first and does not yet use Firebase sync.

All recipes and images are stored locally in IndexedDB.