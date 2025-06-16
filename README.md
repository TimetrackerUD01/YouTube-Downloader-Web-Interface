# YouTube Downloader Web Interface

A web interface for downloading YouTube videos using @distube/ytdl-core.

## Features

- 🎥 Download YouTube videos in various qualities
- 📊 Real-time progress tracking
- 🎯 Video information display
- 🔒 Secure and updated dependencies
- 📱 Responsive design

## Tech Stack

- **Backend**: Node.js + Express
- **YouTube API**: @distube/ytdl-core
- **Frontend**: Bootstrap 5 + Vanilla JavaScript
- **File Handling**: Multer

## Environment Variables

- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (production/development)
- `YTDL_NO_UPDATE`: Disable auto-updates for security (set to true)

## Installation

```bash
npm install
npm start
```

## Deployment on Render

1. Connect your GitHub repository to Render
2. Use the provided `render.yaml` configuration
3. Environment variables are set automatically
4. Free tier provides 750 hours/month

## Usage

1. Enter YouTube video URL
2. Select desired quality
3. Click "Download Video"
4. Wait for download completion

## Security

- All dependencies updated to latest versions
- No known vulnerabilities
- Auto-update disabled for security
- Uses maintained @distube/ytdl-core library

## License

For educational and testing purposes only. Please respect YouTube's Terms of Service and copyright laws.
