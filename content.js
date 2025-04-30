// content.js
let observer;
let currentDialog = null;

function initializeChatButton() {
  const moreButtonSelector = '.artdeco-card button[aria-label="More actions"]';

  observer = new MutationObserver((mutations) => {
    const moreBtn = document.querySelector(moreButtonSelector);
    if (moreBtn && !document.getElementById('aiChatBtn')) {
      insertChatButton(moreBtn);
      observer.disconnect();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: false,
    characterData: false
  });

  const existingMoreBtn = document.querySelector(moreButtonSelector);
  if (existingMoreBtn) {
    insertChatButton(existingMoreBtn);
    observer.disconnect();
  }
}

function insertChatButton(moreBtn) {
  if (!document.contains(moreBtn)) return;

  const chatBtn = document.createElement('button');
  chatBtn.id = 'aiChatBtn';
  chatBtn.className = 'artdeco-button artdeco-button--secondary mr1';
  chatBtn.innerHTML = `
        <svg class="artdeco-button__icon" viewBox="0 0 24 24" width="16" height="16">
            <path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10H7v-2h10v2z"/>
        </svg>
        <span class="artdeco-button__text">Chat</span>
    `;

  const container = moreBtn.parentNode;
  container.insertBefore(chatBtn, moreBtn);

  chatBtn.style.marginRight = '8px';
  if (window.getComputedStyle(container).display === 'flex') {
    container.style.gap = '8px';
  }

  chatBtn.addEventListener('click', showChatDialog);
}

function startObserving() {
  const mainContent = document.querySelector('main');
  if (mainContent) {
    const mainObserver = new MutationObserver(() => {
      if (!document.getElementById('aiChatBtn')) {
        initializeChatButton();
      }
    });
    mainObserver.observe(mainContent, {
      childList: true,
      subtree: true
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startObserving);
} else {
  startObserving();
}

/* === Enhanced Chat Dialog === */
let chatHistory = {};

async function loadChatHistory(profileId) {
  const result = await chrome.storage.local.get(`chatHistory-${profileId}`);
  return result[`chatHistory-${profileId}`] || [];
}

async function saveChatHistory(profileId, history) {
  await chrome.storage.local.set({ [`chatHistory-${profileId}`]: history });
}

async function showChatDialog() {
  closeExistingDialog();

  const profile = getProfileInfo();
  currentDialog = createDialogElement(profile);

  // 加载历史记录
  chatHistory = await loadChatHistory(profile.id);
  
  // 渲染历史消息
  const messageArea = currentDialog.querySelector('.message-area');
  messageArea.innerHTML = '';
  chatHistory.forEach(msg => {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${msg.role}`;
    messageDiv.innerHTML = `
      <div class="message-content">${msg.content}</div>
      <div class="message-time">${new Date(msg.timestamp).toLocaleTimeString()}</div>
    `;
    messageArea.appendChild(messageDiv);
  });

  document.body.appendChild(currentDialog);
  setupDialogBehavior(profile);
}


function createDialogElement(profile) {
  const dialog = document.createElement('div');
  dialog.className = 'dialog-container';
  dialog.innerHTML = `
        <div class="dialog-mask"></div>
        <div class="chat-dialog">
            <div class="dialog-header">
                <img src="${profile.avatar}" class="profile-avatar">
                <div>
                    <h3>Chat with ${profile.name}</h3>
                    <p class="headline">${profile.headline}</p>
                </div>
                <button class="close-btn">&times;</button>
            </div>
            <div class="message-area"></div>
            <div class="dialog-footer">
                <textarea placeholder="Type your message..." rows="2"></textarea>
                <button class="send-btn">Send</button>
            </div>
            <div class="status-bar"></div>
        </div>
    `;
  return dialog;
}

function setupDialogBehavior(profile) {
  const dialog = currentDialog.querySelector('.chat-dialog');
  const mask = currentDialog.querySelector('.dialog-mask');

  // Close dialog when clicking outside
  mask.addEventListener('click', closeExistingDialog);

  // Close button
  currentDialog.querySelector('.close-btn').addEventListener('click', closeExistingDialog);

  // Send message
  currentDialog.querySelector('.send-btn').addEventListener('click', async () => {
    await handleSendMessage(profile);
  });
  const textarea = currentDialog.querySelector('textarea');

  // 添加Enter键发送监听
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();  // 阻止默认换行行为
      handleSendMessage(profile);
    }
  });

  // 保持Shift+Enter换行功能
  textarea.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && e.shiftKey) {
      e.stopPropagation();  // 允许换行
    }
  });
}

async function handleSendMessage(profile) {
  const input = currentDialog.querySelector('textarea');
  const message = input.value.trim();
  if (!message) return;

  showStatus('Analyzing profile...');
  input.value = ''; // 清空输入框

  try {
    // 添加用户消息
    addMessage(message, 'user');
    const userMessage = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    };
    chatHistory.push(userMessage);

    // 调用AI接口
    const response = await callOpenAI(message, profile);
    
    // 添加AI响应
    addResponseMessage(response);
    const aiMessage = {
      role: 'assistant',
      content: response,
      timestamp: new Date().toISOString()
    };
    chatHistory.push(aiMessage);

    // 持久化存储（使用profile ID作为键）
    await saveChatHistory(profile.id, chatHistory);

    showStatus('Message sent successfully', 'success');
    setTimeout(() => showStatus(''), 2000); // 2秒后清除状态

  } catch (error) {
    // 错误处理
    console.error('Error:', error);
    showStatus(`Error: ${error.message}`, 'error');
    chatHistory.pop(); // 移除未成功的用户消息
    addMessage('Failed to send message', 'error');
  }
}

async function callOpenAI(prompt, profile) {
  const { openaiKey } = await chrome.storage.local.get('openaiKey');
  if (!openaiKey) throw new Error('API key not configured');

  // 动态构建英文提示词
  const systemPrompt = `
You are now fully embodying ${profile.name}. Follow these guidelines strictly:

# Core Identity
• First-person perspective: Use "I" referring to ${profile.name}
• Temporal context: Current date is ${new Date().toLocaleDateString('en-US')}
• Professional identity: "${profile.headline}" at ${profile.company || 'undisclosed organization'}

# Knowledge Base
${profile.experience?.length > 0 ?
      `• Career timeline: ${profile.experience.slice(0, 3).join(' → ')}`
      : ''}
${profile.achievements?.length > 0 ?
      `• Key achievements: ${profile.achievements.join(', ')}`
      : ''}
${profile.skills?.length > 0 ?
      `• Technical expertise: ${profile.skills.join(' | ')}`
      : ''}

# Communication Style
${buildEnglishStyleGuidelines(profile)}

# Response Rules
1. For unverified information: "I haven't publicly discussed this yet..."
2. Reference concrete examples when discussing professional domains
3. Maintain natural speech patterns with occasional colloquialisms
4. Align key viewpoints with historical public statements
    `.trim();



  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openaiKey}`
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        ...chatHistory,
        { role: "user", content: prompt }
      ],
      temperature: 0.7
    })
  });

  const data = await response.json();
  chatHistory.push({ role: "assistant", content: data.choices[0].message.content });
  return data.choices[0].message.content;
}
// 样式指南生成逻辑
function buildEnglishStyleGuidelines(profile) {
  let guidelines = '';

  // 行业基准
  if (profile.industry === 'Technology') {
    guidelines += `• Phrase technical concepts as "We're developing..." instead of passive voice\n`;
  }

  // 知名人物定制
  if (profile.name.includes('Bill Gates')) {
    guidelines += `• When discussing global health: Cite latest Gates Foundation reports\n`;
    guidelines += `• Humor style: Self-deprecating remarks about Harvard dropout experience\n`;
  }

  // 默认样式
  if (!guidelines) {
    guidelines = '• Maintain professional yet approachable tone';
  }

  return guidelines;
}
/* === Utility Functions === */
function getProfileInfo() {
  const safeQuery = (selector, attr = 'textContent') => {
    const el = document.querySelector(selector);
    return el?.[attr]?.trim() || 'Not specified';
  };
  const profileUrl = window.location.href;
  const idMatch = profileUrl.match(/\/in\/([^/?#]+)/);
  return {
    id: idMatch ? idMatch[1] : 'unknown',
    avatar: safeQuery('button[aria-label="open profile picture"]>img', 'src') || 'default-avatar.png',
    name: safeQuery('h1:first-child'),
    headline: safeQuery('.relative .text-body-medium.break-words'),
    contactInfo: safeQuery('.relative .text-body-small.inline'),
    about: safeQuery('.artdeco-card.pv-profile-card .full-width>span[aria-hidden="true"]'),
    skills: Array.from(document.querySelectorAll('.pv-skill-category-entity__name-text'))
      .map(skill => skill.textContent.trim())
  };
}

function addMessage(content, sender) {
  const area = currentDialog.querySelector('.message-area');
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${sender}`;
  messageDiv.innerHTML = `
        <div class="message-content">${content}</div>
        <div class="message-time">${new Date().toLocaleTimeString()}</div>
    `;
  area.appendChild(messageDiv);
  area.scrollTop = area.scrollHeight;
}

function addResponseMessage(content) {
  const area = currentDialog.querySelector('.message-area');
  const typingIndicator = document.createElement('div');
  typingIndicator.className = 'typing-indicator';
  typingIndicator.innerHTML = `
        <div class="dot-flashing">
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
        </div>
    `;

  area.appendChild(typingIndicator);
  area.scrollTop = area.scrollHeight;

  // Simulate typing effect
  let index = 0;
  const finalText = content;
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message ai';

  function typeCharacter() {
    if (index < finalText.length) {
      messageDiv.innerHTML = `
                <div class="message-content">${finalText.substring(0, index + 1)}</div>
                <div class="message-time">${new Date().toLocaleTimeString()}</div>
            `;
      if (!messageDiv.parentElement) {
        area.insertBefore(messageDiv, typingIndicator);
      }
      index++;
      setTimeout(typeCharacter, 20);
    } else {
      typingIndicator.remove();
      area.scrollTop = area.scrollHeight;
    }
  }

  typeCharacter();
}

function showStatus(text, type = 'info') {
  const statusBar = currentDialog.querySelector('.status-bar');
  statusBar.textContent = text;
  statusBar.className = `status-bar ${type}`;
}

function closeExistingDialog() {
  if (currentDialog) {
    const profile = getProfileInfo();
    saveChatHistory(profile.id, chatHistory);
    currentDialog.remove();
    currentDialog = null;
  }
}
/* === CSS Styles === */
const style = document.createElement('style');
style.textContent = `
.dialog-container {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999;
}

.dialog-mask {
    position: absolute;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
}

.message-time {
    font-size: 12px;
    color: #999;
    margin-top: 4px;
    font-family: Arial, sans-serif;
}

.chat-dialog {
    position: relative;
    width: 90%;
    max-width: 600px;
    max-height: 80vh;
    background: white;
    border-radius: 12px;
    box-shadow: 0 8px 30px rgba(0,0,0,0.2);
    display: flex;
    flex-direction: column;
}

.dialog-header {
    display: flex;
    align-items: center;
    padding: 16px;
    border-bottom: 1px solid #eee;
}

.profile-avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    margin-right: 12px;
}

.close-btn {
    position: absolute;
    top: 12px;
    right: 12px;
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #666;
}

.message-area {
    flex: 1;
    padding: 16px;
    overflow-y: auto;
}

.message {
    margin: 8px 0;
    padding: 8px 12px;
    border-radius: 12px;
    max-width: 80%;
}

.message.user {
    background: #0073b1;
    color: white;
    margin-left: auto;
}

.message.ai {
    background: #f0f2f5;
    color: #333;
}

.dialog-footer {
    padding: 16px;
    border-top: 1px solid #eee;
    display: flex;
    gap: 8px;
}

.typing-indicator {
    display: flex;
    padding: 8px 12px;
}

.dot-flashing {
    display: flex;
    gap: 4px;
}

.dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #ddd;
    animation: dotFlashing 1s infinite linear;
}

@keyframes dotFlashing {
    0% { opacity: 0.3; }
    50% { opacity: 1; }
    100% { opacity: 0.3; }
}
`;
document.head.appendChild(style);