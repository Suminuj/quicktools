# Checkmate Chess

A modern mobile-first chess game for Android, developed phone-first.

## Current source features
- Local two-player mode
- Play against a basic computer opponent
- Standard legal chess rules using chess.js
- Castling, en passant, pawn promotion, check, checkmate and draw detection
- Undo and restart
- Move history
- Responsive dark interface
- Web app manifest and offline service-worker caching

## Android APK
The GitHub Actions workflow is at `.github/workflows/checkmate-chess.yml`. It installs dependencies, builds the Vite app, creates the Capacitor Android project, compiles a debug APK and uploads it as an Actions artifact.

## Build locally
```bash
npm install
npm run build
npx cap add android
npx cap sync android
cd android && ./gradlew assembleDebug
```

## Known limitations
The computer opponent is a basic minimax search, not Stockfish. The web version caches its files after first load; the Android package bundles the game code and chess rules locally.

Android application ID: `com.sumin.checkmate`
