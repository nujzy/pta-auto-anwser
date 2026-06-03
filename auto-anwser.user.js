// ==UserScript==
// @name         PTA 拼题智能答题助手
// @namespace    https://github.com/nujzy
// @version      1.0.1
// @description  PTA平台自动答题插件，支持自动答题并跳转下一题，动态获取模型列表。兼容OpenAI风格API（硅基流动、DeepSeek等）
// @author       weishijie-detail & nujzy 
// @match        https://pintia.cn/*
// @match        https://www.pintia.cn/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @connect      *
// @run-at       document-end
// @license      MIT
// @downloadURL https://raw.githubusercontent.com/nujzy/pta-auto-anwser/main/auto-anwser.user.js
// @updateURL https://raw.githubusercontent.com/nujzy/pta-auto-anwser/main/auto-anwser.user.js
// ==/UserScript==

(function() {
    'use strict';

    // ==================== 配置管理 ====================
    const Config = {
        get: (key, defaultValue = '') => GM_getValue(key, defaultValue),
        set: (key, value) => GM_setValue(key, value),
        getAll: () => ({
            baseURL: GM_getValue('baseURL', ''),
            apiKey: GM_getValue('apiKey', ''),
            model: GM_getValue('model', ''),
            temperature: GM_getValue('temperature', 0.7),
            maxTokens: GM_getValue('maxTokens', 4096),
            autoSubmit: GM_getValue('autoSubmit', true),
            autoNext: GM_getValue('autoNext', true),
            delay: GM_getValue('delay', 1000),
            submitDelay: GM_getValue('submitDelay', 2000)
        }),
        saveAll: (config) => {
            Object.keys(config).forEach(key => GM_setValue(key, config[key]));
        }
    };

    // ==================== 常用 API URL 预设（仅作为快速填充参考） ====================
    const PRESET_URLS = {
        '硅基流动': 'https://api.siliconflow.cn/v1',
        'DeepSeek官方': 'https://api.deepseek.com/v1',
        'OpenAI': 'https://api.openai.com/v1',
        '阿里云百炼': 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        '智谱AI': 'https://open.bigmodel.cn/api/paas/v4'
    };

    // ==================== 样式定义 ====================
    const STYLES = `
        .pta-plugin-container {
            position: fixed;
            top: 80px;
            right: 20px;
            width: 420px;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            border-radius: 16px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1);
            z-index: 999999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: #e0e0e0;
            overflow: hidden;
            transition: all 0.3s ease;
        }
        .pta-plugin-container.minimized {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            overflow: hidden;
        }
        .pta-plugin-container.minimized .pta-body,
        .pta-plugin-container.minimized .pta-header-title,
        .pta-plugin-container.minimized .pta-close-btn {
            display: none;
        }
        .pta-plugin-container.minimized .pta-header {
            padding: 0;
            justify-content: center;
            align-items: center;
            height: 60px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .pta-plugin-container.minimized .pta-icon {
            display: flex !important;
            font-size: 28px;
        }
        .pta-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 16px 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            cursor: pointer;
        }
        .pta-header-title {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 16px;
            font-weight: 600;
            color: white;
        }
        .pta-icon {
            display: none;
        }
        .pta-header-actions {
            display: flex;
            gap: 8px;
        }
        .pta-btn-icon {
            width: 28px;
            height: 28px;
            border: none;
            background: rgba(255,255,255,0.2);
            border-radius: 6px;
            color: white;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            transition: all 0.2s;
        }
        .pta-btn-icon:hover {
            background: rgba(255,255,255,0.3);
        }
        .pta-body {
            padding: 20px;
            max-height: 75vh;
            overflow-y: auto;
        }
        .pta-section {
            margin-bottom: 20px;
        }
        .pta-section-title {
            font-size: 12px;
            font-weight: 600;
            color: #888;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 10px;
        }
        .pta-form-group {
            margin-bottom: 14px;
        }
        .pta-label {
            display: block;
            font-size: 13px;
            color: #aaa;
            margin-bottom: 6px;
        }
        .pta-input, .pta-select, .pta-textarea {
            width: 100%;
            padding: 10px 14px;
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 10px;
            color: #e0e0e0;
            font-size: 13px;
            box-sizing: border-box;
            transition: all 0.2s;
        }
        .pta-input:focus, .pta-select:focus, .pta-textarea:focus {
            outline: none;
            border-color: #667eea;
            background: rgba(255,255,255,0.08);
        }
        .pta-select option {
            background: #1a1a2e;
            color: #e0e0e0;
        }
        .pta-textarea {
            min-height: 80px;
            resize: vertical;
            font-family: 'Consolas', 'Monaco', monospace;
        }
        .pta-btn {
            width: 100%;
            padding: 12px 20px;
            border: none;
            border-radius: 10px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }
        .pta-btn-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .pta-btn-primary:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }
        .pta-btn-primary:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }
        .pta-btn-secondary {
            background: rgba(255,255,255,0.1);
            color: #e0e0e0;
        }
        .pta-btn-secondary:hover:not(:disabled) {
            background: rgba(255,255,255,0.15);
        }
        .pta-btn-success {
            background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
            color: white;
        }
        .pta-btn-success:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(17, 153, 142, 0.4);
        }
        .pta-btn-danger {
            background: linear-gradient(135deg, #eb3349 0%, #f45c43 100%);
            color: white;
        }
        .pta-btn-small {
            padding: 8px 14px;
            font-size: 12px;
        }
        .pta-row {
            display: flex;
            gap: 10px;
        }
        .pta-row .pta-form-group {
            flex: 1;
        }
        .pta-tabs {
            display: flex;
            gap: 4px;
            margin-bottom: 16px;
            background: rgba(255,255,255,0.05);
            padding: 4px;
            border-radius: 10px;
        }
        .pta-tab {
            flex: 1;
            padding: 8px 12px;
            border: none;
            background: transparent;
            color: #888;
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            border-radius: 8px;
            transition: all 0.2s;
        }
        .pta-tab.active {
            background: rgba(102, 126, 234, 0.3);
            color: #fff;
        }
        .pta-tab-content {
            display: none;
        }
        .pta-tab-content.active {
            display: block;
        }
        .pta-status {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 12px;
            background: rgba(255,255,255,0.05);
            border-radius: 10px;
            margin-bottom: 16px;
            font-size: 13px;
        }
        .pta-status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #38ef7d;
            animation: pulse 2s infinite;
        }
        .pta-status-dot.error {
            background: #f45c43;
            animation: none;
        }
        .pta-status-dot.waiting {
            background: #ffd700;
            animation: pulse 1s infinite;
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        .pta-log {
            max-height: 200px;
            overflow-y: auto;
            background: rgba(0,0,0,0.3);
            border-radius: 10px;
            padding: 12px;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 11px;
            line-height: 1.6;
        }
        .pta-log-entry {
            margin-bottom: 6px;
            padding: 6px 10px;
            border-radius: 4px;
            background: rgba(255,255,255,0.03);
            word-break: break-word;
            white-space: pre-wrap;
            line-height: 1.5;
        }
        .pta-log-time {
            color: #667eea;
            margin-right: 8px;
            flex-shrink: 0;
        }
        .pta-log-info { color: #38ef7d; }
        .pta-log-warn { color: #ffd700; }
        .pta-log-error { color: #f45c43; }
        .pta-toggle {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 10px 0;
        }
        .pta-toggle-label {
            font-size: 13px;
            color: #aaa;
        }
        .pta-switch {
            position: relative;
            width: 44px;
            height: 24px;
        }
        .pta-switch input {
            opacity: 0;
            width: 0;
            height: 0;
        }
        .pta-slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(255,255,255,0.2);
            transition: 0.3s;
            border-radius: 24px;
        }
        .pta-slider:before {
            position: absolute;
            content: "";
            height: 18px;
            width: 18px;
            left: 3px;
            bottom: 3px;
            background: white;
            transition: 0.3s;
            border-radius: 50%;
        }
        .pta-switch input:checked + .pta-slider {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .pta-switch input:checked + .pta-slider:before {
            transform: translateX(20px);
        }
        .pta-progress {
            margin-top: 16px;
        }
        .pta-progress-bar {
            height: 6px;
            background: rgba(255,255,255,0.1);
            border-radius: 3px;
            overflow: hidden;
        }
        .pta-progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
            border-radius: 3px;
            transition: width 0.3s ease;
        }
        .pta-progress-text {
            font-size: 11px;
            color: #888;
            margin-top: 6px;
            text-align: center;
        }
        .pta-question-type {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 10px;
            background: rgba(102, 126, 234, 0.2);
            border-radius: 20px;
            font-size: 11px;
            color: #667eea;
            margin-bottom: 10px;
        }
        .pta-answer-preview {
            max-height: 200px;
            overflow-y: auto;
            background: rgba(0,0,0,0.3);
            border-radius: 10px;
            padding: 12px;
            margin-top: 12px;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 12px;
            white-space: pre-wrap;
            word-break: break-all;
        }
        .pta-answer-preview code {
            color: #38ef7d;
        }
        .pta-model-loading {
            display: inline-block;
            width: 14px;
            height: 14px;
            border: 2px solid rgba(255,255,255,0.1);
            border-top-color: #667eea;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            margin-left: 8px;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        .pta-body::-webkit-scrollbar,
        .pta-log::-webkit-scrollbar,
        .pta-answer-preview::-webkit-scrollbar {
            width: 6px;
        }
        .pta-body::-webkit-scrollbar-track,
        .pta-log::-webkit-scrollbar-track,
        .pta-answer-preview::-webkit-scrollbar-track {
            background: rgba(255,255,255,0.05);
            border-radius: 3px;
        }
        .pta-body::-webkit-scrollbar-thumb,
        .pta-log::-webkit-scrollbar-thumb,
        .pta-answer-preview::-webkit-scrollbar-thumb {
            background: rgba(102, 126, 234, 0.5);
            border-radius: 3px;
        }
        .pta-plugin-container.dragging {
            opacity: 0.8;
            cursor: move;
        }
        .pta-auto-controls {
            display: flex;
            gap: 10px;
            margin-top: 10px;
        }
        .pta-auto-controls .pta-btn {
            flex: 1;
        }
        .pta-running-indicator {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 10px;
            background: rgba(17, 153, 142, 0.2);
            border-radius: 20px;
            font-size: 11px;
            color: #38ef7d;
            margin-bottom: 10px;
        }
        .pta-running-indicator::before {
            content: '';
            width: 6px;
            height: 6px;
            background: #38ef7d;
            border-radius: 50%;
            animation: blink 1s infinite;
        }
        @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
        }
        .pta-preset-urls {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            margin-top: 8px;
        }
        .pta-preset-url-btn {
            padding: 4px 10px;
            background: rgba(102, 126, 234, 0.2);
            border: 1px solid rgba(102, 126, 234, 0.3);
            border-radius: 6px;
            color: #667eea;
            font-size: 11px;
            cursor: pointer;
            transition: all 0.2s;
        }
        .pta-preset-url-btn:hover {
            background: rgba(102, 126, 234, 0.3);
        }
        .pta-log-entry-content {
            display: inline;
        }
    `;

    // ==================== UI 管理器 ====================
    const UIManager = {
        container: null,
        logContainer: null,
        currentTab: 'config',
        isMinimized: false,
        isDragging: false,
        dragOffset: { x: 0, y: 0 },

        init() {
            this.injectStyles();
            this.createContainer();
            this.bindEvents();
            this.loadConfig();
            this.log('PTA 智能答题助手 v2.1.2 已加载', 'info');
            this.log('快捷键: Ctrl+Shift+A 打开/关闭面板', 'info');
        },

        injectStyles() {
            if (document.getElementById('pta-plugin-styles')) return;
            const style = document.createElement('style');
            style.id = 'pta-plugin-styles';
            style.textContent = STYLES;
            document.head.appendChild(style);
        },

        createContainer() {
            this.container = document.createElement('div');
            this.container.className = 'pta-plugin-container';
            this.container.innerHTML = `
                <div class="pta-header">
                    <div class="pta-header-title">
                        <span>🤖</span>
                        <span>PTA 智能答题助手</span>
                    </div>
                    <span class="pta-icon">🤖</span>
                    <div class="pta-header-actions">
                        <button class="pta-btn-icon pta-minimize-btn" title="最小化">−</button>
                        <button class="pta-btn-icon pta-close-btn" title="关闭">×</button>
                    </div>
                </div>
                <div class="pta-body">
                    <div class="pta-status">
                        <span class="pta-status-dot"></span>
                        <span id="pta-status-text">就绪 - 等待配置</span>
                    </div>

                    <div class="pta-tabs">
                        <button class="pta-tab active" data-tab="config">⚙️ 配置</button>
                        <button class="pta-tab" data-tab="answer">📝 答题</button>
                        <button class="pta-tab" data-tab="logs">📋 日志</button>
                    </div>

                    <div class="pta-tab-content active" id="tab-config">
                        <div class="pta-section">
                            <div class="pta-section-title">API 配置 (OpenAI 风格)</div>
                            <div class="pta-form-group">
                                <label class="pta-label">Base URL</label>
                                <input type="text" class="pta-input" id="pta-baseurl" placeholder="https://api.example.com/v1">
                                <div class="pta-preset-urls">
                                    <span style="font-size: 11px; color: #666; margin-right: 4px;">快速填充:</span>
                                    ${Object.entries(PRESET_URLS).map(([name, url]) =>
                                        `<button class="pta-preset-url-btn" data-url="${url}">${name}</button>`
                                    ).join('')}
                                </div>
                            </div>
                            <div class="pta-form-group">
                                <label class="pta-label">API Key</label>
                                <input type="password" class="pta-input" id="pta-apikey" placeholder="sk-xxxxxxxxxxxxxxxx">
                            </div>
                            <div class="pta-row">
                                <div class="pta-form-group" style="flex: 1;">
                                    <label class="pta-label">模型 <span id="pta-model-loading"></span></label>
                                    <select class="pta-select" id="pta-model" disabled>
                                        <option value="">请先获取模型列表</option>
                                    </select>
                                </div>
                            </div>
                            <button class="pta-btn pta-btn-secondary pta-btn-small" id="pta-fetch-models" disabled>
                                🔄 获取模型列表
                            </button>
                        </div>

                        <div class="pta-section">
                            <div class="pta-section-title">自动答题设置</div>
                            <div class="pta-toggle">
                                <span class="pta-toggle-label">自动提交答案</span>
                                <label class="pta-switch">
                                    <input type="checkbox" id="pta-autosubmit" checked>
                                    <span class="pta-slider"></span>
                                </label>
                            </div>
                            <div class="pta-toggle">
                                <span class="pta-toggle-label">自动跳转下一题</span>
                                <label class="pta-switch">
                                    <input type="checkbox" id="pta-autonext" checked>
                                    <span class="pta-slider"></span>
                                </label>
                            </div>
                            <div class="pta-row">
                                <div class="pta-form-group">
                                    <label class="pta-label">填答延迟 (ms)</label>
                                    <input type="number" class="pta-input" id="pta-delay" min="0" max="5000" step="100" value="1000">
                                </div>
                                <div class="pta-form-group">
                                    <label class="pta-label">提交延迟 (ms)</label>
                                    <input type="number" class="pta-input" id="pta-submitdelay" min="0" max="10000" step="500" value="2000">
                                </div>
                            </div>
                        </div>

                        <div class="pta-section">
                            <div class="pta-section-title">模型参数</div>
                            <div class="pta-row">
                                <div class="pta-form-group">
                                    <label class="pta-label">Temperature</label>
                                    <input type="number" class="pta-input" id="pta-temperature" min="0" max="2" step="0.1" value="0.7">
                                </div>
                                <div class="pta-form-group">
                                    <label class="pta-label">Max Tokens</label>
                                    <input type="number" class="pta-input" id="pta-maxtokens" min="100" max="8000" step="100" value="4096">
                                </div>
                            </div>
                        </div>

                        <button class="pta-btn pta-btn-primary" id="pta-save-config">
                            💾 保存配置
                        </button>
                    </div>

                    <div class="pta-tab-content" id="tab-answer">
                        <div class="pta-section">
                            <div class="pta-section-title">当前题目</div>
                            <div id="pta-question-info">
                                <div class="pta-question-type" id="pta-question-type">
                                    <span>❓</span>
                                    <span>未检测到题目</span>
                                </div>
                                <div id="pta-auto-status"></div>
                                <div class="pta-form-group">
                                    <label class="pta-label">题目内容预览</label>
                                    <div class="pta-answer-preview" id="pta-question-preview">请打开题目页面...</div>
                                </div>
                            </div>
                        </div>

                        <div class="pta-section">
                            <div class="pta-section-title">答题控制</div>
                            <button class="pta-btn pta-btn-primary" id="pta-analyze-btn" style="margin-bottom: 10px;">
                                🔍 分析当前题目
                            </button>
                            <button class="pta-btn pta-btn-success" id="pta-answer-btn" disabled>
                                ✨ 一键答题
                            </button>
                        </div>

                        <div class="pta-section">
                            <div class="pta-section-title">自动连续答题</div>
                            <div class="pta-auto-controls">
                                <button class="pta-btn pta-btn-success" id="pta-auto-start">
                                    ▶️ 开始自动
                                </button>
                                <button class="pta-btn pta-btn-danger" id="pta-auto-stop" disabled>
                                    ⏹️ 停止
                                </button>
                            </div>
                        </div>

                        <div class="pta-section" id="pta-answer-section" style="display:none;">
                            <div class="pta-section-title">生成的答案</div>
                            <div class="pta-answer-preview" id="pta-answer-preview"></div>
                        </div>

                        <div class="pta-progress" id="pta-progress" style="display:none;">
                            <div class="pta-progress-bar">
                                <div class="pta-progress-fill" id="pta-progress-fill" style="width: 0%"></div>
                            </div>
                            <div class="pta-progress-text" id="pta-progress-text">0%</div>
                        </div>
                    </div>

                    <div class="pta-tab-content" id="tab-logs">
                        <div class="pta-log" id="pta-log-container"></div>
                        <button class="pta-btn pta-btn-secondary" id="pta-clear-logs" style="margin-top: 10px;">
                            🗑️ 清空日志
                        </button>
                    </div>
                </div>
            `;
            document.body.appendChild(this.container);
            this.logContainer = this.container.querySelector('#pta-log-container');
        },

        bindEvents() {
            // 标签切换
            this.container.querySelectorAll('.pta-tab').forEach(tab => {
                tab.addEventListener('click', (e) => {
                    this.switchTab(e.target.dataset.tab);
                });
            });

            // 最小化/关闭
            this.container.querySelector('.pta-minimize-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleMinimize();
            });
            this.container.querySelector('.pta-close-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                this.hide();
            });
            this.container.querySelector('.pta-header').addEventListener('click', (e) => {
                if (e.target.closest('.pta-btn-icon')) return;
                if (this.isMinimized) this.toggleMinimize();
            });

            // 拖拽
            const header = this.container.querySelector('.pta-header');
            header.addEventListener('mousedown', (e) => {
                if (e.target.closest('.pta-btn-icon')) return;
                this.isDragging = true;
                const rect = this.container.getBoundingClientRect();
                this.dragOffset.x = e.clientX - rect.left;
                this.dragOffset.y = e.clientY - rect.top;
                this.container.classList.add('dragging');
            });
            document.addEventListener('mousemove', (e) => {
                if (!this.isDragging) return;
                const x = e.clientX - this.dragOffset.x;
                const y = e.clientY - this.dragOffset.y;
                this.container.style.left = x + 'px';
                this.container.style.top = y + 'px';
                this.container.style.right = 'auto';
            });
            document.addEventListener('mouseup', () => {
                this.isDragging = false;
                this.container.classList.remove('dragging');
            });

            // 快速填充 URL 按钮
            this.container.querySelectorAll('.pta-preset-url-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const url = btn.dataset.url;
                    this.container.querySelector('#pta-baseurl').value = url;
                    this.checkFetchButton();
                    this.log(`已填充 URL: ${btn.textContent}`, 'info');
                });
            });

            // Base URL 和 API Key 输入监听
            this.container.querySelector('#pta-baseurl').addEventListener('input', () => {
                this.checkFetchButton();
            });
            this.container.querySelector('#pta-apikey').addEventListener('input', () => {
                this.checkFetchButton();
            });

            // 获取模型列表
            this.container.querySelector('#pta-fetch-models').addEventListener('click', () => {
                this.fetchModels();
            });

            // 保存配置
            this.container.querySelector('#pta-save-config').addEventListener('click', () => {
                this.saveConfig();
            });

            // 答题按钮
            this.container.querySelector('#pta-analyze-btn').addEventListener('click', () => {
                QuestionAnalyzer.analyze();
            });
            this.container.querySelector('#pta-answer-btn').addEventListener('click', () => {
                AnswerManager.generateAndFillAnswer();
            });

            // 自动答题控制
            this.container.querySelector('#pta-auto-start').addEventListener('click', () => {
                AutoAnswerManager.start();
            });
            this.container.querySelector('#pta-auto-stop').addEventListener('click', () => {
                AutoAnswerManager.stop();
            });

            // 清空日志
            this.container.querySelector('#pta-clear-logs').addEventListener('click', () => {
                this.clearLogs();
            });

            // 键盘快捷键
            document.addEventListener('keydown', (e) => {
                if (e.ctrlKey && e.shiftKey && e.key === 'A') {
                    e.preventDefault();
                    this.toggle();
                }
            });
        },

        checkFetchButton() {
            const baseUrl = this.container.querySelector('#pta-baseurl').value.trim();
            const apiKey = this.container.querySelector('#pta-apikey').value.trim();
            const fetchBtn = this.container.querySelector('#pta-fetch-models');
            fetchBtn.disabled = !(baseUrl && apiKey);
        },

        async fetchModels() {
            const baseUrl = this.container.querySelector('#pta-baseurl').value.trim();
            const apiKey = this.container.querySelector('#pta-apikey').value.trim();
            const loadingEl = this.container.querySelector('#pta-model-loading');

            if (!baseUrl || !apiKey) {
                this.log('请先填写 Base URL 和 API Key', 'error');
                return;
            }

            loadingEl.className = 'pta-model-loading';
            this.log('正在获取模型列表...', 'info');

            try {
                const models = await APIManager.fetchModels(baseUrl, apiKey);
                this.updateModelSelect(models);
                this.log(`成功获取 ${models.length} 个模型`, 'info');
                this.showNotification(`获取成功！共 ${models.length} 个模型`, 'success');
            } catch (error) {
                this.log('获取模型列表失败: ' + error.message, 'error');
                this.showNotification('获取失败: ' + error.message, 'error');
            } finally {
                loadingEl.className = '';
            }
        },

        updateModelSelect(models, disabled = false) {
            const modelSelect = this.container.querySelector('#pta-model');
            modelSelect.disabled = disabled || models.length === 0;

            if (models.length === 0) {
                modelSelect.innerHTML = '<option value="">请先获取模型列表</option>';
                return;
            }

            modelSelect.innerHTML = models.map(m =>
                `<option value="${m.id}">${m.name || m.id}</option>`
            ).join('');
        },

        switchTab(tab) {
            this.currentTab = tab;
            this.container.querySelectorAll('.pta-tab').forEach(t => t.classList.remove('active'));
            this.container.querySelectorAll('.pta-tab-content').forEach(c => c.classList.remove('active'));
            this.container.querySelector(`[data-tab="${tab}"]`).classList.add('active');
            this.container.querySelector(`#tab-${tab}`).classList.add('active');
        },

        toggleMinimize() {
            this.isMinimized = !this.isMinimized;
            this.container.classList.toggle('minimized', this.isMinimized);
        },

        toggle() {
            this.container.style.display = this.container.style.display === 'none' ? 'block' : 'none';
        },

        hide() {
            this.container.style.display = 'none';
        },

        show() {
            this.container.style.display = 'block';
        },

        loadConfig() {
            const config = Config.getAll();

            this.container.querySelector('#pta-baseurl').value = config.baseURL;
            this.container.querySelector('#pta-apikey').value = config.apiKey;
            this.container.querySelector('#pta-model').value = config.model;
            this.container.querySelector('#pta-temperature').value = config.temperature;
            this.container.querySelector('#pta-maxtokens').value = config.maxTokens;
            this.container.querySelector('#pta-autosubmit').checked = config.autoSubmit;
            this.container.querySelector('#pta-autonext').checked = config.autoNext;
            this.container.querySelector('#pta-delay').value = config.delay;
            this.container.querySelector('#pta-submitdelay').value = config.submitDelay;

            this.checkFetchButton();
        },

        saveConfig() {
            const config = {
                baseURL: this.container.querySelector('#pta-baseurl').value.trim(),
                apiKey: this.container.querySelector('#pta-apikey').value.trim(),
                model: this.container.querySelector('#pta-model').value,
                temperature: parseFloat(this.container.querySelector('#pta-temperature').value),
                maxTokens: parseInt(this.container.querySelector('#pta-maxtokens').value),
                autoSubmit: this.container.querySelector('#pta-autosubmit').checked,
                autoNext: this.container.querySelector('#pta-autonext').checked,
                delay: parseInt(this.container.querySelector('#pta-delay').value),
                submitDelay: parseInt(this.container.querySelector('#pta-submitdelay').value)
            };

            if (!config.baseURL || !config.apiKey || !config.model) {
                this.log('请填写完整的 API 配置信息', 'error');
                this.updateStatus('配置不完整', 'error');
                return;
            }

            Config.saveAll(config);
            this.log('配置已保存', 'info');
            this.updateStatus('配置已保存，可以开始答题', 'ready');
            this.showNotification('配置保存成功！', 'success');
        },

        log(message, type = 'info') {
            if (!this.logContainer) return;
            const time = new Date().toLocaleTimeString();
            const entry = document.createElement('div');
            entry.className = `pta-log-entry pta-log-${type}`;
            entry.innerHTML = `<span class="pta-log-time">[${time}]</span><span class="pta-log-entry-content">${message}</span>`;
            this.logContainer.appendChild(entry);
            this.logContainer.scrollTop = this.logContainer.scrollHeight;
        },

        clearLogs() {
            if (this.logContainer) {
                this.logContainer.innerHTML = '';
            }
        },

        updateStatus(text, state = 'ready') {
            const statusText = this.container.querySelector('#pta-status-text');
            const statusDot = this.container.querySelector('.pta-status-dot');
            statusText.textContent = text;
            statusDot.className = 'pta-status-dot' + (state === 'error' ? ' error' : state === 'waiting' ? ' waiting' : '');
        },

        updateAutoStatus(running) {
            const statusEl = this.container.querySelector('#pta-auto-status');
            if (running) {
                statusEl.innerHTML = '<div class="pta-running-indicator">自动答题运行中</div>';
            } else {
                statusEl.innerHTML = '';
            }
        },

        updateQuestionType(type, text) {
            const typeEl = this.container.querySelector('#pta-question-type');
            const icons = {
                choice: '🔘',
                fill: '✏️',
                judge: '⚖️',
                program_fill: '🔲',
                function: '🔧',
                programming: '💻',
                unknown: '❓'
            };
            typeEl.innerHTML = `<span>${icons[type] || icons.unknown}</span><span>${text}</span>`;
        },

        updateQuestionPreview(text) {
            const preview = this.container.querySelector('#pta-question-preview');
            preview.textContent = text || '请打开题目页面...';
        },

        updateAnswerPreview(text) {
            const section = this.container.querySelector('#pta-answer-section');
            const preview = this.container.querySelector('#pta-answer-preview');
            section.style.display = 'block';
            preview.textContent = text;
        },

        setAnswerButtonEnabled(enabled) {
            this.container.querySelector('#pta-answer-btn').disabled = !enabled;
        },

        setAutoButtons(running) {
            this.container.querySelector('#pta-auto-start').disabled = running;
            this.container.querySelector('#pta-auto-stop').disabled = !running;
        },

        updateProgress(percent, text) {
            const progress = this.container.querySelector('#pta-progress');
            const fill = this.container.querySelector('#pta-progress-fill');
            const textEl = this.container.querySelector('#pta-progress-text');
            progress.style.display = 'block';
            fill.style.width = percent + '%';
            textEl.textContent = text || `${percent}%`;
        },

        hideProgress() {
            this.container.querySelector('#pta-progress').style.display = 'none';
        },

        showNotification(message, type = 'info') {
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                padding: 12px 24px;
                background: ${type === 'success' ? 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' : type === 'error' ? 'linear-gradient(135deg, #eb3349 0%, #f45c43 100%)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'};
                color: white;
                border-radius: 10px;
                font-size: 14px;
                font-weight: 500;
                z-index: 9999999;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                animation: slideDown 0.3s ease;
            `;
            notification.textContent = message;
            document.body.appendChild(notification);
            setTimeout(() => {
                notification.style.animation = 'slideUp 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }, 3000);
        }
    };

    // ==================== API 管理器 ====================
    const APIManager = {
        async chat(messages, onStream = null) {
            const config = Config.getAll();

            if (!config.baseURL || !config.apiKey) {
                throw new Error('API 配置不完整，请先配置 Base URL 和 API Key');
            }

            const url = config.baseURL.replace(/\/$/, '') + '/chat/completions';
            const body = {
                model: config.model,
                messages: messages,
                temperature: config.temperature,
                max_tokens: config.maxTokens,
                stream: !!onStream
            };

            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'POST',
                    url: url,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${config.apiKey}`
                    },
                    data: JSON.stringify(body),
                    onload: (response) => {
                        try {
                            // 首先检查 HTTP 状态码
                            if (response.status >= 400) {
                                const errorText = response.responseText || '';
                                reject(new Error(`HTTP ${response.status}: ${errorText.substring(0, 200)}`));
                                return;
                            }

                            const data = JSON.parse(response.responseText);

                            // 处理标准 OpenAI 错误格式
                            if (data.error) {
                                const errorMsg = data.error.message || data.error.code || JSON.stringify(data.error);
                                reject(new Error(`API 错误: ${errorMsg}`));
                                return;
                            }

                            // 处理正常响应
                            if (data.choices && data.choices[0]) {
                                resolve(data.choices[0].message.content);
                                return;
                            }

                            // 未知格式
                            reject(new Error(`未知的响应格式: ${JSON.stringify(data).substring(0, 300)}`));
                        } catch (e) {
                            // JSON 解析失败
                            const text = response.responseText || '';
                            if (text.includes('not authorized') || text.includes('unauthorized') || text.includes('invalid')) {
                                reject(new Error(`授权失败: ${text.substring(0, 200)}`));
                            } else {
                                reject(new Error(`解析响应失败: ${e.message}, 原始响应: ${text.substring(0, 200)}`));
                            }
                        }
                    },
                    onerror: (response) => {
                        reject(new Error(`网络请求失败: ${response.statusText || '未知错误'} (状态码: ${response.status || 'N/A'})`));
                    },
                    ontimeout: () => reject(new Error('请求超时，请检查网络连接')),
                    onabort: () => reject(new Error('请求被中止'))
                });
            });
        },

        async fetchModels(baseUrl, apiKey) {
            const url = baseUrl.replace(/\/$/, '') + '/models';

            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: url,
                    headers: {
                        'Authorization': `Bearer ${apiKey}`
                    },
                    onload: (response) => {
                        try {
                            // 首先检查 HTTP 状态码
                            if (response.status >= 400) {
                                const errorText = response.responseText || '';
                                reject(new Error(`HTTP ${response.status}: ${errorText.substring(0, 200)}`));
                                return;
                            }

                            const data = JSON.parse(response.responseText);

                            // 处理标准 OpenAI 错误格式
                            if (data.error) {
                                const errorMsg = data.error.message || data.error.code || JSON.stringify(data.error);
                                reject(new Error(`API 错误: ${errorMsg}`));
                                return;
                            }

                            // 处理硅基流动格式: { object: "list", data: [...] }
                            if (data.data && Array.isArray(data.data)) {
                                resolve(data.data.map(m => ({
                                    id: m.id,
                                    name: m.id.split('/').pop() || m.id
                                })));
                                return;
                            }

                            // 处理直接返回数组的情况
                            if (Array.isArray(data)) {
                                resolve(data.map(m => ({
                                    id: m.id,
                                    name: m.id.split('/').pop() || m.id
                                })));
                                return;
                            }

                            // 未知格式，输出调试信息
                            reject(new Error(`未知的响应格式: ${JSON.stringify(data).substring(0, 300)}`));
                        } catch (e) {
                            // JSON 解析失败，可能是纯文本错误
                            const text = response.responseText || '';
                            if (text.includes('not authorized') || text.includes('unauthorized') || text.includes('invalid')) {
                                reject(new Error(`授权失败: ${text.substring(0, 200)}`));
                            } else {
                                reject(new Error(`解析响应失败: ${e.message}, 原始响应: ${text.substring(0, 200)}`));
                            }
                        }
                    },
                    onerror: (response) => {
                        reject(new Error(`网络请求失败: ${response.statusText || '未知错误'} (状态码: ${response.status || 'N/A'})`));
                    },
                    ontimeout: () => reject(new Error('请求超时，请检查网络连接')),
                    onabort: () => reject(new Error('请求被中止'))
                });
            });
        }
    };

    // ==================== 题目分析器 ====================
    const QuestionAnalyzer = {
        currentQuestion: null,

        analyze() {
            UIManager.log('正在分析页面...', 'info');
            UIManager.updateStatus('分析中...', 'waiting');

            const question = this.extractQuestion();
            if (!question) {
                UIManager.log('未检测到题目，请确保你在题目页面', 'error');
                UIManager.updateStatus('未检测到题目', 'error');
                return null;
            }

            this.currentQuestion = question;
            UIManager.updateQuestionType(question.type, question.typeName);
            UIManager.updateQuestionPreview(question.title + '\n\n' + question.content.substring(0, 500) + '...');
            UIManager.setAnswerButtonEnabled(true);
            UIManager.log(`检测到${question.typeName}`, 'info');
            UIManager.updateStatus('题目分析完成', 'ready');

            return question;
        },

        extractQuestion() {
            const selectors = {
                title: [
                    '.problem-title',
                    '.question-title',
                    'h1.problem-name',
                    '.problem-header h1',
                    '[data-testid="problem-title"]',
                    '.title'
                ],
                content: [
                    '.problem-content',
                    '.question-content',
                    '.problem-description',
                    '.content',
                    '[data-testid="problem-content"]',
                    '.markdown-body',
                    '.rendered-markdown'
                ],
                options: [
                    '.option-item',
                    '.choice-option',
                    '.problem-option',
                    '[data-testid="option"]',
                    '.option'
                ],
                codeEditor: [
                    '.monaco-editor',
                    '.code-editor',
                    '.ace_editor',
                    'textarea[name="code"]',
                    '[data-testid="code-editor"]'
                ],
                fillInputs: [
                    '.fill-blank-input',
                    '.blank-input',
                    'input[type="text"].blank',
                    '[data-testid="fill-input"]'
                ]
            };

            let title = '';
            for (const selector of selectors.title) {
                const el = document.querySelector(selector);
                if (el) {
                    title = el.textContent.trim();
                    break;
                }
            }

            let content = '';
            for (const selector of selectors.content) {
                const el = document.querySelector(selector);
                if (el) {
                    content = el.textContent.trim();
                    break;
                }
            }

            if (!title && !content) {
                const url = window.location.href;
                if (url.includes('/problems/')) {
                    const mainContent = document.querySelector('main, .main, .content, #content');
                    if (mainContent) {
                        content = mainContent.textContent.trim().substring(0, 2000);
                    }
                }
            }

            if (!title && !content) {
                return null;
            }

            const typeInfo = this.detectType(selectors);

            return {
                title: title || '未命名题目',
                content: content,
                type: typeInfo.type,
                typeName: typeInfo.name,
                options: typeInfo.options,
                inputs: typeInfo.inputs,
                codeLanguage: this.detectLanguage()
            };
        },

        detectType(selectors) {
            const url = window.location.href;

            if (url.includes('/type/1') || url.includes('choice')) {
                return { type: 'choice', name: '选择题', options: this.getOptions(selectors.options) };
            }
            if (url.includes('/type/2') || url.includes('judge')) {
                return { type: 'judge', name: '判断题', options: [{value: 'T', text: '正确'}, {value: 'F', text: '错误'}] };
            }
            if (url.includes('/type/3') || url.includes('fill')) {
                return { type: 'fill', name: '填空题', inputs: this.getFillInputs(selectors.fillInputs) };
            }
            if (url.includes('/type/4') || url.includes('program-fill')) {
                return { type: 'program_fill', name: '程序填空题', inputs: this.getFillInputs(selectors.fillInputs) };
            }
            if (url.includes('/type/6') || url.includes('function')) {
                return { type: 'function', name: '函数题' };
            }
            if (url.includes('/type/7') || url.includes('programming')) {
                return { type: 'programming', name: '编程题' };
            }

            const options = this.getOptions(selectors.options);
            if (options.length > 0) {
                if (options.length === 2) {
                    const texts = options.map(o => o.text.toLowerCase());
                    if ((texts.includes('正确') && texts.includes('错误')) ||
                        (texts.includes('true') && texts.includes('false')) ||
                        (texts.includes('对') && texts.includes('错'))) {
                        return { type: 'judge', name: '判断题', options };
                    }
                }
                return { type: 'choice', name: '选择题', options };
            }

            const fillInputs = this.getFillInputs(selectors.fillInputs);
            if (fillInputs.length > 0) {
                const codeEditor = document.querySelector(selectors.codeEditor.join(', '));
                if (codeEditor) {
                    return { type: 'program_fill', name: '程序填空题', inputs: fillInputs };
                }
                return { type: 'fill', name: '填空题', inputs: fillInputs };
            }

            const codeEditor = document.querySelector(selectors.codeEditor.join(', '));
            if (codeEditor) {
                if (document.textContent.includes('函数') || document.textContent.includes('function')) {
                    return { type: 'function', name: '函数题' };
                }
                return { type: 'programming', name: '编程题' };
            }

            return { type: 'unknown', name: '未知题型' };
        },

        getOptions(selectors) {
            for (const selector of selectors) {
                const elements = document.querySelectorAll(selector);
                if (elements.length > 0) {
                    return Array.from(elements).map((el, i) => ({
                        value: String.fromCharCode(65 + i),
                        text: el.textContent.trim()
                    }));
                }
            }
            return [];
        },

        getFillInputs(selectors) {
            // 扩展选择器列表
            const extendedSelectors = [
                ...selectors,
                '.ant-input',
                'input[type="text"]',
                '.blank-field input',
                '.problem-blank input',
                '[class*="blank"] input'
            ];

            for (const selector of extendedSelectors) {
                try {
                    const elements = document.querySelectorAll(selector);
                    if (elements.length > 0) {
                        // 过滤掉搜索框等非答案输入框
                        const filtered = Array.from(elements).filter(el => {
                            const placeholder = (el.placeholder || '').toLowerCase();
                            const name = (el.name || '').toLowerCase();
                            return !placeholder.includes('搜索') &&
                                   !placeholder.includes('search') &&
                                   !name.includes('search') &&
                                   el.offsetParent !== null;
                        });

                        if (filtered.length > 0) {
                            return filtered.map((el, i) => ({
                                index: i,
                                element: el
                            }));
                        }
                    }
                } catch (e) {
                    // 某些选择器可能不支持，忽略错误
                }
            }
            return [];
        },

        detectLanguage() {
            // 1. 尝试从 PTA 的语言选择下拉框中精准提取真实选择的语言
            try {
                // 查找包含语言名称的节点，避开动态 hash 类名
                const langElements = document.querySelectorAll('.select__single-value .pc-text-raw, [class*="singleValue"] .pc-text-raw');

                for (const el of langElements) {
                    const rawText = el.textContent.trim();
                    const text = rawText.toLowerCase();

                    if (text) {
                        UIManager.log(`精准捕获到当前语言: ${rawText}`, 'info');
                        if (text.includes('python')) return 'Python';
                        if (text.includes('java') && !text.includes('javascript')) return 'Java';
                        if (text.includes('c++') || text.includes('cpp')) return 'C++';
                        if (text.includes('c#') || text.includes('csharp')) return 'C#';
                        if (text === 'c' || text.startsWith('c ')) return 'C';
                        if (text.includes('go')) return 'Go';

                        // 如果都没有命中预设，剥离括号提取主语言名称（例如将 "Python (python3)" 变成 "Python"）
                        return rawText.split(' ')[0];
                    }
                }
            } catch (e) {
                UIManager.log('精准提取语言失败，回退到粗略猜测模式', 'warn');
            }

            // 2. 回退到页面文本粗略猜测
            const text = document.body.textContent.toLowerCase();
            if (text.includes('c++') || text.includes('cpp')) return 'C++';
            if (text.includes('python') || text.includes('py')) return 'Python';
            if (text.includes('java') && !text.includes('javascript')) return 'Java';
            if (text.includes('c语言') || text.includes('c ')) return 'C';

            return 'C++'; // 默认兜底值
        },

        getCurrentQuestion() {
            return this.currentQuestion;
        }
    };

    // ==================== 答题管理器 ====================
    const AnswerManager = {
        currentAnswer: null,

        forceReactSync(element, value) {
            // 1. 获取原生 setter
            const proto = element.tagName.toLowerCase() === 'textarea' ?
                  window.HTMLTextAreaElement.prototype :
            window.HTMLInputElement.prototype;

            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;

            // 2. 聚焦元素
            element.focus();

            // 3. 强制写入值
            if (nativeInputValueSetter) {
                nativeInputValueSetter.call(element, value);
            } else {
                element.value = value;
            }

            // 4. 派发核心事件，让 React/Vue 监听到变化
            element.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
            element.dispatchEvent(new Event('change', { bubbles: true, composed: true }));

            // 5. 关键：强制失焦以触发 PTA 系统的自动保存和状态确认
            element.blur();
            element.dispatchEvent(new Event('focusout', { bubbles: true, composed: true }));
        },

        async generateAnswer() {
            const question = QuestionAnalyzer.getCurrentQuestion();
            if (!question) {
                UIManager.log('请先分析题目', 'error');
                return null;
            }

            UIManager.updateStatus('正在生成答案...', 'waiting');
            UIManager.updateProgress(10, '准备请求...');

            try {
                const prompt = this.buildPrompt(question);
                UIManager.updateProgress(30, '发送请求...');

                const messages = [
                    { role: 'system', content: this.getSystemPrompt(question.type) },
                    { role: 'user', content: prompt }
                ];

                UIManager.log('正在请求 AI...', 'info');
                const answer = await APIManager.chat(messages);

                UIManager.updateProgress(80, '解析答案...');
                this.currentAnswer = this.parseAnswer(answer, question.type);

                UIManager.updateAnswerPreview(this.formatAnswerForDisplay(this.currentAnswer, question.type));
                UIManager.updateProgress(100, '完成');
                UIManager.log('答案生成成功', 'info');
                UIManager.updateStatus('答案已生成', 'ready');

                setTimeout(() => UIManager.hideProgress(), 1000);
                return this.currentAnswer;
            } catch (error) {
                UIManager.log('生成答案失败: ' + error.message, 'error');
                UIManager.updateStatus('生成失败: ' + error.message, 'error');
                UIManager.hideProgress();
                return null;
            }
        },

        async generateAndFillAnswer() {
            // 先生成答案
            const answer = await this.generateAnswer();
            if (!answer) {
                return null;
            }

            // 获取配置
            const config = Config.getAll();

            // 如果开启了自动提交，则填入答案
            if (config.autoSubmit) {
                const delay = config.delay || 1000;
                UIManager.log(`等待 ${delay}ms 后填入答案...`, 'info');
                await this.wait(delay);
                await this.fillAnswer();
            } else {
                UIManager.log('自动提交已关闭，请手动点击填入答案', 'info');
            }

            return answer;
        },

        wait(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        },

        buildPrompt(question) {
            let prompt = `题目：${question.title}\n\n`;
            prompt += `内容：\n${question.content}\n\n`;
            prompt += `编程语言：${question.codeLanguage}\n\n`;

            if (question.options && question.options.length > 0) {
                prompt += '选项：\n';
                question.options.forEach(opt => {
                    prompt += `${opt.value}. ${opt.text}\n`;
                });
                prompt += '\n';
            }

            if (question.inputs && question.inputs.length > 0) {
                prompt += `填空数量：${question.inputs.length}个\n\n`;
            }

            prompt += this.getAnswerFormatPrompt(question.type);
            return prompt;
        },

        getSystemPrompt(type) {
            const prompts = {
                choice: '你是一个专业的程序设计考试助手。请分析选择题并给出正确答案。只输出选项字母（如 A、B、C、D），不要解释。',
                judge: '你是一个专业的程序设计考试助手。请分析判断题并给出正确答案。只输出 T（正确）或 F（错误），不要解释。',
                fill: '你是一个专业的程序设计考试助手。请分析填空题并给出正确答案。按顺序输出每个空的答案，用 | 分隔。',
                program_fill: '你是一个专业的程序设计考试助手。请分析程序填空题并给出正确的代码片段。按顺序输出每个空的代码，用 | 分隔。',
                function: '你是一个专业的程序设计考试助手。请根据题目要求编写完整的函数代码。只输出函数代码，包含必要的头文件和辅助函数。',
                programming: '你是一个专业的程序设计考试助手。请根据题目要求编写完整的程序代码。输出完整的可运行代码，包含必要的头文件和主函数。',
                unknown: '你是一个专业的程序设计考试助手。请分析题目并给出最佳答案。'
            };
            return prompts[type] || prompts.unknown;
        },

        getAnswerFormatPrompt(type) {
            const formats = {
                choice: '请直接输出正确选项的字母（如：A）。',
                judge: '请直接输出 T 或 F。',
                fill: '请按顺序输出每个空的答案，用 | 分隔（如：答案1|答案2|答案3）。',
                program_fill: '请按顺序输出每个空的代码片段，用 | 分隔。每个片段应该是完整的代码表达式。',
                function: '请输出完整的函数实现代码，包含必要的头文件。代码应该能够直接编译运行。',
                programming: '请输出完整的程序代码，包含必要的头文件和主函数。代码应该能够直接编译运行。',
                unknown: '请给出你的答案。'
            };
            return formats[type] || formats.unknown;
        },

        parseAnswer(answer, type) {
            answer = answer.trim();

            switch (type) {
                case 'choice':
                    const match = answer.match(/[A-D]/i);
                    return match ? match[0].toUpperCase() : answer;

                case 'judge':
                    if (answer.includes('T') || answer.includes('正确') || answer.includes('对') || answer.includes('True')) {
                        return 'T';
                    }
                    return 'F';

                case 'fill':
                case 'program_fill':
                    return answer.split('|').map(s => s.trim()).filter(s => s);

                case 'function':
                case 'programming':
                    const codeMatch = answer.match(/```[\w]*\n?([\s\S]*?)```/);
                    if (codeMatch) {
                        return codeMatch[1].trim();
                    }
                    return answer;

                default:
                    return answer;
            }
        },

        formatAnswerForDisplay(answer, type) {
            if (Array.isArray(answer)) {
                return answer.map((a, i) => `[${i + 1}] ${a}`).join('\n');
            }
            return answer;
        },

        async fillAnswer() {
            const question = QuestionAnalyzer.getCurrentQuestion();
            const answer = this.currentAnswer;

            if (!answer) {
                UIManager.log('请先生成答案', 'error');
                return false;
            }

            UIManager.updateStatus('正在填入答案...', 'waiting');

            try {
                switch (question.type) {
                    case 'choice':
                        await this.fillChoice(answer, question.options);
                        break;
                    case 'judge':
                        await this.fillJudge(answer);
                        break;
                    case 'fill':
                        await this.fillFill(answer, question.inputs);
                        break;
                    case 'program_fill':
                        await this.fillProgramFill(answer, question.inputs);
                        break;
                    case 'function':
                    case 'programming':
                        await this.fillCode(answer);
                        break;
                }

                UIManager.log('答案已填入', 'info');
                UIManager.updateStatus('答案填入完成', 'ready');
                return true;
            } catch (error) {
                UIManager.log('填入答案失败: ' + error.message, 'error');
                UIManager.updateStatus('填入失败', 'error');
                return false;
            }
        },

        async fillChoice(answer, options) {
            const optionIndex = answer.charCodeAt(0) - 65;
            const optionLetter = answer.toUpperCase();

            UIManager.log(`正在选择选项 ${optionLetter}...`, 'info');

            // 多种选择器尝试点击
            const selectors = [
                // 通过 data-value 或 data-option 属性
                `[data-value="${optionLetter}"]`,
                `[data-option="${optionLetter}"]`,
                `[data-answer="${optionLetter}"]`,
                // 通过 nth-child
                `.option-item:nth-child(${optionIndex + 1})`,
                `.choice-option:nth-child(${optionIndex + 1})`,
                `.option:nth-child(${optionIndex + 1})`,
                `.radio-item:nth-child(${optionIndex + 1})`,
                `.ant-radio-wrapper:nth-child(${optionIndex + 1})`,
                // 通过 label 包含选项字母
                `label:has(input[value="${optionLetter}"])`,
                `label:has(input[data-value="${optionLetter}"])`,
                // PTA 特定选择器
                '.problem-option',
                '[class*="option"]',
                '[class*="Option"]'
            ];

            for (const selector of selectors) {
                try {
                    const el = document.querySelector(selector);
                    if (el) {
                        el.click();
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        UIManager.log(`已选择选项 ${optionLetter}`, 'info');
                        return;
                    }
                } catch (e) {
                    // 某些选择器可能不支持，忽略错误继续尝试
                }
            }

            // 尝试查找所有选项元素并点击对应索引
            const allOptions = document.querySelectorAll(
                '.option-item, .choice-option, .option, .radio-item, .ant-radio-wrapper, ' +
                '[class*="radio"], [class*="Radio"], input[type="radio"]'
            );

            if (allOptions[optionIndex]) {
                const target = allOptions[optionIndex];
                // 如果是 radio input，点击其 label 或父元素
                if (target.type === 'radio') {
                    const label = target.closest('label') || target.parentElement;
                    if (label) {
                        label.click();
                    } else {
                        target.click();
                    }
                } else {
                    target.click();
                }
                target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                UIManager.log(`已选择选项 ${optionLetter}`, 'info');
                return;
            }

            UIManager.log(`未找到选项 ${optionLetter}，请手动选择`, 'warn');
        },

        async fillJudge(answer) {
            const isTrue = answer === 'T';
            const answerText = isTrue ? '正确' : '错误';

            UIManager.log(`正在选择"${answerText}"...`, 'info');

            // 多种选择器尝试
            const trueSelectors = [
                '[data-value="T"]',
                '[data-value="true"]',
                '[data-answer="T"]',
                '.judge-true',
                '.judge-correct',
                '.option:first-child',
                'input[value="T"]',
                'input[value="true"]',
                'label:contains("正确")',
                'label:contains("True")',
                'label:contains("对")'
            ];

            const falseSelectors = [
                '[data-value="F"]',
                '[data-value="false"]',
                '[data-answer="F"]',
                '.judge-false',
                '.judge-wrong',
                '.option:last-child',
                'input[value="F"]',
                'input[value="false"]',
                'label:contains("错误")',
                'label:contains("False")',
                'label:contains("错")'
            ];

            const selectors = isTrue ? trueSelectors : falseSelectors;

            for (const selector of selectors) {
                try {
                    const el = document.querySelector(selector);
                    if (el) {
                        // 如果是 radio input，点击其 label 或父元素
                        if (el.type === 'radio') {
                            const label = el.closest('label') || el.parentElement;
                            if (label) {
                                label.click();
                            } else {
                                el.click();
                            }
                        } else {
                            el.click();
                        }
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        UIManager.log(`已选择"${answerText}"`, 'info');
                        return;
                    }
                } catch (e) {
                    // 某些选择器可能不支持，忽略错误继续尝试
                }
            }

            // 尝试通过文本内容查找
            const allLabels = document.querySelectorAll('label, .option, .radio-item, .ant-radio-wrapper');
            for (const label of allLabels) {
                const text = label.textContent.trim();
                if (isTrue) {
                    if (text === '正确' || text === 'True' || text === 'true' || text === '对' || text === 'T') {
                        label.click();
                        label.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        UIManager.log(`已选择"${answerText}"`, 'info');
                        return;
                    }
                } else {
                    if (text === '错误' || text === 'False' || text === 'false' || text === '错' || text === 'F') {
                        label.click();
                        label.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        UIManager.log(`已选择"${answerText}"`, 'info');
                        return;
                    }
                }
            }

            UIManager.log(`未找到"${answerText}"选项，请手动选择`, 'warn');
        },

        async fillFill(answers, inputs) {
            UIManager.log(`正在填入 ${answers.length} 个答案...`, 'info');

            // 多种填空输入框选择器
            const selectors = [
                '.fill-blank-input',
                '.blank-input',
                'input[type="text"].blank',
                '[data-testid="fill-input"]',
                '.ant-input',
                'input[placeholder*="答案"]',
                'input[placeholder*="填空"]',
                // PTA 特定
                '.problem-blank input',
                '.blank-field input',
                '[class*="blank"] input',
                'input.blank'
            ];

            let inputElements = [];

            if (inputs && inputs.length > 0) {
                // 使用分析时找到的输入元素
                inputElements = inputs.map(i => i.element).filter(Boolean);
            } else {
                // 尝试查找所有可能的输入框
                for (const selector of selectors) {
                    const elements = document.querySelectorAll(selector);
                    if (elements.length > 0) {
                        inputElements = Array.from(elements);
                        break;
                    }
                }
            }

            if (inputElements.length === 0) {
                // 最后尝试查找所有文本输入框（排除搜索框等）
                const allInputs = document.querySelectorAll('input[type="text"], input:not([type])');
                inputElements = Array.from(allInputs).filter(input => {
                    // 排除明显的非答案输入框
                    const placeholder = (input.placeholder || '').toLowerCase();
                    const name = (input.name || '').toLowerCase();
                    return !placeholder.includes('搜索') &&
                           !placeholder.includes('search') &&
                           !name.includes('search') &&
                           input.offsetParent !== null; // 可见元素
                });
            }

            let filledCount = 0;
            for (let i = 0; i < Math.min(answers.length, inputElements.length); i++) {
                const input = inputElements[i];
                const answer = answers[i];

                if (input && answer) {
                    // 1. 滚动到视图并强制获取焦点
                    input.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    input.focus();

                    // 2. 选中当前输入框里的所有内容
                    input.select();

                    // 3. 模拟用户的物理打字操作
                    const inserted = document.execCommand('insertText', false, answer);

                    // 4. 回退到完善版的底层注入
                    if (!inserted) {
                        // 动态判断是 input 还是 textarea
                        const proto = input.tagName.toLowerCase() === 'textarea' ?
                            window.HTMLTextAreaElement.prototype :
                            window.HTMLInputElement.prototype;

                        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;

                        if (nativeInputValueSetter) {
                            nativeInputValueSetter.call(input, answer);
                        } else {
                            input.value = answer;
                        }

                        // 只派发最核心的 input 事件，去掉 blur，防止过早触发框架的失焦校验                        input.dispatchEvent(new Event('input', { bubbles: true }));
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                        input.blur();
                        input.dispatchEvent(new Event('focusout', { bubbles: true }));
                    }

                    filledCount++;
                }
            }

            UIManager.log(`已填入 ${filledCount}/${answers.length} 个答案`, 'info');

            if (filledCount === 0) {
                UIManager.log('未找到填空输入框，请手动填入', 'warn');
            }
        },

        async fillProgramFill(answers, inputs) {
            await this.fillFill(answers, inputs);
        },

        async fillCode(code) {
            UIManager.log('正在填入代码...', 'info');

            // 1. Monaco Editor (VS Code 编辑器)
            const monacoEditor = document.querySelector('.monaco-editor');
            if (monacoEditor) {
                try {
                    const monacoInstance = unsafeWindow.monaco;
                    if (monacoInstance && monacoInstance.editor) {
                        const editors = monacoInstance.editor.getEditors();
                        if (editors.length > 0) {
                            editors[0].setValue(code);
                            UIManager.log('代码已填入 Monaco 编辑器', 'info');
                            return;
                        }
                    }
                } catch (e) {
                    UIManager.log('Monaco 编辑器操作失败: ' + e.message, 'warn');
                }
            }

            // 2. ACE Editor
            const aceEditor = document.querySelector('.ace_editor');
            if (aceEditor && unsafeWindow.ace) {
                try {
                    const editor = unsafeWindow.ace.edit(aceEditor);
                    if (editor && editor.setValue) {
                        editor.setValue(code, -1); // -1 表示移动到开头
                        UIManager.log('代码已填入 ACE 编辑器', 'info');
                        return;
                    }
                } catch (e) {
                    UIManager.log('ACE 编辑器操作失败: ' + e.message, 'warn');
                }
            }
            // 3. CodeMirror (兼容旧版 CM5 和 PTA 新版 CM6)
            // 扩大选择范围，捕获外层容易挂载 React Fiber 的容器
            const cm6Container = document.querySelector('.codeEditor_CHvdZ') || document.querySelector('.cm-editor');
            const cmContent = document.querySelector('.cm-scroller .cm-content[contenteditable="true"]');
            const cm5Editor = document.querySelector('.CodeMirror');

            if (cm6Container && cmContent) {
                try {
                    let injected = false;

                    // 利用 React Fiber 树直接改写内部状态
                    let currentNode = cmContent;
                    let fiberKey = null;
                    // 向上遍历 DOM 树，寻找挂载了 React Fiber 实例的节点
                    while (currentNode && currentNode !== document.body) {
                        fiberKey = Object.keys(currentNode).find(k => k.startsWith('__reactFiber$'));
                        if (fiberKey) break;
                        currentNode = currentNode.parentElement;
                    }

                    if (fiberKey && currentNode) {
                        let fiber = currentNode[fiberKey];
                        // 向上遍历 Fiber 树，寻找掌管代码编辑器的核心组件
                        while (fiber) {
                            if (fiber.memoizedProps && typeof fiber.memoizedProps.onChange === 'function') {
                                // 直接调用组件底层的 onChange 钩子，强行写入代码，无视一切防注入拦截
                                fiber.memoizedProps.onChange(code);
                                injected = true;
                                UIManager.log('已通过 React Fiber 钩子强制同步底层状态', 'info');
                                break;
                            }
                            fiber = fiber.return;
                        }
                    }

                    cmContent.focus();
                    const selection = window.getSelection();
                    const range = document.createRange();
                    range.selectNodeContents(cmContent);
                    selection.removeAllRanges();
                    selection.addRange(range);

                    document.execCommand('insertText', false, code);

                    // 派发基础输入事件
                    cmContent.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
                    cmContent.dispatchEvent(new Event('change', { bubbles: true, composed: true }));

                    // 清理现场并失焦
                    selection.removeAllRanges();
                    cmContent.blur();

                    UIManager.log('代码填入与状态同步完毕', 'info');
                    return;
                } catch (e) {
                    UIManager.log('CodeMirror 6 高级注入异常: ' + e.message, 'warn');
                }
            } else if (cm5Editor && typeof unsafeWindow !== 'undefined' && unsafeWindow.CodeMirror) {
                try {
                    const cm = cm5Editor.CodeMirror;
                    if (cm && cm.setValue) {
                        cm.setValue(code);
                        UIManager.log('代码已填入 CodeMirror 5 编辑器', 'info');
                        return;
                    }
                } catch (e) {
                    UIManager.log('CodeMirror 5 编辑器操作失败: ' + e.message, 'warn');
                }
            }

            // 4. 查找 textarea 代码编辑器
            const textareaSelectors = [
                'textarea[name="code"]',
                '.code-editor textarea',
                'textarea.code',
                '#code-editor textarea',
                '[data-testid="code-editor"] textarea',
                'textarea[placeholder*="代码"]',
                'textarea[placeholder*="code"]'
            ];

            for (const selector of textareaSelectors) {
                const textarea = document.querySelector(selector);
                if (textarea) {
                    this.forceReactSync(textarea, code);
                    UIManager.log('代码已填入 textarea', 'info');
                    return;
                }
            }

            // 5. contenteditable 编辑器
            const editableSelectors = [
                '[contenteditable="true"]',
                '.code-editor [contenteditable]',
                '[data-testid="code-editor"] [contenteditable]'
            ];

            for (const selector of editableSelectors) {
                const editable = document.querySelector(selector);
                if (editable) {
                    editable.textContent = code;
                    editable.dispatchEvent(new Event('input', { bubbles: true }));
                    editable.focus();
                    UIManager.log('代码已填入 contenteditable', 'info');
                    return;
                }
            }

            // 6. 查找 iframe 中的编辑器
            const iframes = document.querySelectorAll('iframe');
            for (const iframe of iframes) {
                try {
                    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                    const textarea = iframeDoc.querySelector('textarea');
                    if (textarea) {
                        textarea.value = code;
                        textarea.dispatchEvent(new Event('input', { bubbles: true }));
                        UIManager.log('代码已填入 iframe 中的编辑器', 'info');
                        return;
                    }
                } catch (e) {
                    // 跨域 iframe 无法访问，忽略
                }
            }

            UIManager.log('未找到代码编辑器，请手动粘贴代码', 'error');
            throw new Error('未找到代码编辑器');
        }
    };

    // ==================== 自动答题管理器 ====================
    const AutoAnswerManager = {
        isRunning: false,
        shouldStop: false,

        async start() {
            if (this.isRunning) return;

            const config = Config.getAll();
            if (!config.baseURL || !config.apiKey || !config.model) {
                UIManager.log('请先完成 API 配置', 'error');
                UIManager.showNotification('请先完成 API 配置', 'error');
                return;
            }

            this.isRunning = true;
            this.shouldStop = false;
            UIManager.setAutoButtons(true);
            UIManager.updateAutoStatus(true);
            UIManager.log('开始自动答题...', 'info');

            while (this.isRunning && !this.shouldStop) {
                try {
                    // 1. 分析题目
                    UIManager.log('正在分析当前题目...', 'info');
                    const question = QuestionAnalyzer.analyze();
                    if (!question) {
                        UIManager.log('未检测到题目，停止自动答题', 'warn');
                        break;
                    }

                    // 2. 生成答案
                    UIManager.log('正在生成答案...', 'info');
                    const answer = await AnswerManager.generateAnswer();
                    let success = false;

                    if (answer) {
                        await this.wait(config.delay);

                        // 3. 填入答案
                        UIManager.log('正在填入答案...', 'info');
                        const filled = await AnswerManager.fillAnswer();

                        if (filled) {
                            success = true;
                            // 4. 提交答案
                            if (config.autoSubmit) {
                                await this.wait(config.submitDelay);
                                UIManager.log('正在提交当前答案...', 'info');
                                await this.submitOnly();
                            } else {
                                UIManager.log('自动提交已关闭，已跳过提交步骤。', 'info');
                            }
                        } else {
                            UIManager.log('填入答案失败，将尝试直接跳过本题', 'error');
                        }
                    } else {
                        UIManager.log('生成答案失败，将尝试直接跳过本题', 'error');
                    }

                    // 5. 跳转下一题
                    if (config.autoNext) {
                        UIManager.log('准备跳转下一题...', 'info');
                        const hasNext = await this.nextOnly();
                        if (!hasNext) {
                            UIManager.log('未找到下一题，自动答题完成！', 'info');
                            UIManager.showNotification('自动答题完成！', 'success');
                            break;
                        }
                        // 等待新页面加载
                        await this.wait(2000);
                    } else {
                        UIManager.log('自动跳转下一题已关闭，流程结束。', 'info');
                        break; // 只要不自动跳转，单次任务结束，中止循环
                    }

                } catch (error) {
                    UIManager.log('自动答题异常: ' + error.message, 'error');
                    // 发生严重异常时，放弃 continue，尝试强制跳转下一题以逃离死循环点
                    const currentConfig = Config.getAll();
                    if (currentConfig.autoNext) {
                        UIManager.log('尝试跳过报错题目...', 'info');
                        const hasNext = await this.nextOnly();
                        if (!hasNext) break;
                        await this.wait(2000);
                    } else {
                        break;
                    }
                }
            }

            this.stop();
        },

        stop() {
            this.isRunning = false;
            this.shouldStop = true;
            UIManager.setAutoButtons(false);
            UIManager.updateAutoStatus(false);
            UIManager.log('自动答题已停止', 'info');
        },

        async submitOnly() {
            let submitBtn = null;

            // 1. 查找所有可能的按钮容器
            const allButtons = document.querySelectorAll('button, [role="button"], .pc-button');
            for (const btn of allButtons) {
                // 清洗文本：去除所有空格，方便匹配
                const text = (btn.textContent || '').replace(/\s+/g, '');
                // 恢复为 includes，完美匹配“提交本题作答”或“提交”
                if (text.includes('提交') || text.includes('Submit')) {
                    submitBtn = btn;
                    break;
                }
            }

            if (!submitBtn) {
                const textDivs = document.querySelectorAll('.pc-text-raw');
                for (const div of textDivs) {
                    if ((div.textContent || '').includes('提交')) {
                        // 如果它被包裹在 button 里就取它的父级 button，否则直接点这个 div
                        submitBtn = div.closest('button') || div;
                        break;
                    }
                }
            }

            if (submitBtn) {
                UIManager.log('精准锁定提交按钮，尝试执行点击...', 'info');

                // 确保元素可见
                submitBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                await this.wait(300);

                submitBtn.click();

                UIManager.log('已执行提交，等待服务器评测...', 'info');

                // 轮询等待评测结束
                let attempts = 0;
                while (attempts < 20) {
                    await this.wait(500);
                    const btnText = (submitBtn.textContent || '').replace(/\s+/g, '');
                    // 只要文本不包含进行时字眼，就视为结束
                    if (!btnText.includes('评测中') && !btnText.includes('等待')) {
                        UIManager.log('服务器处理完毕', 'info');
                        break;
                    }
                    attempts++;
                }
                await this.wait(1000);
                return true;
            } else {
                UIManager.log('严重错误：未能找到“提交本题作答”按钮！', 'error');
                return false;
            }
        },

        async nextOnly() {
            let nextBtn = null;

            const nextSelectors = [
                '.pc-button',
                '.next-problem',
                '.btn-next',
                '[data-testid="next-btn"]',
                '.problem-nav .next',
                '.pagination .next'
            ];

            for (const selector of nextSelectors) {
                const elements = document.querySelectorAll(selector);
                for (const el of elements) {
                    const text = (el.textContent || '').replace(/\s+/g, '');
                    if (text.includes('下一题') || text.includes('Next')) {
                        nextBtn = el;
                        break;
                    }
                }
                if (nextBtn) break;
            }

            if (!nextBtn) {
                const allClickables = document.querySelectorAll('button, a, [role="button"]');
                for (const el of allClickables) {
                    const text = (el.textContent || '').replace(/\s+/g, '');
                    if (text.includes('下一题') || text === 'Next') {
                        nextBtn = el;
                        break;
                    }
                }
            }

            if (nextBtn) {
                UIManager.log('锁定“下一题”按钮，准备跳转...', 'info');
                nextBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                await this.wait(300);
                nextBtn.click();
                return true;
            }

            // 侧边栏 URL 解析兜底方案
            const currentUrl = window.location.href;
            const problemMatch = currentUrl.match(/\/problems\/([^\/]+)/);
            if (problemMatch) {
                const problemLinks = Array.from(document.querySelectorAll('a[href*="/problems/"]'));
                const currentIndex = problemLinks.findIndex(a => a.href.includes(problemMatch[1]));
                if (currentIndex >= 0 && currentIndex < problemLinks.length - 1) {
                    const nextLink = problemLinks[currentIndex + 1];
                    if (nextLink) {
                        UIManager.log('从列表点击跳转下一题...', 'info');
                        nextLink.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        await this.wait(300);
                        nextLink.click();
                        return true;
                    }
                }
            }

            UIManager.log('已到达最后一题或未找到跳转入口', 'warn');
            return false;
        },

        wait(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
    };

    // ==================== 初始化 ====================
    function init() {
        try {
            const killerScript = document.createElement('script');
            killerScript.textContent = `
                // 1. 拦截所有后来尝试绑定的 beforeunload 事件
                const originalAdd = window.addEventListener;
                window.addEventListener = function(type, listener, options) {
                    if (type === 'beforeunload') return; // 直接把注册请求扔进黑洞
                    return originalAdd.call(this, type, listener, options);
                };

                // 2. 暴力锁死 onbeforeunload 属性，任何人都不准修改
                Object.defineProperty(window, 'onbeforeunload', {
                    configurable: false,
                    enumerable: true,
                    get: () => null,
                    set: () => {} // 设置为空函数，假装设置成功
                });

                // 3. 在捕获阶段（最高优先级）截杀已经偷偷绑定的事件
                window.addEventListener('beforeunload', function(e) {
                    e.stopImmediatePropagation(); // 处于真实上下文，这次一定能拦住！
                    // 注意：这里绝对不能写 e.preventDefault()，否则反而会触发浏览器的强制弹窗
                }, true);
            `;
            document.head.appendChild(killerScript);
        } catch (e) {
            console.warn('注入拦截脚本失败:', e);
        }
        // ===============================================

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => UIManager.init());
        } else {
            UIManager.init();
        }

        GM_registerMenuCommand('🤖 打开/关闭插件', () => UIManager.toggle());
        GM_registerMenuCommand('🔍 分析当前题目', () => QuestionAnalyzer.analyze());
        GM_registerMenuCommand('✨ 一键答题', () => AnswerManager.generateAnswer());
        GM_registerMenuCommand('▶️ 开始自动答题', () => AutoAnswerManager.start());
        GM_registerMenuCommand('⏹️ 停止自动答题', () => AutoAnswerManager.stop());

        console.log('%c[PTA智能答题助手] 已加载', 'color: #667eea; font-size: 14px; font-weight: bold;');
        console.log('%c快捷键: Ctrl+Shift+A 打开/关闭插件', 'color: #888;');
    }

    init();
})();