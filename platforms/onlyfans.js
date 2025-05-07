// platforms/linkedin.js
import { AIChatManager } from '../core/chat.js';

export default class OnlyFansAdapter {
    constructor() {
        this.platformType = 'onlyfans'; // 添加平台标识
        this.observer = null;
        this.currentDialog = null;
        this.chatManager = new AIChatManager(this);
        this.messageQueue = [];
        this.isSending = false;
        this.containerSelector = '.b-profile__user .b-group-profile-btns';
        this.favButtonSelector = 'button[aria-label="Add to favorites and other lists"]';
        this.chatBtnClass = 'of-ai-chat-btn';
    }

    initialize() {
        console.log('initializing OnlyFans Adapter...')
        this.injectStyles();
        this.startDOMObserver();
        this.setupGlobalListeners();
    }

    injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
        .ai-chat-container {
          position: fixed;
          bottom: 20px;
          right: 20px;
          width: 400px;
          height: 70vh;
          z-index: 9999;
          border-radius: 12px;
          background: #1A1A1D;
          box-shadow: 0 8px 30px rgba(0,0,0,0.2);
          display: flex;
          flex-direction: column;
          transform: translateY(0);
          opacity: 1;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
    
        .ai-chat-container[hidden] {
          transform: translateY(10px);
          opacity: 0;
          pointer-events: none;
        }
    
        .ai-chat-dialog {
          height: 100%;
          display: flex;
          flex-direction: column;
        }
    
        .ai-chat-header {
          padding: 16px;
          border-bottom: 1px solid #e0e0e0;
          display: flex;
          align-items: center;
          background: #f8f9fa;
          border-radius: 12px 12px 0 0;
          position: relative;
        }
    
        .ai-profile-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          margin-right: 12px;
          object-fit: cover;
        }
    
        .ai-chat-close {
          position: absolute;
          top: 14px;
          right: 16px;
          background: none;
          border: none;
          font-size: 24px;
          color: #666;
          cursor: pointer;
          padding: 4px;
          line-height: 1;
        }
    
        .ai-chat-close:hover {
          color: #333;
        }
    
        .ai-message-area {
          flex: 1;
          padding: 16px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 12px;
          background: #ffffff;
        }
    
        .ai-message {
          max-width: 85%;
          padding: 12px 16px;
          border-radius: 18px;
          position: relative;
          font-size: 14px;
          line-height: 1.4;
        }
    
        .ai-message-user {
          background: #0073b1;
          color: white;
          align-self: flex-end;
          border-bottom-right-radius: 4px;
        }
    
        .ai-message-bot {
          background: #f0f2f5;
          color: #1d1d1f;
          align-self: flex-start;
          border-bottom-left-radius: 4px;
        }
    
        .ai-message-time {
          font-size: 0.75rem;
          color: #afafaf;
          margin-top: 6px;
          text-align: right;
        }
    
        .ai-input-area {
          padding: 16px;
          border-top: 1px solid #e0e0e0;
          display: flex;
          gap: 8px;
          background: #fbfbfb;
          border-radius: 0 0 12px 12px;
        }
    
        .ai-input-field {
          flex: 1;
          padding: 10px 14px;
          border: 1px solid #cfd9de;
          border-radius: 20px;
          resize: none;
          font-size: 14px;
          line-height: 1.4;
          min-height: 44px;
          max-height: 120px;
          transition: border-color 0.2s;
        }
    
        .ai-input-field:focus {
          outline: none;
          border-color: #0073b1;
          box-shadow: 0 0 0 2px rgba(0,115,177,0.1);
        }
    
        .ai-send-button {
          background: #0073b1;
          color: white;
          border: none;
          padding: 10px 18px;
          border-radius: 20px;
          cursor: pointer;
          font-weight: 500;
          transition: background 0.2s;
          height: 44px;
        }
    
        .ai-send-button:hover {
          background: #006097;
        }
    
        .ai-send-button:disabled {
          background: #cfd9de;
          cursor: not-allowed;
        }
    
        .ai-typing-indicator {
          display: flex;
          gap: 6px;
          padding: 12px 16px;
          align-items: center;
        }
    
        .ai-typing-dot {
          width: 8px;
          height: 8px;
          background: #a8b3bc;
          border-radius: 50%;
          animation: aiDotPulse 1.4s infinite;
        }
    
        .ai-typing-dot:nth-child(2) {
          animation-delay: 0.2s;
        }
    
        .ai-typing-dot:nth-child(3) {
          animation-delay: 0.4s;
        }
    
        @keyframes aiDotPulse {
          0%, 100% { 
            opacity: 0.3;
            transform: translateY(0);
          }
          50% { 
            opacity: 1;
            transform: translateY(-2px);
          }
        }
    
        @media (max-width: 480px) {
          .ai-chat-container {
            width: 100% !important;
            height: 85vh !important;
            bottom: 0;
            right: 0;
            border-radius: 16px 16px 0 0;
          }
    
          .ai-chat-header {
            padding: 12px;
          }
    
          .ai-message-area {
            padding: 12px;
          }
    
          .ai-input-area {
            padding: 12px;
          }
        }
    
        @media (prefers-color-scheme: dark) {
          .ai-chat-container,
          .ai-message-area {
            background: #1a1a1a;
          }
    
          .ai-chat-header {
            background: #2d2d2d;
            border-color: #404040;
          }
    
          .ai-input-area {
            background: #2d2d2d;
            border-color: #404040;
          }
    
          .ai-message-bot {
            background: #2d2d2d;
            color: #e0e0e0;
          }
    
          .ai-input-field {
            background: #333;
            border-color: #404040;
            color: #e0e0e0;
          }
    
          .ai-message-time {
            color: #a0a0a0;
          }
    
          .ai-chat-close {
            color: #a0a0a0;
          }
        }
        `;
        document.head.appendChild(style);
    }

    startDOMObserver() {
        console.log('starting observer...');
        if (!this.observer) {
            this.observer = new MutationObserver((mutations) => {
                if (document.querySelector(this.containerSelector)) {
                    this.initializeChatButton();
                }
            });
        }

        if (document.body) {
            this.observer.observe(document.body, {
                childList: true,
                subtree: true
            });
            // Initial check
            this.initializeChatButton();
        } else {
            console.error('document.body is not available');
            // 或者延迟执行直到document.body可用
            window.addEventListener('DOMContentLoaded', () => {
                this.observer.observe(document.body, {
                    childList: true,
                    subtree: true
                });
                this.initializeChatButton();
            });
        }
    }

    initializeChatButton() {
        // 1. 加强容器检查逻辑
        const container = document.querySelector(this.containerSelector);
        if (!container) {
            console.log('目标容器未找到');
            return;
        }

        // 2. 使用更精确的按钮选择器
        const existingBtn = container.querySelector(`button.${this.chatBtnClass}`);
        if (existingBtn) {
            console.log('AI按钮已存在，跳过初始化');
            return;
        }

        // 3. 安全获取参考按钮
        const favButton = container.querySelector(this.favButtonSelector);
        if (!favButton) {
            console.warn('参考按钮未找到，无法定位插入位置');
            return;
        }

        try {
            // 4. 创建并插入新按钮
            const chatBtn = this.createChatButton(favButton);
            container.insertBefore(chatBtn, favButton);
            console.log('AI按钮注入成功');

            // 5. 插入成功后立即断开观察器
            this.observer?.disconnect();
        } catch (error) {
            console.error('按钮创建失败:', error);
        }
    }

    createChatButton(referenceButton) {
        const btn = document.createElement('button');

        // 克隆Vue组件属性
        const vueProps = {
            'class': referenceButton.className.replace('m-colored', 'm-ai') // 新增样式修饰
        };

        // 设置按钮属性
        Object.assign(btn, {
            type: 'button',
            'aria-label': 'AI Chat',
            'data-testid': 'ai-chat-button',
            'data-tooltip': 'Smart Chat (Ctrl+Shift+C)',
            class: `${vueProps.class} ${this.chatBtnClass}`,
            title: 'Chat',
            innerHTML: `
  <svg 
    class="g-icon" 
    aria-hidden="true" 
    viewBox="0 0 24 24" 
    width="20" 
    height="20"
    stroke="currentColor" 
    fill="none"
  >
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
  </svg>
            `
        });

        // 复制Vue数据属性
        Object.entries(vueProps).forEach(([k, v]) => btn.setAttribute(k, v));

        // 事件处理
        btn.addEventListener('click', (e) => {
            e.stopImmediatePropagation();
            this.showChatDialog();
        });

        return btn;
    }

    createSpacer() {
        const spacer = document.createElement('div');
        spacer.className = 'm-spacer--8';
        spacer.style.cssText = 'display: inline-block; width: 8px;';
        return spacer;
    }

    getProfileInfo() {
        const safeQuery = (selector, attr = 'textContent') => {
            const el = document.querySelector(selector);
            return el?.[attr]?.trim() || 'Not specified';
        };
        const name = safeQuery('.b-profile__header__user .g-user-name');
        return {
            id: name ? name.replace(/\s+/g, '-').toLowerCase() : 'unknown',
            avatar: safeQuery('.b-profile__header__user .g-avatar__img-wrapper img', 'src') ||  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjRkZGIi8jwv3N2Zz4=',
            name,
            bio: safeQuery('.relative .text-body-medium.break-words'),
            tiers: ['Silver Tier', 'Gold VIP'],
            recentPosts: ['Beach photoshoot', 'Q&A vlog'],
            contentStyle: 'Playful teasing'
        };
    }

    showChatDialog() {
        if (this.currentDialog) return;

        this.currentDialog = document.createElement('div');
        this.currentDialog.className = 'ai-chat-container';
        this.currentDialog.innerHTML = `
          <div class="ai-chat-dialog">
            <div class="ai-chat-header">
              <img src="${this.getProfileInfo().avatar}" class="ai-profile-avatar">
              <div>
                <h3 style="margin: 0; font-size: 16px;">Chat with ${this.getProfileInfo().name}</h3>
                <p style="margin: 0; font-size: 12px; color: #666;">${this.getProfileInfo().headline}</p>
              </div>
              <button class="ai-chat-close">&times;</button>
            </div>
            <div class="ai-message-area"></div>
            <div class="ai-input-area">
              <textarea class="ai-input-field" placeholder="Type your message..." rows="2"></textarea>
              <button class="ai-send-button">Send</button>
            </div>
          </div>
        `;

        document.body.appendChild(this.currentDialog);
        this.setupDialogBehavior();
        this.chatManager.initializeChat();
    }

    setupDialogBehavior() {
        const closeBtn = this.currentDialog.querySelector('.ai-chat-close');
        const mask = this.currentDialog.querySelector('.ai-chat-mask');
        const textarea = this.currentDialog.querySelector('.ai-input-field');
        const sendBtn = this.currentDialog.querySelector('.ai-send-button');

        const closeDialog = () => {
            this.currentDialog.style.opacity = '0';
            setTimeout(() => {
                this.currentDialog.remove();
                this.currentDialog = null;
            }, 300);
        };

        closeBtn.addEventListener('click', closeDialog);

        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendBtn.click();
            }
        });

        sendBtn.addEventListener('click', async () => {
            if (!textarea.value.trim()) return;
            await this.handleSendMessage(textarea.value);
            textarea.value = '';
        });
    }

    async handleSendMessage(message) {
        if (this.isSending) return;
        this.isSending = true;

        try {
            await this.chatManager.handleUserMessage(message);
        } finally {
            this.isSending = false;
        }
    }

    renderChatHistory(history) {
        const area = this.currentDialog?.querySelector('.ai-message-area');
        if (!area) return;

        area.innerHTML = history.map(msg => `
      <div class="ai-message ${msg.role === 'user' ? 'ai-message-user' : 'ai-message-bot'}">
        <div>${msg.content}</div>
        <div class="ai-message-time">${new Date(msg.timestamp).toLocaleTimeString()}</div>
      </div>
    `).join('');
    }

    appendMessage(message) {
        const area = this.currentDialog?.querySelector('.ai-message-area');
        if (!area) return;

        const msgElement = document.createElement('div');
        msgElement.className = `ai-message ${message.role === 'user' ? 'ai-message-user' : 'ai-message-bot'}`;
        msgElement.innerHTML = `
      <div>${message.content}</div>
      <div class="ai-message-time">${new Date(message.timestamp).toLocaleTimeString()}</div>
    `;

        area.appendChild(msgElement);
        area.scrollTop = area.scrollHeight;
    }

    showTypingIndicator() {
        const area = this.currentDialog?.querySelector('.ai-message-area');
        if (!area) return;

        const indicator = document.createElement('div');
        indicator.className = 'ai-typing-indicator';
        indicator.innerHTML = `
      <div class="ai-typing-dot"></div>
      <div class="ai-typing-dot"></div>
      <div class="ai-typing-dot"></div>
    `;

        area.appendChild(indicator);
        area.scrollTop = area.scrollHeight;
    }

    hideTypingIndicator() {
        const indicators = this.currentDialog?.querySelectorAll('.ai-typing-indicator');
        indicators?.forEach(indicator => indicator.remove());
    }

    showError(error) {
        const errorMessage = {
            role: 'error',
            content: `Error: ${error.message}`,
            timestamp: new Date().toISOString()
        };

        this.appendMessage(errorMessage);
    }

    setupGlobalListeners() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.currentDialog) {
                this.currentDialog.remove();
                this.currentDialog = null;
            }
        });
    }
}