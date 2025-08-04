# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Radio Calico is a web-based HLS (HTTP Live Streaming) radio player with rating functionality. The application consists of:

- **Frontend**: Single-page HTML application with external CSS/JS using HLS.js for audio streaming
- **Backend**: Flask API server providing song rating functionality with SQLite database
- **Development**: Vite dev server for frontend development

## File Structure

```
radiocalico/
├── index.html                    # Main frontend application (HTML structure)
├── css/
│   └── styles.css               # Main stylesheet with brand styling
├── js/
│   └── app.js                   # Main JavaScript application logic
├── app.py                        # Flask backend API server
├── package.json                  # Node.js dependencies and scripts
├── vite.config.js               # Vite development server configuration
├── ratings.db                   # SQLite database (auto-generated)
├── stream_URL.txt               # HLS stream endpoint reference
├── RadioCalicoLogoTM.png        # Official brand logo
├── RadioCalico_Style_Guide.txt  # Complete brand guidelines
├── RadioCalicoLayout.png        # Reference design layout
└── node_modules/                # Node.js dependencies
```

## Architecture

### Frontend
- **HTML** (`index.html`): Main application structure and DOM elements
- **CSS** (`css/styles.css`): Radio Calico brand styling with color palette, typography, and responsive layout
- **JavaScript** (`js/app.js`): Application logic including HLS streaming, metadata fetching, and rating functionality
- Uses HLS.js library for streaming audio playback
- Fetches metadata from CloudFront endpoints for track information and album art
- Two-column responsive layout: large album artwork on left, track info and controls on right

### Backend (`app.py`)
- Flask REST API server running on port 5001
- SQLite database (`ratings.db`) with songs and ratings tables
- Session-based user tracking using UUIDs
- CORS enabled for cross-origin requests from frontend

### Data Flow
1. Frontend fetches metadata from `https://d3d4yli4hf5bmh.cloudfront.net/metadatav2.json` every 30 seconds
2. Album artwork loaded from `https://d3d4yli4hf5bmh.cloudfront.net/cover.jpg` with cache-busting
3. HLS stream consumed from `https://d3d4yli4hf5bmh.cloudfront.net/hls/live.m3u8`
4. User ratings sent to Flask backend API at `/api/rate` and `/api/ratings/<title>/<artist>`

## Development Commands

### Start Development Environment
```bash
npm run start        # Starts both backend (Python Flask) and frontend (Vite) concurrently
```

### Individual Services
```bash
npm run dev          # Start Vite dev server only (port 3000)
npm run backend      # Start Flask API server only (port 5001)
python app.py        # Alternative way to start Flask server
```

### Build and Preview
```bash
npm run build        # Build production assets with Vite
npm run preview      # Preview production build
```

## Database

The SQLite database (`ratings.db`) is automatically initialized on Flask startup with two tables:
- `songs`: Stores track metadata with unique hash-based IDs
- `ratings`: Stores user ratings (thumbs up/down) linked to songs and user sessions

Song identification uses MD5 hash of lowercased "title:artist" string to handle duplicate submissions.

## Brand Assets

- `RadioCalicoLogoTM.png`: Official logo with calico cat mascot
- `RadioCalico_Style_Guide.txt`: Complete brand guidelines including color palette, typography, and UI specifications
- `RadioCalicoLayout.png`: Reference layout design

## Key External Dependencies

- **HLS.js**: For HTTP Live Streaming audio playback
- **Google Fonts**: Montserrat and Open Sans font families
- **CloudFront CDN**: Serves audio stream, metadata, and album artwork

## API Endpoints

- `POST /api/rate`: Submit song rating (requires title, artist, rating)
- `GET /api/ratings/<title>/<artist>`: Get aggregated ratings and user's current rating
- `GET /api/health`: Health check endpoint