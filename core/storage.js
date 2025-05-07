// core/storage.js
export const ChatStorage = {
    async loadChatHistory(profileId) {
      const result = await chrome.storage.local.get(`chatHistory-${profileId}`);
      return result[`chatHistory-${profileId}`] || [];
    },
  
    async saveChatHistory(profileId, history) {
      await chrome.storage.local.set({ [`chatHistory-${profileId}`]: history });
    }
  };