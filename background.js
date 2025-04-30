// 后台服务工作者（Manifest V3 必需）
console.log('Service Worker initialized');

// 监听扩展安装事件
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Extension first installed');
  }
});

// 提供通用存储功能
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'storeKey') {
    chrome.storage.local.set({ openaiKey: request.key }, () => {
      sendResponse({ status: 'success' });
    });
    return true; // 保持消息通道开放
  }
  
  if (request.action === 'getKey') {
    chrome.storage.local.get('openaiKey', (data) => {
      sendResponse(data.openaiKey || null);
    });
    return true;
  }
});