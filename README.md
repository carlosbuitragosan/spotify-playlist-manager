![Deploy Status](https://github.com/carlosbuitragosan/music-player/workflows/Deploy/badge.svg)

# Spotify Playlist Manager

A React single-page application integrating the Spotify Web API using OAuth authentication. Authenticated users can search tracks and create playlists directly in their Spotify account.

## Overview

- OAuth (Implicit Grant) authentication with Spotify Accounts
- Client-side access token extraction and persistence
- Track search and playlist creation via Spotify Web API
- Authorization header management for protected endpoints
- 401 handling with automatic token invalidation
- Conditional UI rendering using React Hooks

## Stack

React · JavaScript · Spotify Web API · OAuth 2.0 (Implicit Grant) · GitHub Actions · GitHub Pages

## Deployment

The application is automatically built and deployed via GitHub Actions, generating a production bundle with injected environment variables and publishing the /build directory to GitHub Pages on each push.

## Next Steps

- Replace the OAuth Implicit Grant flow with Authorization Code + PKCE
- Retrieve and display the user’s existing playlists
- Implement playlist editing (track removal and reordering)
