/**
 * Speech to Text Content Script - Backend Version
 *
 * This version uses the Google Cloud Speech-to-Text API backend
 * for potentially higher accuracy transcription.
 *
 * To use this instead of the Web Speech API version:
 * 1. Run the backend server
 * 2. Update manifest.json to point to this file instead
 *    (change "speech-to-text.js" to "speech-to-text-backend.js")
 */

(function() {
    'use strict';

    // Prevent duplicate initialization
    if (window.speechToTextInitialized) return;
    window.speechToTextInitialized = true;

    // Configuration
    const CONFIG = {
        backendUrl: 'https://voiceprompt.aichieve.net',
        micButtonSize: 40,
        debounceDelay: 150,
        recordingTimeSlice: 1000, // Send audio every 1 second
        maxRecordingDuration: 60000, // 60 seconds max
        languages: {
            'en-US': 'English (US)',
            'es-ES': 'Spanish',
            'fr-FR': 'French',
            'de-DE': 'German',
            'it-IT': 'Italian',
            'pt-BR': 'Portuguese',
            'zh-CN': 'Chinese (Simplified)',
            'ja-JP': 'Japanese',
            'ko-KR': 'Korean',
            'ru-RU': 'Russian',
            'hi-IN': 'Hindi',
            'ar-SA': 'Arabic'
        }
    };

    // State management
    const state = {
        mediaRecorder: null,
        audioChunks: [],
        isRecording: false,
        isPaused: false,
        activeElement: null,
        micButton: null,
        languageSelector: null,
        statusIndicator: null,
        accumulatedText: '',
        currentLanguage: 'en-US',
        recordingTimer: null,
        recordingStartTime: null
    };

    // SVG Icons
    const ICONS = {
        mic: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
        </svg>`,
        micActive: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" fill="#ff4444"/>
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" fill="#ff4444"/>
        </svg>`,
        settings: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.58 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
        </svg>`,
        close: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>`,
        check: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
        </svg>`,
        cloud: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/>
        </svg>`
    };

    // Check backend health
    async function checkBackend() {
        try {
            const response = await fetch(`${CONFIG.backendUrl}/health`, { method: 'GET' });
            return response.ok;
        } catch (e) {
            return false;
        }
    }

    // Start recording
    async function startRecording() {
        const isBackendReady = await checkBackend();
        if (!isBackendReady) {
            showNotification('Backend server not running. Please start the server.', 'error');
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            state.mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus'
            });

            state.audioChunks = [];
            state.isRecording = true;
            state.recordingStartTime = Date.now();

            state.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    state.audioChunks.push(event.data);
                }
            };

            state.mediaRecorder.onstop = processAudio;

            // Collect data every second for real-time feel
            state.mediaRecorder.start(CONFIG.recordingTimeSlice);

            updateUIState();
            showNotification('Recording started...', 'info');

            // Set max recording timer
            state.recordingTimer = setTimeout(() => {
                if (state.isRecording) {
                    stopRecording();
                    showNotification('Maximum recording time reached', 'info');
                }
            }, CONFIG.maxRecordingDuration);

        } catch (err) {
            console.error('Microphone access error:', err);
            showNotification('Microphone access denied', 'error');
        }
    }

    function stopRecording() {
        if (state.recordingTimer) {
            clearTimeout(state.recordingTimer);
            state.recordingTimer = null;
        }

        if (state.mediaRecorder && state.mediaRecorder.state !== 'inactive') {
            state.mediaRecorder.stop();
            state.isRecording = false;

            // Stop all tracks to release microphone
            state.mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }

        updateUIState();
    }

    // Process and send audio to backend
    async function processAudio() {
        if (state.audioChunks.length === 0) return;

        const audioBlob = new Blob(state.audioChunks, { type: 'audio/webm' });
        updateStatusText('Processing speech...');

        try {
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);

            reader.onloadend = async () => {
                const base64Audio = reader.result.split(',')[1];

                const response = await fetch(`${CONFIG.backendUrl}/transcribe`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        audioContent: base64Audio,
                        languageCode: state.currentLanguage,
                        enableAutomaticPunctuation: true,
                        useEnhanced: true
                    })
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Transcription failed');
                }

                const data = await response.json();

                if (data.transcript) {
                    insertText(data.transcript);
                    showNotification(`Transcribed: "${data.transcript.substring(0, 50)}..."`, 'success');
                }

                updateStatusText('Ready');
            };
        } catch (error) {
            console.error('Transcription error:', error);
            showNotification(error.message || 'Transcription failed', 'error');
            updateStatusText('Error');
        }

        // Clear chunks for next recording
        state.audioChunks = [];
    }

    // Text insertion functions (same as main version)
    function insertText(text) {
        if (!state.activeElement) return;

        const element = state.activeElement;
        const trimmedText = text.trim();

        if (!trimmedText) return;

        element.focus();

        if (isContentEditable(element)) {
            insertIntoContentEditable(element, trimmedText);
        } else if (isTextInput(element)) {
            insertIntoTextInput(element, trimmedText);
        }

        dispatchInputEvents(element);
    }

    function isContentEditable(element) {
        return element.isContentEditable ||
               element.getAttribute('contenteditable') === 'true' ||
               element.getAttribute('role') === 'textbox';
    }

    function isTextInput(element) {
        const tagName = element.tagName.toLowerCase();
        const inputType = element.type?.toLowerCase();

        return tagName === 'textarea' ||
               (tagName === 'input' &&
                (!inputType || ['text', 'search', 'url', 'tel', 'email', 'password'].includes(inputType)));
    }

    function insertIntoContentEditable(element, text) {
        const needsSpace = element.textContent.length > 0 &&
                          !element.textContent.endsWith(' ') &&
                          !element.textContent.endsWith('\n');
        const textToInsert = (needsSpace ? ' ' : '') + text;
        document.execCommand('insertText', false, textToInsert);
    }

    function insertIntoTextInput(element, text) {
        const start = element.selectionStart || 0;
        const end = element.selectionEnd || 0;
        const currentValue = element.value;

        const beforeCursor = currentValue.slice(0, start);
        const needsSpace = beforeCursor.length > 0 &&
                          !beforeCursor.endsWith(' ') &&
                          !beforeCursor.endsWith('\n');

        const textToInsert = (needsSpace ? ' ' : '') + text;
        const newValue = beforeCursor + textToInsert + currentValue.slice(end);

        element.value = newValue;

        const newCursorPosition = start + textToInsert.length;
        element.setSelectionRange(newCursorPosition, newCursorPosition);
    }

    function dispatchInputEvents(element) {
        const events = ['input', 'change', 'keyup', 'keydown'];
        events.forEach(eventType => {
            const event = new Event(eventType, {
                bubbles: true,
                cancelable: true
            });
            element.dispatchEvent(event);
        });

        const tracker = element._valueTracker;
        if (tracker) {
            tracker.setValue(element.value);
        }
    }

    // UI Creation (simplified version - same as main)
    function createMicButton() {
        const container = document.createElement('div');
        container.className = 'stt-mic-container';
        container.innerHTML = `
            <button class="stt-mic-button" title="Click to dictate (Ctrl+Shift+Y)">
                ${ICONS.mic}
            </button>
            <button class="stt-settings-button" title="Settings">
                ${ICONS.settings}
            </button>
        </div>`;

        const style = document.createElement('style');
        style.textContent = getMicButtonStyles();
        container.appendChild(style);

        const micButton = container.querySelector('.stt-mic-button');
        const settingsButton = container.querySelector('.stt-settings-button');

        micButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleListening();
        });

        settingsButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleLanguageSelector();
        });

        return container;
    }

    function getMicButtonStyles() {
        return `
            .stt-mic-container {
                position: absolute;
                display: flex;
                gap: 4px;
                z-index: 2147483647;
                pointer-events: auto;
            }
            .stt-mic-button, .stt-settings-button {
                width: ${CONFIG.micButtonSize}px;
                height: ${CONFIG.micButtonSize}px;
                border-radius: 50%;
                border: 2px solid #4285f4;
                background: white;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                transition: all 0.2s ease;
                padding: 0;
            }
            .stt-mic-button:hover, .stt-settings-button:hover {
                transform: scale(1.1);
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            }
            .stt-mic-button.recording {
                background: #ff4444;
                border-color: #ff4444;
                animation: stt-pulse 1.5s infinite;
            }
            .stt-mic-button.recording svg {
                color: white;
            }
            @keyframes stt-pulse {
                0% { box-shadow: 0 0 0 0 rgba(255, 68, 68, 0.7); }
                70% { box-shadow: 0 0 0 10px rgba(255, 68, 68, 0); }
                100% { box-shadow: 0 0 0 0 rgba(255, 68, 68, 0); }
            }
        `;
    }

    // Status and notifications
    function showNotification(message, type = 'info') {
        const existing = document.querySelector('.stt-notification');
        if (existing) existing.remove();

        const notification = document.createElement('div');
        notification.className = `stt-notification stt-notification-${type}`;
        notification.textContent = message;

        const style = document.createElement('style');
        style.textContent = `
            .stt-notification {
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                padding: 12px 24px;
                border-radius: 8px;
                font-family: sans-serif;
                font-size: 14px;
                z-index: 2147483647;
                animation: stt-slide-down 0.3s ease;
            }
            .stt-notification-info { background: #1a73e8; color: white; }
            .stt-notification-success { background: #34a853; color: white; }
            .stt-notification-error { background: #ea4335; color: white; }
            @keyframes stt-slide-down {
                from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
                to { opacity: 1; transform: translateX(-50%) translateY(0); }
            }
        `;
        notification.appendChild(style);
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    function updateStatusText(text) {
        // Implementation would update a status indicator
        console.log('Status:', text);
    }

    // Position management
    function positionMicButton(element) {
        if (!state.micButton) return;

        const rect = element.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

        let top = rect.top + scrollTop + (rect.height - CONFIG.micButtonSize) / 2;
        let left = rect.right + scrollLeft + 8;

        const buttonRight = left + CONFIG.micButtonSize + 30;
        if (buttonRight > window.innerWidth) {
            left = rect.left + scrollLeft - CONFIG.micButtonSize - 8 - 30;
        }

        state.micButton.style.top = `${top}px`;
        state.micButton.style.left = `${left}px`;
    }

    function showMicButton(element) {
        state.activeElement = element;

        if (!state.micButton) {
            state.micButton = createMicButton();
            document.body.appendChild(state.micButton);
        }

        positionMicButton(element);
        state.micButton.style.display = 'flex';
    }

    function hideMicButton() {
        if (state.micButton) {
            state.micButton.style.display = 'none';
        }
    }

    function updateUIState() {
        if (!state.micButton) return;

        const micButton = state.micButton.querySelector('.stt-mic-button');

        if (state.isRecording) {
            micButton.className = 'stt-mic-button recording';
            micButton.innerHTML = ICONS.micActive;
        } else {
            micButton.className = 'stt-mic-button';
            micButton.innerHTML = ICONS.mic;
        }
    }

    function toggleListening() {
        if (state.isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    }

    function toggleLanguageSelector() {
        // Language selector implementation
        const languages = Object.entries(CONFIG.languages)
            .map(([code, name]) => `${code}: ${name}`)
            .join('\n');
        const newLang = prompt(`Select language code:\n\n${languages}`, state.currentLanguage);
        if (newLang && CONFIG.languages[newLang]) {
            state.currentLanguage = newLang;
            showNotification(`Language set to: ${CONFIG.languages[newLang]}`, 'success');
        }
    }

    // Event handlers
    function handleFocusIn(e) {
        const target = e.target;
        if (isTextInput(target) || isContentEditable(target)) {
            showMicButton(target);
        }
    }

    function handleFocusOut(e) {
        setTimeout(() => {
            if (!document.activeElement?.closest('.stt-mic-container')) {
                hideMicButton();
            }
        }, 200);
    }

    function handleKeyDown(e) {
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'KeyY') {
            e.preventDefault();
            toggleListening();
        }
        if (e.key === 'Escape' && state.isRecording) {
            stopRecording();
        }
    }

    // Initialization
    function init() {
        document.addEventListener('focusin', handleFocusIn, true);
        document.addEventListener('focusout', handleFocusOut, true);
        document.addEventListener('keydown', handleKeyDown);

        // Check backend on startup
        checkBackend().then(isReady => {
            if (isReady) {
                console.log('🎤 Speech to Text (Backend) - Backend connected');
            } else {
                console.log('🎤 Speech to Text (Backend) - Backend not available');
            }
        });

        console.log('🎤 Speech to Text (Backend Version) initialized');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();