# 🎤 Speech to Text Browser Extension

A complete, production-ready browser extension that allows you to dictate text into any input field using your voice. Supports multiple languages and works with all websites including Gmail, Google Docs, Notion, and more.

## Features

- 🎙️ **Click-to-Dictate**: Click the microphone button that appears next to any text field
- ⌨️ **Keyboard Shortcut**: Press `Ctrl+Shift+Y` (or `Cmd+Shift+Y` on Mac) to toggle recording
- 🌍 **Multi-Language Support**: 12+ languages including English, Spanish, French, German, Chinese, Japanese, and more
- 🔄 **Real-time Transcription**: See your words appear as you speak
- 🎯 **Works Everywhere**: Compatible with all websites and web apps
- 📱 **Rich Text Support**: Works with contenteditable areas (Gmail, Google Docs, Notion)
- 💾 **Persistent Settings**: Your language preferences are saved
- 🎨 **Beautiful UI**: Clean, modern interface with dark mode support

## Architecture

This project includes two implementations:

### Option 1: Browser Extension (Recommended)
Uses the Web Speech API built into Chrome - **no backend required**.

### Option 2: Backend + Extension
Uses Google Cloud Speech-to-Text API for higher accuracy and more features.

---

## Quick Start: Browser Extension Only

### 1. Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top right)
3. Click **Load unpacked** and select the `extension` folder
4. The extension icon will appear in your toolbar

### 2. Usage

1. Click on any text input field on any website
2. Click the microphone button that appears
3. Speak clearly - your words will be transcribed automatically
4. Click the microphone again to stop

**Keyboard shortcut**: Press `Ctrl+Shift+Y` to start/stop recording.

---

## Backend Setup (Optional - for Google Cloud Speech API)

If you want higher accuracy transcription, you can use the Google Cloud Speech-to-Text API backend.

### Prerequisites

- Node.js 16+ installed
- Google Cloud account with Speech-to-Text API enabled
- Service account credentials JSON file

### Setup Steps

#### 1. Install Dependencies

```bash
cd backend
npm install
```

#### 2. Configure Environment

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your settings
PORT=3000
GOOGLE_APPLICATION_CREDENTIALS=./google-credentials.json
```

#### 3. Set Up Google Cloud Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Speech-to-Text API
4. Create a service account:
   - IAM & Admin → Service Accounts → Create
   - Grant role: `Cloud Speech Client`
5. Create and download a JSON key
6. Rename the file to `google-credentials.json` and place it in the `backend` folder

#### 4. Run the Server

```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:3000`.

---

## Extension Configuration

### Loading as Unpacked Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `extension` folder

### Packing for Distribution

```bash
cd extension
# Create a zip file (exclude development files)
zip -r speech-to-text.zip . -x "*.DS_Store" -x "*/.git/*"
```

Then upload to Chrome Web Store following their [publishing guidelines](https://developer.chrome.com/docs/webstore/publish/).

---

## Project Structure

```
stt-extension/
├── extension/                    # Browser extension files
│   ├── manifest.json            # Extension manifest
│   ├── content_scripts/         # Scripts injected into web pages
│   │   ├── speech-to-text.js   # Main content script
│   │   └── styles.css          # Extension styles
│   ├── background/              # Background service worker
│   │   └── background.js
│   ├── popup/                   # Extension popup UI
│   │   ├── popup.html
│   │   └── popup.js
│   └── icons/                   # Extension icons
│       ├── icon16.png
│       ├── icon32.png
│       ├── icon48.png
│       └── icon128.png
│
└── backend/                     # Optional Node.js backend
    ├── server.js               # Main server file
    ├── package.json
    ├── .env.example
    └── .gitignore
```

---

## API Endpoints (Backend)

### Health Check
```bash
GET /health

Response:
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "1.0.0"
}
```

### Get Supported Languages
```bash
GET /languages

Response:
{
  "languages": [
    { "code": "en-US", "name": "English (US)" },
    { "code": "es-ES", "name": "Spanish" },
    ...
  ]
}
```

### Transcribe Audio
```bash
POST /transcribe
Content-Type: application/json

{
  "audioContent": "base64_encoded_audio_string",
  "languageCode": "en-US",
  "enableAutomaticPunctuation": true,
  "enableProfanityFilter": false,
  "useEnhanced": true
}

Response:
{
  "transcript": "Hello, this is a test transcription.",
  "confidence": 0.9823,
  "language": "en-US",
  "wordCount": 6,
  "alternatives": [...],
  "metadata": {
    "requestId": "...",
    "duration": "1245ms",
    "timestamp": "..."
  }
}
```

---

## Supported Languages

| Language Code | Language |
|--------------|----------|
| en-US | English (US) |
| en-GB | English (UK) |
| es-ES | Spanish |
| fr-FR | French |
| de-DE | German |
| it-IT | Italian |
| pt-BR | Portuguese |
| zh-CN | Chinese (Simplified) |
| ja-JP | Japanese |
| ko-KR | Korean |
| ru-RU | Russian |
| hi-IN | Hindi |
| ar-SA | Arabic |

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+Y` | Toggle recording |
| `Esc` | Stop recording |

---

## Troubleshooting

### Extension not appearing on text fields
- Refresh the page after installing the extension
- Check that the extension is enabled in `chrome://extensions/`
- Some sites may block content scripts (try on a different site)

### "Speech recognition not supported"
- This extension requires Chrome or Chromium-based browsers
- Ensure you're using Chrome version 25+
- Enable "Voice" in Chrome settings

### "Microphone access denied"
- Click the lock icon in the address bar
- Allow microphone access for the site
- Check system microphone permissions

### Backend connection errors
- Ensure the server is running: `npm run dev`
- Check your firewall settings
- Verify `GOOGLE_APPLICATION_CREDENTIALS` is set correctly

### Poor transcription accuracy
- Speak clearly and at a moderate pace
- Use a quality microphone
- Try the Google Cloud backend for better results
- Check your internet connection

---

## Development

### Running Locally

```bash
# Backend
cd backend
npm install
npm run dev

# Extension (load as unpacked)
# See "Loading as Unpacked Extension" section
```

### Building Icons

Create icon files in the following sizes:
- 16x16 pixels (toolbar icon)
- 32x32 pixels (toolbar icon @2x)
- 48x48 pixels (extensions page)
- 128x128 pixels (Chrome Web Store)

### Testing

```bash
# Backend tests (if you add them)
npm test

# Manual testing checklist:
# 1. Load extension
# 2. Visit various websites
# 3. Test on input fields, textareas, and contenteditable areas
# 4. Test keyboard shortcuts
# 5. Test language switching
```

---

## Security Considerations

- The extension only requests necessary permissions (`activeTab`, `storage`)
- Audio is processed locally (Web Speech API) or via Google Cloud (optional backend)
- No audio data is stored permanently
- CORS is configured to only accept requests from allowed origins in production

---

## Browser Compatibility

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 25+ | ✅ Fully supported |
| Edge | 79+ | ✅ Supported |
| Firefox | 45+ | ⚠️ Limited (no Web Speech API) |
| Safari | 14.1+ | ⚠️ Limited support |

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -am 'Add new feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Submit a pull request

---

## License

MIT License - see LICENSE file for details.

---

## Credits

- Web Speech API by Google
- Google Cloud Speech-to-Text API
- Icons from Material Design

---

## Support

For issues, questions, or feature requests:
- Open an issue on GitHub
- Contact: [your-email@example.com]

---

**Happy dictating! 🎤**