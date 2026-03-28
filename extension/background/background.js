// Background service worker for Speech to Text extension

// Track extension state
const state = {
    isRecording: false,
    activeTabId: null
};

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
    console.log('🎤 Speech to Text extension installed');

    // Set default settings
    chrome.storage.sync.set({
        preferredLanguage: 'en-US',
        continuousMode: true,
        showNotifications: true
    });
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
        case 'startRecording':
            state.isRecording = true;
            state.activeTabId = sender.tab?.id;
            updateIcon(true);
            break;

        case 'stopRecording':
            state.isRecording = false;
            updateIcon(false);
            break;

        case 'getState':
            sendResponse({
                isRecording: state.isRecording,
                activeTabId: state.activeTabId
            });
            break;

        case 'openOptions':
            chrome.runtime.openOptionsPage();
            break;
    }

    return true;
});

// Update extension icon based on recording state
function updateIcon(isRecording) {
    const iconPath = isRecording
        ? {
            16: 'icons/icon16-recording.png',
            32: 'icons/icon32-recording.png',
            48: 'icons/icon48-recording.png',
            128: 'icons/icon128-recording.png'
        }
        : {
            16: 'icons/icon16.png',
            32: 'icons/icon32.png',
            48: 'icons/icon48.png',
            128: 'icons/icon128.png'
        };

    chrome.action.setIcon({ path: iconPath });

    // Update tooltip
    chrome.action.setTitle({
        title: isRecording ? 'Recording... Click to stop' : 'Speech to Text - Click to configure'
    });
}

// Handle tab changes
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    // Reset icon when switching tabs
    if (state.isRecording && state.activeTabId !== activeInfo.tabId) {
        updateIcon(false);
    }
});

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener(async (command) => {
    if (command === 'toggle-recording') {
        const [tab] = await chrome.tabs.query({
            active: true,
            currentWindow: true
        });

        if (tab) {
            chrome.tabs.sendMessage(tab.id, {
                action: 'toggleRecording'
            }).catch(() => {
                console.log('Content script not ready on this page');
            });
        }
    }
});

// Handle extension icon click
chrome.action.onClicked.addListener(() => {
    chrome.runtime.openOptionsPage();
});