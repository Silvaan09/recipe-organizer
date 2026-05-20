# Cozy Recipes

A cute recipe PWA built with React, TypeScript, Vite, TailwindCSS, IndexedDB, and Firebase.

Cozy Recipes is designed as a lightweight personal recipe book with a mobile-first interface, local storage, optional cloud sync, image uploads, and a cozy rose/pink food-themed aesthetic.

## Web App

The app is available here:

https://Silvaan09.github.io/recipe-organizer/

## Features

- Store multiple recipe images per recipe
- Automatic image compression and resizing
- Local IndexedDB persistence
- Offline-first usage
- Fast local keyword search
- Recently used recipes
- Recipe list with sorting options
- Mobile-first responsive design
- Installable PWA
- Manual Firebase upload sync
- Manual Firebase download sync
- Local backup and restore support

## Tech Stack

- React
- TypeScript
- Vite
- TailwindCSS
- Dexie.js
- IndexedDB
- Firebase Auth
- Firebase Firestore
- Firebase Storage
- browser-image-compression
- react-easy-crop

## Storage Model

Cozy Recipes is local-first.

Recipes and images are stored locally in IndexedDB so the app can be used offline. Firebase is used as a manual cloud sync and backup layer.

Normal app usage reads from the local database. Firebase reads and writes only happen when the user manually starts a sync.

## Firebase Sync

The app supports:

- Google sign-in
- Manual upload of pending local changes
- Manual download from cloud to local device
- Firebase Storage for recipe images
- Firestore for recipe metadata
- Per-user data paths based on Firebase Auth UID
- Email allowlist access control through Firebase Security Rules

The app does not use realtime listeners or automatic background sync.

## Development

Install dependencies:

    npm install

Start the development server:

    npm run dev

Build the project:

    npm run build

Run linting:

    npm run lint

## Environment Variables

Create a `.env.local` file in the project root for Firebase configuration.

Use `.env.example` as the template.

Required variables:

    VITE_FIREBASE_API_KEY=
    VITE_FIREBASE_AUTH_DOMAIN=
    VITE_FIREBASE_PROJECT_ID=
    VITE_FIREBASE_STORAGE_BUCKET=
    VITE_FIREBASE_MESSAGING_SENDER_ID=
    VITE_FIREBASE_APP_ID=

Do not commit `.env.local`.

## Deployment

The app is intended to be hosted on GitHub Pages.

Before deploying, make sure:

- the Vite `base` path matches the GitHub Pages repository path
- Firebase environment variables are available during the production build
- the GitHub Pages domain is added to Firebase Authentication authorized domains
- Firestore and Storage security rules are published

## Notes

This project is built for a very small personal use case, not as a public multi-user recipe platform.

The app intentionally avoids automatic Firebase reads, realtime listeners, background polling, and server infrastructure to keep it simple, cheap, and reliable.