// popup.js
document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('apiKey');
    const status = document.getElementById('status');
    
    // 加载已保存的密钥
    chrome.storage.local.get('openaiKey', (data) => {
      if (data.openaiKey) {
        input.value = data.openaiKey;
        showStatus('已保存', 'success');
      }
    });
  
    // 自动保存逻辑
    let saveTimeout;
    input.addEventListener('input', (e) => {
      clearTimeout(saveTimeout);
      const value = e.target.value.trim();
      
      if (validateKey(value)) {
        saveTimeout = setTimeout(() => saveKey(value), 800);
        showStatus('保存中...', 'info');
      } else {
        showStatus('密钥格式无效', 'error');
      }
    });
  
    // 失焦时立即保存
    input.addEventListener('blur', () => {
      const value = input.value.trim();
      if (validateKey(value)) {
        saveKey(value);
      }
    });
  });
  
  function validateKey(key) {
    return key.startsWith('sk-') && key.length > 30;
  }
  
  function saveKey(key) {
    chrome.storage.local.set({ openaiKey: key }, () => {
      showStatus('保存成功', 'success');
      setTimeout(() => showStatus(''), 2000);
    });
  }
  
  function showStatus(text, type = 'info') {
    const status = document.getElementById('status');
    status.textContent = text;
    status.style.color = {
      info: '#2196F3',
      success: '#4CAF50',
      error: '#f44336'
    }[type];
  }