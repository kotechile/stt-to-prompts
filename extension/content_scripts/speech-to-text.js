(function() {
    'use strict';

    // Prevent duplicate initialization
    if (window.speechToTextInitialized) return;
    window.speechToTextInitialized = true;

    // Configuration
    const CONFIG = {
        micButtonSize: 40,
        debounceDelay: 150,
        scrollHideThreshold: 50,
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
        recognition: null,
        isListening: false,
        isPaused: false,
        activeElement: null,
        micButton: null,
        languageSelector: null,
        statusIndicator: null,
        accumulatedText: '',
        currentLanguage: 'en-US',
        scrollPosition: 0,
        debounceTimer: null,
        continuousMode: true
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
        pause: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
        </svg>`,
        settings: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.58 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
        </svg>`,
        close: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>`,
        check: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
        </svg>`
    };

    // Initialize Web Speech API
    function initSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            console.error('Web Speech API not supported in this browser');
            showNotification('Speech recognition not supported. Try Chrome.', 'error');
            return false;
        }

        state.recognition = new SpeechRecognition();
        state.recognition.continuous = true;
        state.recognition.interimResults = true;
        state.recognition.lang = state.currentLanguage;

        state.recognition.onstart = onRecognitionStart;
        state.recognition.onresult = onRecognitionResult;
        state.recognition.onerror = onRecognitionError;
        state.recognition.onend = onRecognitionEnd;

        return true;
    }

    function onRecognitionStart() {
        state.isListening = true;
        updateUIState();
        showNotification('Listening...', 'info');
    }

    function onRecognitionResult(event) {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalTranscript += transcript + ' ';
            } else {
                interimTranscript += transcript;
            }
        }

        // Update accumulated text with final results
        if (finalTranscript) {
            state.accumulatedText += finalTranscript;
            insertText(finalTranscript, true);
        }

        // Show interim text in status
        if (interimTranscript) {
            updateStatusText(`Hearing: "${interimTranscript}"`);
        }
    }

    function onRecognitionError(event) {
        console.error('Speech recognition error:', event.error);

        const errorMessages = {
            'no-speech': 'No speech detected. Please try again.',
            'audio-capture': 'Microphone not available.',
            'not-allowed': 'Microphone access denied.',
            'network': 'Network error. Check your connection.',
            'aborted': 'Recording aborted.',
            'language-not-supported': 'Language not supported.'
        };

        showNotification(errorMessages[event.error] || `Error: ${event.error}`, 'error');

        if (event.error !== 'aborted') {
            stopListening();
        }
    }

    function onRecognitionEnd() {
        // Restart if we're still in listening mode (continuous)
        if (state.isListening && state.continuousMode) {
            try {
                state.recognition.start();
                return;
            } catch (e) {
                console.log('Could not restart recognition:', e);
            }
        }

        state.isListening = false;
        updateUIState();
    }

    function startListening() {
        if (!state.recognition && !initSpeechRecognition()) return;

        state.accumulatedText = '';
        state.isPaused = false;

        try {
            state.recognition.lang = state.currentLanguage;
            state.recognition.start();
        } catch (e) {
            console.error('Error starting recognition:', e);
            showNotification('Could not start recording', 'error');
        }
    }

    function stopListening() {
        state.isListening = false;
        state.isPaused = false;

        if (state.recognition) {
            try {
                state.recognition.stop();
            } catch (e) {
                console.log('Error stopping recognition:', e);
            }
        }

        updateUIState();
    }

    function pauseListening() {
        state.isPaused = !state.isPaused;
        if (state.isPaused) {
            stopListening();
            showNotification('Paused. Click mic to continue.', 'info');
        } else {
            startListening();
        }
        updateUIState();
    }

    // Text insertion with proper event dispatching
    function insertText(text, isFinal = false) {
        if (!state.activeElement) return;

        const element = state.activeElement;
        const trimmedText = text.trim();

        if (!trimmedText) return;

        // Focus the element first
        element.focus();

        // Handle different input types
        if (isContentEditable(element)) {
            insertIntoContentEditable(element, trimmedText, isFinal);
        } else if (isTextInput(element)) {
            insertIntoTextInput(element, trimmedText);
        }

        // Dispatch events to notify frameworks
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

    function insertIntoContentEditable(element, text, isFinal) {
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);

        // Add space if there's existing text
        const needsSpace = element.textContent.length > 0 &&
                          !element.textContent.endsWith(' ') &&
                          !element.textContent.endsWith('\n');

        const textToInsert = (needsSpace ? ' ' : '') + text;

        // Use execCommand for compatibility
        document.execCommand('insertText', false, textToInsert);
    }

    function insertIntoTextInput(element, text) {
        const start = element.selectionStart || 0;
        const end = element.selectionEnd || 0;
        const currentValue = element.value;

        // Add space if inserting in the middle or at end with existing text
        const beforeCursor = currentValue.slice(0, start);
        const needsSpace = beforeCursor.length > 0 &&
                          !beforeCursor.endsWith(' ') &&
                          !beforeCursor.endsWith('\n');

        const textToInsert = (needsSpace ? ' ' : '') + text;
        const newValue = beforeCursor + textToInsert + currentValue.slice(end);

        element.value = newValue;

        // Move cursor after inserted text
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

        // React-specific
        const tracker = element._valueTracker;
        if (tracker) {
            tracker.setValue(element.value);
        }
    }

    // UI Creation
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
        `;

        // Style the button
        const style = document.createElement('style');
        style.textContent = getMicButtonStyles();
        container.appendChild(style);

        // Event listeners
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
            .stt-mic-button:active {
                transform: scale(0.95);
            }
            .stt-mic-button svg, .stt-settings-button svg {
                width: 20px;
                height: 20px;
                color: #4285f4;
            }
            .stt-mic-button.recording {
                background: #ff4444;
                border-color: #ff4444;
                animation: stt-pulse 1.5s infinite;
            }
            .stt-mic-button.recording svg {
                color: white;
            }
            .stt-mic-button.paused {
                background: #ffa000;
                border-color: #ffa000;
            }
            @keyframes stt-pulse {
                0% { box-shadow: 0 0 0 0 rgba(255, 68, 68, 0.7); }
                70% { box-shadow: 0 0 0 10px rgba(255, 68, 68, 0); }
                100% { box-shadow: 0 0 0 0 rgba(255, 68, 68, 0); }
            }
        `;
    }

    function createLanguageSelector() {
        const selector = document.createElement('div');
        selector.className = 'stt-language-selector';
        selector.innerHTML = `
            <div class="stt-lang-header">
                <span>Select Language</span>
                <button class="stt-close-lang">${ICONS.close}</button>
            </div>
            <div class="stt-lang-list">
                ${Object.entries(CONFIG.languages).map(([code, name]) => `
                    <button class="stt-lang-option ${code === state.currentLanguage ? 'active' : ''}"
                            data-lang="${code}">
                        <span class="stt-lang-name">${name}</span>
                        ${code === state.currentLanguage ? ICONS.check : ''}
                    </button>
                `).join('')}
            </div>
            <div class="stt-lang-footer">
                <label class="stt-continuous-mode">
                    <input type="checkbox" ${state.continuousMode ? 'checked' : ''}>
                    Continuous mode
                </label>
            </div>
        `;

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .stt-language-selector {
                position: absolute;
                background: white;
                border-radius: 12px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                padding: 12px;
                min-width: 200px;
                z-index: 2147483647;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 14px;
            }
            .stt-lang-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding-bottom: 8px;
                border-bottom: 1px solid #e0e0e0;
                margin-bottom: 8px;
                font-weight: 600;
                color: #333;
            }
            .stt-close-lang {
                background: none;
                border: none;
                cursor: pointer;
                padding: 4px;
                border-radius: 4px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .stt-close-lang:hover {
                background: #f0f0f0;
            }
            .stt-close-lang svg {
                width: 18px;
                height: 18px;
                color: #666;
            }
            .stt-lang-list {
                max-height: 250px;
                overflow-y: auto;
            }
            .stt-lang-option {
                width: 100%;
                padding: 10px 12px;
                border: none;
                background: none;
                cursor: pointer;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-radius: 8px;
                transition: background 0.2s;
                font-size: 14px;
                color: #333;
            }
            .stt-lang-option:hover {
                background: #f0f0f0;
            }
            .stt-lang-option.active {
                background: #e8f0fe;
                color: #1a73e8;
            }
            .stt-lang-option svg {
                width: 18px;
                height: 18px;
                color: #1a73e8;
            }
            .stt-lang-footer {
                margin-top: 8px;
                padding-top: 8px;
                border-top: 1px solid #e0e0e0;
            }
            .stt-continuous-mode {
                display: flex;
                align-items: center;
                gap: 8px;
                cursor: pointer;
                color: #666;
                font-size: 13px;
            }
            .stt-continuous-mode input {
                cursor: pointer;
            }
        `;
        selector.appendChild(style);

        // Event listeners
        selector.querySelectorAll('.stt-lang-option').forEach(btn => {
            btn.addEventListener('click', () => {
                state.currentLanguage = btn.dataset.lang;
                if (state.recognition) {
                    state.recognition.lang = state.currentLanguage;
                }
                chrome.storage?.sync?.set({ preferredLanguage: state.currentLanguage });
                hideLanguageSelector();
                showNotification(`Language set to: ${CONFIG.languages[state.currentLanguage]}`, 'success');
            });
        });

        selector.querySelector('.stt-close-lang').addEventListener('click', hideLanguageSelector);

        selector.querySelector('.stt-continuous-mode input').addEventListener('change', (e) => {
            state.continuousMode = e.target.checked;
            chrome.storage?.sync?.set({ continuousMode: state.continuousMode });
        });

        return selector;
    }

    function createStatusIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'stt-status-indicator';
        indicator.innerHTML = `
            <span class="stt-status-text">Ready to listen</span>
            <div class="stt-waveform">
                <span></span><span></span><span></span><span></span><span></span>
            </div>
        `;

        const style = document.createElement('style');
        style.textContent = `
            .stt-status-indicator {
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 12px 20px;
                border-radius: 8px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 14px;
                z-index: 2147483647;
                display: flex;
                align-items: center;
                gap: 12px;
                opacity: 0;
                transform: translateY(20px);
                transition: all 0.3s ease;
            }
            .stt-status-indicator.visible {
                opacity: 1;
                transform: translateY(0);
            }
            .stt-status-indicator.listening .stt-waveform {
                display: flex;
            }
            .stt-waveform {
                display: none;
                gap: 3px;
                align-items: center;
                height: 20px;
            }
            .stt-waveform span {
                width: 3px;
                background: #4CAF50;
                border-radius: 2px;
                animation: stt-wave 1s ease-in-out infinite;
            }
            .stt-waveform span:nth-child(1) { animation-delay: 0s; height: 30%; }
            .stt-waveform span:nth-child(2) { animation-delay: 0.1s; height: 50%; }
            .stt-waveform span:nth-child(3) { animation-delay: 0.2s; height: 80%; }
            .stt-waveform span:nth-child(4) { animation-delay: 0.3s; height: 50%; }
            .stt-waveform span:nth-child(5) { animation-delay: 0.4s; height: 30%; }
            @keyframes stt-wave {
                0%, 100% { transform: scaleY(0.5); }
                50% { transform: scaleY(1); }
            }
        `;
        indicator.appendChild(style);

        return indicator;
    }

    function showNotification(message, type = 'info') {
        // Remove existing notifications
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
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 14px;
                z-index: 2147483647;
                animation: stt-slide-down 0.3s ease;
                max-width: 90vw;
                word-wrap: break-word;
            }
            .stt-notification-info {
                background: #1a73e8;
                color: white;
            }
            .stt-notification-success {
                background: #34a853;
                color: white;
            }
            .stt-notification-error {
                background: #ea4335;
                color: white;
            }
            @keyframes stt-slide-down {
                from {
                    opacity: 0;
                    transform: translateX(-50%) translateY(-20px);
                }
                to {
                    opacity: 1;
                    transform: translateX(-50%) translateY(0);
                }
            }
        `;
        notification.appendChild(style);
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(-50%) translateY(-20px)';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Position management
    function positionMicButton(element) {
        if (!state.micButton) return;

        const rect = element.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

        // Position to the right of the input
        let top = rect.top + scrollTop + (rect.height - CONFIG.micButtonSize) / 2;
        let left = rect.right + scrollLeft + 8;

        // Check if off-screen
        const buttonRight = left + CONFIG.micButtonSize + 30; // +30 for settings button
        if (buttonRight > window.innerWidth) {
            // Position to the left instead
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
        hideLanguageSelector();
    }

    function toggleLanguageSelector() {
        if (state.languageSelector) {
            hideLanguageSelector();
        } else {
            showLanguageSelector();
        }
    }

    function showLanguageSelector() {
        if (state.languageSelector) return;

        state.languageSelector = createLanguageSelector();
        document.body.appendChild(state.languageSelector);

        // Position below the mic button
        const micRect = state.micButton.getBoundingClientRect();
        state.languageSelector.style.top = `${micRect.bottom + window.pageYOffset + 8}px`;
        state.languageSelector.style.left = `${micRect.left + window.pageXOffset}px`;
    }

    function hideLanguageSelector() {
        if (state.languageSelector) {
            state.languageSelector.remove();
            state.languageSelector = null;
        }
    }

    function updateUIState() {
        if (!state.micButton) return;

        const micButton = state.micButton.querySelector('.stt-mic-button');

        if (state.isListening) {
            micButton.className = 'stt-mic-button recording';
            micButton.innerHTML = ICONS.micActive;
            micButton.title = 'Stop recording (Ctrl+Shift+Y)';
        } else if (state.isPaused) {
            micButton.className = 'stt-mic-button paused';
            micButton.innerHTML = ICONS.pause;
            micButton.title = 'Resume recording (Ctrl+Shift+Y)';
        } else {
            micButton.className = 'stt-mic-button';
            micButton.innerHTML = ICONS.mic;
            micButton.title = 'Start recording (Ctrl+Shift+Y)';
        }

        updateStatusIndicator();
    }

    function updateStatusIndicator() {
        if (!state.statusIndicator) {
            state.statusIndicator = createStatusIndicator();
            document.body.appendChild(state.statusIndicator);
        }

        if (state.isListening) {
            state.statusIndicator.classList.add('visible', 'listening');
        } else {
            state.statusIndicator.classList.remove('listening');
            setTimeout(() => {
                if (!state.isListening) {
                    state.statusIndicator.classList.remove('visible');
                }
            }, 2000);
        }
    }

    function updateStatusText(text) {
        if (state.statusIndicator) {
            const statusText = state.statusIndicator.querySelector('.stt-status-text');
            if (statusText) statusText.textContent = text;
        }
    }

    function toggleListening() {
        if (state.isListening) {
            stopListening();
            showNotification('Recording stopped', 'success');
        } else {
            startListening();
        }
    }

    // Event handlers
    function handleFocusIn(e) {
        const target = e.target;

        // Check if element is a text input
        if (isTextInput(target) || isContentEditable(target)) {
            clearTimeout(state.debounceTimer);
            state.debounceTimer = setTimeout(() => {
                showMicButton(target);
            }, CONFIG.debounceDelay);
        }
    }

    function handleFocusOut(e) {
        // Delay hiding to allow clicking the mic button
        setTimeout(() => {
            if (!document.activeElement?.closest('.stt-mic-container') &&
                !document.activeElement?.closest('.stt-language-selector')) {
                hideMicButton();
            }
        }, 200);
    }

    function handleScroll() {
        if (!state.micButton || state.micButton.style.display === 'none') return;

        const scrollDelta = Math.abs(window.pageYOffset - state.scrollPosition);
        if (scrollDelta > CONFIG.scrollHideThreshold) {
            positionMicButton(state.activeElement);
            state.scrollPosition = window.pageYOffset;
        }
    }

    function handleResize() {
        if (state.activeElement) {
            positionMicButton(state.activeElement);
        }
    }

    function handleKeyDown(e) {
        // Ctrl/Cmd + Shift + Y to toggle recording
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'KeyY') {
            e.preventDefault();
            toggleListening();
        }

        // Escape to stop recording
        if (e.key === 'Escape' && state.isListening) {
            stopListening();
            showNotification('Recording stopped', 'success');
        }
    }

    // Initialization
    function init() {
        // Check if Speech API is supported
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.error('Speech recognition not supported');
            return;
        }

        // Load saved preferences
        if (chrome.storage?.sync) {
            chrome.storage.sync.get(['preferredLanguage', 'continuousMode'], (result) => {
                if (result.preferredLanguage) {
                    state.currentLanguage = result.preferredLanguage;
                }
                if (result.continuousMode !== undefined) {
                    state.continuousMode = result.continuousMode;
                }
            });
        }

        // Add event listeners
        document.addEventListener('focusin', handleFocusIn, true);
        document.addEventListener('focusout', handleFocusOut, true);
        document.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('resize', handleResize);
        document.addEventListener('keydown', handleKeyDown);

        // Handle dynamically added content
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Check if the new node is a text input
                        if (isTextInput(node) || isContentEditable(node)) {
                            // Mic button will appear on focus
                        }
                        // Check for text inputs inside the new node
                        const inputs = node.querySelectorAll?.('input[type="text"], input[type="search"], textarea, [contenteditable="true"]');
                        inputs?.forEach(input => {
                            // Mic button will appear on focus
                        });
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        console.log('🎤 Speech to Text extension initialized');
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();