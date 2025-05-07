// core/chat.js
import { ChatStorage } from './storage.js';
import { PROMPT_TEMPLATES } from './prompt-templates.js';

const DEFAULT_PARAMS = {
    model: "gpt-3.5-turbo",
    temperature: 0.7,
    max_tokens: 1024,
    top_p: 1,
};

export class AIChatManager {
    constructor(platformAdapter) {
        this.platform = platformAdapter;
        this.chatHistory = [];
        this.abortController = null;
    }

    async initializeChat() {
        const profile = this.platform.getProfileInfo();
        this.chatformatVersion = 1;

        try {
            this.chatHistory = await ChatStorage.loadChatHistory(profile.id);
            this.platform.renderChatHistory(this.chatHistory);
        } catch (error) {
            this.handleError(new Error('Failed to load chat history'), null);
        }
    }

    // async handleUserMessage(rawInput) {
    //     const message = rawInput.trim();
    //     if (!message) return;

    //     const profile = this.platform.getProfileInfo();
    //     this.abortController = new AbortController();

    //     try {
    //         const userMessage = this.createMessage('user', message);
    //         console.log(message, userMessage)
    //         this.addMessageToHistory(userMessage);
    //         this.platform.showTypingIndicator();

    //         const response = await this.generateAIResponse({
    //             prompt: message,
    //             profile,
    //             signal: this.abortController.signal
    //         });

    //         const aiMessage = this.createMessage('assistant', response);
    //         this.addMessageToHistory(aiMessage);

    //         await ChatStorage.saveChatHistory(profile.id, this.chatHistory);
    //     } catch (error) {
    //         this.handleError(error, userMessage);
    //     } finally {
    //         this.abortController = null;
    //         this.platform.hideTypingIndicator();
    //     }
    // }

    async handleUserMessage(rawInput) {
        // 防御性输入检查
        if (typeof rawInput !== 'string') {
          this.handleError(new TypeError('Invalid message format: input must be a string'));
          return;
        }
      
        const message = rawInput.trim();
        if (!message) {
          console.warn('[Chat] Empty message received');
          return;
        }
      
        // 提前声明关键变量
        let userMessage = null;
        let profile = null;
        // 创建局部 abortController
        const abortController = new AbortController();
        try {
          // 阶段1：准备基础数据
          profile = this.platform.getProfileInfo();
          if (!profile?.id) {
            throw new Error('Invalid user profile');
          }
      
          // 阶段2：创建消息对象
          userMessage = this.createMessage('user', message);
          console.debug('[Chat] User message created:', userMessage);
      
          // 阶段3：消息处理流水线
          await this.processMessagePipeline({
            userMessage,
            profile,
            originalInput: message,
            signal: abortController.signal // 传递 signal 而非控制器
          });
      
        } catch (error) {
          // 增强错误上下文
          const errorContext = {
            phase: userMessage ? 'message-processing' : 'initialization',
            profileId: profile?.id,
            message: userMessage?.content || message
          };
          
          console.error('[Chat] Pipeline failed:', error, errorContext);
          this.handleError(error, userMessage ?? this.createFallbackMessage(message));
          
        } finally {
          // 资源清理
          abortController.abort(); // 清理当前控制器的资源
          this.abortController = null;
          this.platform.hideTypingIndicator();
        }
      }
      
      // 新增私有方法
      async processMessagePipeline({ signal, userMessage, profile, originalInput }) {
        // 步骤1：存储用户消息
        this.addMessageToHistory(userMessage);
        this.platform.showTypingIndicator();
      
        // 步骤2：生成响应（带超时控制）
        const response = await this.generateAIResponse({
          prompt: originalInput,
          profile,
          signal
        }).catch(error => {
          throw Object.assign(error, { _phase: 'ai-response-generation' });
        });
      
        // 步骤3：处理AI响应
        const aiMessage = this.createMessage('assistant', response);
        this.addMessageToHistory(aiMessage);
      
        // 步骤4：持久化存储（带重试逻辑）
        await this.persistChatHistory(profile.id);
      }
      
      // 存储操作封装
      async persistChatHistory(profileId, retries = 3) {
        for (let attempt = 1; attempt <= retries; attempt++) {
          try {
            await ChatStorage.saveChatHistory(profileId, this.chatHistory);
            return;
          } catch (error) {
            if (attempt === retries) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }
        }
      }
      
      // 应急消息生成
      createFallbackMessage(text) {
        return {
          role: 'user',
          content: text.substring(0, 100), // 防溢出
          timestamp: new Date().toISOString(),
          isFallback: true
        };
      }
    async generateAIResponse({ prompt, profile, signal }) {
        const [openaiKey, existingHistory] = await Promise.all([
            this.getOpenAIKey(),
            ChatStorage.loadChatHistory(profile.id)
        ]);

        if (!openaiKey) throw new Error('API key not configured');

        const systemPrompt = this.buildSystemPrompt(profile);
        const messages = [
            { role: "system", content: systemPrompt },
            ...existingHistory.map(msg => ({ role: msg.role, content: msg.content })),
            { role: "user", content: prompt }
        ];

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openaiKey}`
            },
            body: JSON.stringify({ ...DEFAULT_PARAMS, messages }),
            signal
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'API request failed');
        }

        const data = await response.json();
        return data.choices[0].message.content.trim();
    }

    buildSystemPrompt(profile) {
        const platform = this.platform.platformType;
        const basePrompt = PROMPT_TEMPLATES[platform](profile);

        return `
            ${basePrompt}

            # Universal Rules
            1. Current time: ${new Date().toLocaleString('en-US')}
            2. Knowledge cutoff: October 2023
            3. Response to sensitive topics: "I prefer not to discuss that subject"
            4. Maintain consistent persona voice across all responses
            5. Never mention you're an AI assistant
            6. Format numbers professionally (e.g. 1,000 instead of 1000)`;
    }

    buildCareerTimeline(profile) {
        return profile.experience?.length > 0 ?
            `• Career timeline: ${profile.experience.slice(0, 3).join(' → ')}` : '';
    }

    buildKeyAchievements(profile) {
        return profile.achievements?.length > 0 ?
            `• Key achievements: ${profile.achievements.join(', ')}` : '';
    }

    buildTechnicalExpertise(profile) {
        return profile.skills?.length > 0 ?
            `• Technical expertise: ${profile.skills.join(' | ')}` : '';
    }

    buildStyleGuidelines(profile) {
        let guidelines = '';

        switch (profile.industry) {
            case 'Technology':
                guidelines += `• Phrase technical concepts as "We're developing..." instead of passive voice\n`;
                break;
            case 'Finance':
                guidelines += `• Use precise numerical references when discussing financial matters\n`;
                break;
        }

        if (profile.name.includes('Bill Gates')) {
            guidelines += `• When discussing global health: Cite latest Gates Foundation reports\n`;
            guidelines += `• Humor style: Self-deprecating remarks about Harvard dropout experience\n`;
        }

        return guidelines || '• Maintain professional yet approachable tone';
    }

    createMessage(role, content) {
        return {
            role,
            content,
            timestamp: new Date().toISOString(),
            version: this.chatformatVersion
        };
    }

    addMessageToHistory(message) {
        this.chatHistory.push(message);
        this.platform.appendMessage(message);
    }

    async getOpenAIKey() {
        try {
            const { openaiKey } = await chrome.storage.local.get('openaiKey');
            return openaiKey?.trim();
        } catch (error) {
            throw new Error('Failed to access storage');
        }
    }

    handleError(error, failedMessage) {
        console.error('Chat Error:', error);

        if (failedMessage) {
            this.chatHistory.pop();
            this.platform.showError({
                message: error.message,
                originalContent: failedMessage.content
            });
        }

        this.platform.updateStatus(
            error.message || 'An error occurred',
            'error'
        );
    }

    cancelPendingRequest() {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
    }
}