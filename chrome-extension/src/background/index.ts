import { REQUEST_SCREEN_DATA, UPDATE_SCREEN_DATA, appendToCSV } from '@extension/shared';
import { exampleThemeStorage } from '@extension/storage';

exampleThemeStorage.get().then(theme => {
  console.log('theme', theme);
});

chrome.runtime.onMessage.addListener(message => {
  // BINGO
  console.log('backgroundTS in Chrome Ext', message);
  if (message.type === UPDATE_SCREEN_DATA) {
    // Debug logging
    console.log('[background] Received ScreenData:', {
      monster: message.data.monster,
      location: message.data.location,
      damageDealt: message.data.damageDealt || [],
      damageReceived: message.data.damageReceived || [],
    });

    // Save data to CSV storage
    appendToCSV(message.data).catch(error => {
      console.error('Error saving to CSV:', error);
    });

    // Forward data to the side panel
    chrome.runtime.sendMessage({ type: UPDATE_SCREEN_DATA, data: message.data });
  } else if (message.type === REQUEST_SCREEN_DATA) {
    // Request data from the content script
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: REQUEST_SCREEN_DATA });
      }
    });
  }
});
console.log('Background loaded');
console.log("Edit 'chrome-extension/src/background/index.ts' and save to reload.");
