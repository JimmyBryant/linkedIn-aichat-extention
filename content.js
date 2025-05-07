// content.js
const PLATFORMS = {
    linkedin: {
      match: () => 
        location.hostname.includes('linkedin.com') && 
        /^\/in\/[^/]+\/?$/.test(location.pathname),
      adapter: () => import('./platforms/linkedin.js')
    },
    onlyfans: {
      match: () => {
        // 更精确的OnlyFans用户主页匹配逻辑
        const isOF = location.hostname.includes('onlyfans.com');
        const path = location.pathname.replace(/\/$/, ''); // 移除尾部斜杠
        const segments = path.split('/').filter(Boolean);
        
        // 排除保留路径
        const reservedPaths = new Set([
          'home', 'explore', 'messages', 
          'settings', 'login', 'subscriptions'
        ]);
        
        return isOF && 
          segments.length === 1 && 
          !reservedPaths.has(segments[0]) &&
          !/\d+/.test(segments[0]); // 排除数字ID页面（后台页面）
      },
      adapter: () => import('./platforms/onlyfans.js')
    }
  };
  
  class CrossPlatformManager {
    constructor() {
      this.currentAdapter = null;
      this.lastPlatform = null;
      this.initCheckInterval = null;
    }
  
    async detectPlatform() {
      for (const [platformId, config] of Object.entries(PLATFORMS)) {
        if (config.match()) return platformId;
      }
      return null;
    }
  
    async initialize() {
      const platformId = await this.detectPlatform();
      
      // 平台未变化时跳过初始化
      if (platformId === this.lastPlatform) return;
      
      // 清理旧平台
      if (this.currentAdapter) {
        this.currentAdapter.destroy?.();
        this.currentAdapter = null;
      }
  
      if (platformId) {
        // try {
          console.log(`Loading ${platformId} adapter...`);
          const platformConfig = PLATFORMS[platformId];
          const { default: AdapterClass } = await platformConfig.adapter();
          this.currentAdapter = new AdapterClass();
          this.currentAdapter.initialize();
          this.lastPlatform = platformId;
        // } catch (error) {
        //   console.error(`Failed to load ${platformId} adapter:`, error);
        // }
      }
    }
  
    startMonitoring() {
      // 处理初始加载
      this.initialize();
      
      // 处理SPA导航
      let lastURL = location.href;
      this.initCheckInterval = setInterval(() => {
        if (location.href !== lastURL) {
          lastURL = location.href;
          this.initialize();
        }
      }, 500);
  
      // 处理页面可见性变化
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) this.initialize();
      });
    }
  
    destroy() {
      clearInterval(this.initCheckInterval);
      if (this.currentAdapter) {
        this.currentAdapter.destroy?.();
      }
    }
  }
  
  // 主执行逻辑
  const platformManager = new CrossPlatformManager();
  
  if (document.readyState === 'complete') {
    platformManager.startMonitoring();
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      platformManager.startMonitoring();
    });
    window.addEventListener('load', () => {
      platformManager.startMonitoring();
    });
  }