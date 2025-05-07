// platforms/linkedin.js
import { AIChatManager } from '../core/chat.js';

export default class LinkedInAdapter {
    constructor() {
        this.platformType = 'linkedin'; // 添加平台标识
        this.observer = null;
        this.currentDialog = null;
        this.chatManager = new AIChatManager(this);
        this.messageQueue = [];
        this.isSending = false;
        this.moreButtonSelector = '.artdeco-card button[aria-label="More actions"]';
    }

    initialize() {
        console.log('initializing LinkedIn Adapter...')
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
          background: #ffffff;
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
          color: ##afafaf;
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
        console.log('starting observer...')
        this.observer = new MutationObserver(() => {
            if (!document.getElementById('aiChatBtn')) {
                this.initializeChatButton();
            }
        });

        this.observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Initial check
        this.initializeChatButton();
    }

    initializeChatButton() {
        console.log('inserting chat button...')
        const moreBtn = document.querySelector(this.moreButtonSelector);
        if (moreBtn) {
            this.insertChatButton(moreBtn);
            if (this.observer) this.observer.disconnect();
        }
    }

    insertChatButton(moreBtn) {
        if (document.getElementById('aiChatBtn') || !document.contains(moreBtn)) return;

        const chatBtn = this.createChatButtonElement();
        const container = moreBtn.closest('.pv-top-card-v2-ctas, .pv-top-card__action-bar') || moreBtn.parentNode;

        container.insertBefore(chatBtn, moreBtn);
    }

    createChatButtonElement() {
        const chatBtn = document.createElement('button');
        chatBtn.id = 'aiChatBtn';
        chatBtn.className = 'artdeco-button artdeco-button--secondary mr1';
        chatBtn.innerHTML = `
      <svg class="artdeco-button__icon" viewBox="0 0 24 24" width="16" height="16">
        <path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10H7v-2h10v2z"/>
      </svg>
      <span class="artdeco-button__text">Chat</span>
    `;
        chatBtn.addEventListener('click', () => this.showChatDialog());
        return chatBtn;
    }
    getProfileInfo() {
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
        console.log('sending message...',message)
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