// Popup script for Speech to Text extension

document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const languageSelect = document.getElementById('languageSelect');
    const continuousToggle = document.getElementById('continuousToggle');
    const notificationsToggle = document.getElementById('notificationsToggle');
    const testMicBtn = document.getElementById('testMicBtn');
    const testBtnText = document.getElementById('testBtnText');
    const testArea = document.getElementById('testArea');
    const statusBadge = document.getElementById('statusBadge');
    const helpLink = document.getElementById('helpLink');
    const feedbackLink = document.getElementById('feedbackLink');

    // State
    let recognition = null;
    let isRecording = false;

    // Load saved settings
    chrome.storage.sync.get([
        'preferredLanguage',
        'continuousMode',
        'showNotifications'
    ], (result) => {
        if (result.preferredLanguage) {
            languageSelect.value = result.preferredLanguage;
        }
        if (result.continuousMode !== undefined) {
            continuousToggle.checked = result.continuousMode;
        }
        if (result.showNotifications !== undefined) {
            notificationsToggle.checked = result.showNotifications;
        }
    });

    // Save settings on change
    languageSelect.addEventListener('change', () => {
        chrome.storage.sync.set({ preferredLanguage: languageSelect.value });
    });

    continuousToggle.addEventListener('change', () => {
        chrome.storage.sync.set({ continuousMode: continuousToggle.checked });
    });

    notificationsToggle.addEventListener('change', () => {
        chrome.storage.sync.set({ showNotifications: notificationsToggle.checked });
    });

    // Initialize speech recognition for testing
    function initRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            testArea.textContent = 'Speech recognition not supported in this browser. Try Chrome.';
            testArea.style.color = '#ea4335';
            return null;
        }

        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = languageSelect.value;

        rec.onresult = (event) => {
            let transcript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    transcript += event.results[i][0].transcript + ' ';
                }
            }
            if (transcript) {
                testArea.textContent += transcript;
            }
        };

        rec.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            if (event.error === 'not-allowed') {
                testArea.textContent = 'Microphone access denied. Please allow microphone access.';
                testArea.style.color = '#ea4335';
            }
            stopTest();
        };

        rec.onend = () => {
            if (isRecording) {
                try {
                    rec.start();
                } catch (e) {
                    stopTest();
                }
            }
        };

        return rec;
    }

    function startTest() {
        recognition = initRecognition();
        if (!recognition) return;

        isRecording = true;
        testMicBtn.classList.add('recording');
        testArea.classList.add('recording');
        testBtnText.textContent = 'Stop Test';
        testArea.textContent = '';

        try {
            recognition.start();
            updateStatusBadge('recording');
        } catch (e) {
            console.error('Error starting recognition:', e);
            stopTest();
        }
    }

    function stopTest() {
        isRecording = false;
        testMicBtn.classList.remove('recording');
        testArea.classList.remove('recording');
        testBtnText.textContent = 'Start Test';
        updateStatusBadge('ready');

        if (recognition) {
            try {
                recognition.stop();
            } catch (e) {
                console.log('Error stopping recognition:', e);
            }
        }
    }

    function updateStatusBadge(state) {
        if (state === 'recording') {
            statusBadge.textContent = 'Recording';
            statusBadge.className = 'status-badge recording';
        } else {
            statusBadge.textContent = 'Ready';
            statusBadge.className = 'status-badge ready';
        }
    }

    testMicBtn.addEventListener('click', () => {
        if (isRecording) {
            stopTest();
        } else {
            startTest();
        }
    });

    // Update language when changed
    languageSelect.addEventListener('change', () => {
        if (recognition) {
            recognition.lang = languageSelect.value;
        }
    });

    // Help and feedback links
    helpLink.addEventListener('click', (e) => {
        e.preventDefault();
        chrome.tabs.create({
            url: 'https://support.google.com/chrome/answer/2693767'
        });
    });

    feedbackLink.addEventListener('click', (e) => {
        e.preventDefault();
        chrome.tabs.create({
            url: 'https://chrome.google.com/webstore/detail/speech-to-text/reviews'
        });
    });
});