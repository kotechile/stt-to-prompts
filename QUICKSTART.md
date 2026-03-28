# 🚀 Quick Start Guide

## Option 1: Browser Extension Only (No Backend)

This uses the Web Speech API built into Chrome - works offline!

### Installation

1. **Open Chrome Extensions**
   - Navigate to `chrome://extensions/`
   - Enable **Developer mode** (toggle in top right)

2. **Load Extension**
   - Click **Load unpacked**
   - Select the `extension` folder

3. **Test It**
   - Visit any website
   - Click on any text field
   - Click the 🎤 microphone button
   - Start speaking!

**Keyboard shortcut**: Press `Ctrl+Shift+Y` to toggle recording.

---

## Option 2: With Backend (Higher Accuracy)

Uses Google Cloud Speech-to-Text API.

### Step 1: Start Backend

```bash
cd backend
npm install

# Copy and edit environment file
cp .env.example .env
# Edit .env with your Google Cloud credentials path

npm run dev
```

Server runs on `http://localhost:3000`

### Step 2: Set Up Google Cloud

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project
3. Enable **Speech-to-Text API**
4. Create a service account → Download JSON key
5. Rename key to `google-credentials.json` and place in `backend/` folder

### Step 3: Update Extension

Edit `extension/manifest.json`:

```json
"content_scripts": [{
  "js": ["content_scripts/speech-to-text-backend.js"],  // Change this line
  ...
}]
```

### Step 4: Load Extension

Same as Option 1.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Extension not showing | Refresh page, check it's enabled |
| "Microphone access denied" | Click 🔒 icon in address bar → Allow |
| Backend not connecting | Check server is running on port 3000 |
| Poor accuracy | Use backend option, speak clearly |

---

## Files Overview

```
stt-extension/
├── extension/           # Load this folder in Chrome
│   ├── manifest.json   # Extension config
│   ├── content_scripts/# Main logic
│   └── icons/          # Generate icons first
└── backend/            # Optional Node.js server
    ├── server.js       # API server
    └── .env            # Your credentials
```

---

## Next Steps

- Generate icons: `cd extension/icons && node generate.js`
- Read full docs: [README.md](README.md)
- Customize: Edit `content_scripts/speech-to-text.js`

**Enjoy voice typing! 🎤**