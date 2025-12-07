// web/hive.js - Supabase 控制层

import { app } from "/scripts/app.js";

import { initSupabase, loginGuest, fetchChannels, sendMessage, joinChannel, leaveChannel, fetchChannelMessages, getCurrentUser, subscribeChannelsPresence, unsubscribeChannelsPresence, refreshChannelPresence, extractWorkflowFromImage, isValidComfyUIWorkflow, updateUserProfile, generateRandomAvatar, clearUserProfileCache, setPresencePollingEnabled, searchInspiration, fetchInspirationCategories, fetchInspirationTags, likeInspirationItem, unlikeInspirationItem, favoriteInspirationItem, unfavoriteInspirationItem, checkPluginVersion, submitFeedback, getPluginConfig } from "./js/hive_data.js";
import { showToast, showConfirm, showNodeInstallGuide, showNodeInstallerGuide, showModelDownloaderGuide, createMessageElement, renderChannelList, updateOnlineCount, updateChannelOnlineCount, showLightbox, toggleView, setChannelTitle, createUploadToolbar, createFilePreview, renderGallery, setGalleryFilter, showVideoPlayer, showModelDetail, showEnhancedLightbox, waitForImages, loadWorkflowToComfyUI, playMessageSound, renderInspirationItems } from "./js/hive_ui.js";
import { initMissingItemsEnhancer } from "./js/hive_missing_items.js";
import "./js/hive_i18n.js";

// Supabase 配置常量 (请填写您的 Supabase URL 和 API Key)
const SUPABASE_URL = 'https://mgkcodofcjbuxpejdusf.supabase.co';  // 请填入您的 Supabase 项目 URL
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1na2NvZG9mY2pidXhwZWpkdXNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3ODI5MzMsImV4cCI6MjA4MDM1ODkzM30.KKTXgF8xg6CkfLmFYiEomtNmWJBZUPDeDzhpYTs9ST0';   // 请填入您的 Supabase 匿名密钥 (anon key)

// 插件版本号
const PLUGIN_VERSION = '1.0.1';

// 全局变量 - 按钮需要访问
let isInitialized = false; // 是否已初始化
let isForceUpdate = false; // 是否需要强制更新

// 辅助函数：获取翻译文本（移除所有硬编码中文，仅使用语言文件或英文回退）
function getText(key, fallbackEn = '') {
    if (typeof window !== 'undefined' && typeof window.t === 'function') {
        return window.t(key);
    }
    return fallbackEn || key;
}

// 检查配置
if (!SUPABASE_URL || !SUPABASE_KEY) {
    const configWarnText = typeof window !== 'undefined' && typeof window.t === 'function' 
        ? window.t('toast.configWarning') 
        : 'Please configure SUPABASE_URL and SUPABASE_KEY constants';
    console.warn('🐝 Hive: ' + configWarnText);
}

// DEBUG FUNCTIONS FOR TESTING
window.hiveDebug = {
    checkSidebar: () => {
        const sidebar = document.getElementById('hive-sidebar');
        return !!sidebar;
    },

    checkChannelList: () => {
        const channelList = document.getElementById('hive-channel-list');
        return !!channelList;
    },

    checkInitFunction: () => {
        return typeof window.initializeHive === 'function';
    },

    runManualInitialize: async () => {
        if (window.initializeHive) {
            try {
                await window.initializeHive();
            } catch (error) {
                console.error('🐝 Hive: Initialization failed:', error);
            }
        }
    }
};



app.registerExtension({
    name: "ComfyUI.Hive",
    async setup(app) {
        console.log("🐝 Hive Plugin: Setup started...");

        // 全局处理：确保侧边栏和弹层内的contextmenu和文字选择不被ComfyUI阻止（最早执行）
        // 在插件加载时立即注册，确保优先级最高
        document.addEventListener('contextmenu', function(e) {
            const sidebarEl = document.getElementById('hive-sidebar');
            const settingsModal = document.getElementById('hive-settings-modal');
            const nodeInstallerModal = document.getElementById('hive-node-installer-guide-modal');
            const modelDownloaderModal = document.getElementById('hive-model-downloader-guide-modal');
            const feedbackModal = document.getElementById('hive-feedback-modal');
            
            const isInPlugin = (sidebarEl && sidebarEl.contains(e.target)) ||
                              (settingsModal && settingsModal.contains(e.target)) ||
                              (nodeInstallerModal && nodeInstallerModal.contains(e.target)) ||
                              (modelDownloaderModal && modelDownloaderModal.contains(e.target)) ||
                              (feedbackModal && feedbackModal.contains(e.target));
            
            if (isInPlugin) {
                // 如果右键点击在插件内，阻止事件继续传播
                e.stopImmediatePropagation();
                // 不调用preventDefault，允许浏览器显示右键菜单
            }
        }, true); // capture阶段，最早执行，优先级最高

        // 处理文字选择事件，确保不被阻止
        document.addEventListener('selectstart', function(e) {
            const sidebarEl = document.getElementById('hive-sidebar');
            const settingsModal = document.getElementById('hive-settings-modal');
            const nodeInstallerModal = document.getElementById('hive-node-installer-guide-modal');
            const modelDownloaderModal = document.getElementById('hive-model-downloader-guide-modal');
            const feedbackModal = document.getElementById('hive-feedback-modal');
            
            const isInPlugin = (sidebarEl && sidebarEl.contains(e.target)) ||
                              (settingsModal && settingsModal.contains(e.target)) ||
                              (nodeInstallerModal && nodeInstallerModal.contains(e.target)) ||
                              (modelDownloaderModal && modelDownloaderModal.contains(e.target)) ||
                              (feedbackModal && feedbackModal.contains(e.target));
            
            if (isInPlugin) {
                // 允许文字选择，不阻止
                // 阻止事件传播，防止ComfyUI阻止选择
                e.stopImmediatePropagation();
            }
        }, true); // capture阶段

        // Load CSS
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "/extensions/ComfyUI-Hive/css/hive.css";
        document.head.appendChild(link);

        // 加载语言文件（必须先加载）
        if (!window.HIVE_I18N) {
            const i18nScript = document.createElement('script');
            i18nScript.src = '/extensions/ComfyUI-Hive/js/hive_i18n.js';
            i18nScript.async = false; // 同步加载以确保可用
            i18nScript.onload = () => {
                // 语言文件加载完成后，更新 UI 文本
                if (typeof window.hiveUpdateUITexts === 'function') {
                    window.hiveUpdateUITexts();
                }
            };
            document.head.appendChild(i18nScript);
        } else {
            // 语言文件已加载，立即更新 UI
            if (typeof window.hiveUpdateUITexts === 'function') {
                setTimeout(() => window.hiveUpdateUITexts(), 0);
            }
        }
        
        // 监听语言文件加载完成事件
        window.addEventListener('hiveI18nLoaded', () => {
            if (typeof window.hiveUpdateUITexts === 'function') {
                window.hiveUpdateUITexts();
            }
        });
        
        // 加载 Supabase 库（从本地文件）
        async function loadSupabaseLibrary() {
            return new Promise((resolve, reject) => {
                if (window.supabase && window.supabase.createClient) {
                    console.log("🐝 Hive: Supabase library already loaded");
                    resolve();
                    return;
                }

                // 使用本地文件路径（注意：WEB_DIRECTORY 指向 ./web，所以路径不包含 web/）
                const localLibPath = '/extensions/ComfyUI-Hive/lib/supabase-js@2.js';
                console.log('🐝 Hive: Loading Supabase library from local path:', localLibPath);

                // 检查是否已经加载过这个脚本
                const existingScript = document.querySelector(`script[src="${localLibPath}"]`);
                if (existingScript) {
                    // 脚本已存在，等待一段时间后检查
                    setTimeout(() => {
                        if (window.supabase && window.supabase.createClient) {
                            console.log("🐝 Hive: Supabase library already loaded from existing script");
                            resolve();
                        } else {
                            reject(new Error("Supabase library script exists but createClient not found"));
                        }
                    }, 500);
                    return;
                }

                const supabaseScript = document.createElement("script");
                supabaseScript.src = localLibPath;
                
                supabaseScript.onload = () => {
                    // 等待一小段时间确保库完全初始化
                    setTimeout(() => {
                        if (window.supabase && window.supabase.createClient) {
                            console.log("🐝 Hive: Supabase library loaded successfully from local path");
                            resolve();
                        } else {
                            console.error("🐝 Hive: Script loaded but createClient not found");
                            reject(new Error("Supabase library loaded but createClient not found"));
                        }
                    }, 100);
                };
                
                supabaseScript.onerror = () => {
                    console.error("🐝 Hive: Failed to load Supabase library from local path:", localLibPath);
                    reject(new Error(`Failed to load Supabase library from local path: ${localLibPath}. Please ensure the file exists.`));
                };
                
                document.head.appendChild(supabaseScript);
            });
        }

        // 加载 translate.js 库（从本地文件，用于消息翻译）
        async function loadTranslateLibrary() {
            return new Promise((resolve, reject) => {
                if (window.translate && window.translate.version) {
                    resolve();
                    return;
                }

                const localLibPath = '/extensions/ComfyUI-Hive/lib/translate.js';
                const existingScript = document.querySelector(`script[src="${localLibPath}"]`);
                if (existingScript) {
                    setTimeout(() => {
                        if (window.translate && window.translate.version) {
                            resolve();
                        } else {
                            reject(new Error('translate.js script exists but translate object not found'));
                        }
                    }, 500);
                    return;
                }

                const script = document.createElement('script');
                script.src = localLibPath;
                script.onload = () => {
                    setTimeout(() => {
                        if (window.translate && window.translate.version) {
                            resolve();
                        } else {
                            reject(new Error('translate.js loaded but translate object not found'));
                        }
                    }, 100);
                };
                script.onerror = () => {
                    console.error('🐝 Hive: Failed to load translate.js from local path:', localLibPath);
                    reject(new Error(`Failed to load translate.js from local path: ${localLibPath}. Please ensure the file exists.`));
                };
                document.head.appendChild(script);
            });
        }

        let sidebar = null;
        let settingsModal = null;

        let currentMainTab = 0; // 0: square广场, 1: inspiration
        let currentChannel = null;
        let realtimeChannel = null; // 当前的实时连接频道
        let isConnectionAlive = true; // 当前频道实时连接是否正常
        let reconnectTimer = null; // 自动重连定时器
        let suppressNextClosedStatus = false; // 用于忽略我们主动离开频道时的 CLOSED 事件
        let currentFile = null; // 当前待上传的文件
        let channels = []; // 频道列表
        let isInitialized = false; // 是否已初始化
        let oldestMessageTimestamp = null; // 当前加载的最早消息时间戳
        let latestMessageTimestamp = null; // 当前已展示消息中最新的时间戳（用于断线重连补齐）
        let isLoadingHistory = false; // 是否正在加载历史消息
        let hasMoreHistory = true; // 是否还有更多历史消息
        // 灵感模块状态
        let inspirationState = {
            category: 'image',
            keyword: '',
            tagIds: [],
            favoritesOnly: false,
            sort: 'latest',
            page: 1,
            pageSize: 20,
            total: 0,
            tagsExpanded: {} // 记录每个分类的标签展开状态
        };
        let inspirationTagsCache = {};
        let isInspirationLoaded = false; // 记录灵感页面是否已加载过

        // 获取频道列表并显示loading的函数
        async function fetchChannelsWithLoading() {
            try {
                // 使用document.getElementById而非闭包变量，确保DOM存在性
                const sidebarEl = document.getElementById('hive-sidebar');
                const channelList = sidebarEl?.querySelector('#hive-channel-list');
                if (channelList) {
                    const isZh = getCurrentLanguage() === 'zh';
                    channelList.innerHTML = `<div class="loading">${getText('toast.connecting', 'Connecting...')}</div>`;
                }

                // 确保Supabase已初始化（处理重新打开侧边栏的情况）
                // 首先确保Supabase库已加载
                try {
                    await loadSupabaseLibrary();
                } catch (error) {
                    console.error('🐝 Hive: Failed to load Supabase library:', error);
                    const errorMsg = typeof window !== 'undefined' && typeof window.t === 'function' 
                        ? window.t('toast.loadSupabaseLibraryError') 
                        : 'Unable to load Supabase library, please check network connection';
                    throw new Error(errorMsg);
                }

                // 初始化本地Supabase实例
                if (!window.supabase || !window.supabase.createClient) {
                    reject(new Error('Supabase library not available'));
                }

                initSupabase(SUPABASE_URL, SUPABASE_KEY);
                await loginGuest();
                const fetchedChannels = await fetchChannels();

                // 直接渲染 - 移除复杂验证
                renderChannelList(fetchedChannels, onChannelSelect);
                channels = fetchedChannels;

                // 为所有频道订阅 Presence，获取在线人数
                subscribeChannelsPresence(fetchedChannels, (channelId, count) => {
                    updateChannelOnlineCount(channelId, count);
                });

                return fetchedChannels;
            } catch (error) {
                console.error('🐝 Hive: Failed to fetch channels:', error);
                const isZh = getCurrentLanguage() === 'zh';
                showToast(getText('toast.fetchChannelsFailed', 'Failed to fetch channels: ') + error.message, 'error');

                const sidebarEl = document.getElementById('hive-sidebar');
                const channelList = sidebarEl?.querySelector('#hive-channel-list');
                if (channelList) {
                    const isZh = getCurrentLanguage() === 'zh';
                    const errorText = getText('toast.connectionFailedRetry', 'Connection failed, please try again later');
                    channelList.innerHTML = `<div class="error">${errorText}</div>`;
                }

                return null;
            }
        }

        // 初始化 Hive 的函数
        async function initializeHive() {
            if (isInitialized) return;

            try {
                // 检查配置
                if (!SUPABASE_URL || !SUPABASE_KEY) {
                    const isZh = getCurrentLanguage() === 'zh';
                    showToast(getText('toast.configureSupabase', 'Please configure complete Supabase URL and API Key'), 'warning');
                    return;
                }

                // 确保Supabase库已加载
                try {
                    await loadSupabaseLibrary();
                } catch (error) {
                    console.error('🐝 Hive: Failed to load Supabase library:', error);
                    const isZh = getCurrentLanguage() === 'zh';
                    showToast(getText('toast.loadSupabaseFailed', 'Unable to load Supabase library, please check network connection'), 'error');
                    return;
                }

                initSupabase(SUPABASE_URL, SUPABASE_KEY);
                await loginGuest();

                // 检查版本（每次打开都检查，但会记住用户选择"不再提醒"的版本）
                try {
                    const versionCheck = await checkPluginVersion(PLUGIN_VERSION);
                    
                        if (versionCheck.needUpdate) {
                            // 检查用户是否已经选择"不再提醒"这个版本
                            const dontRemindVersions = JSON.parse(localStorage.getItem('hive_dont_remind_versions') || '[]');
                            const normalizedLatestVersion = normalizeVersion(versionCheck.latestVersion);
                            const isDontRemind = dontRemindVersions.includes(normalizedLatestVersion);
                            
                            if (!isDontRemind) {
                                if (versionCheck.isForce) {
                                    // 强制更新（在showForceUpdateModal函数内部设置isForceUpdate）
                                    await showForceUpdateModal(versionCheck.latestVersion, versionCheck.message);
                                } else {
                                    // 提示更新
                                    showUpdateNotification(versionCheck.latestVersion, versionCheck.message);
                                }
                            }
                        }
                } catch (error) {
                    console.error('🐝 Hive: Version check failed:', error);
                    // 版本检查失败不影响使用
                }

                isInitialized = true;

                // 如果需要强制更新，不允许继续初始化
                if (isForceUpdate) {
                    return;
                }

                // 确保正确显示广场视图（频道列表），初始化为loading状态
                toggleView('square', currentChannel);

                // 预先设置loading状态，防止UI闪烁
                const sidebarEl = document.getElementById('hive-sidebar');
                if (sidebarEl) {
                    const channelListEl = sidebarEl.querySelector('#hive-channel-list');
                    if (channelListEl) {
                        const isZh = getCurrentLanguage() === 'zh';
                        const loadingText = getText('toast.connecting', 'Connecting...');
                        channelListEl.innerHTML = `<div class="loading">${loadingText}</div>`;
                    }
                }

                // 移除打开侧边栏时的"已进入多人聊天"提示
                // const connectedMsg = typeof window !== 'undefined' && typeof window.t === 'function' 
                //     ? window.t('toast.connected') 
                //     : 'Hive multi-user chat connected!';
                // showToast(connectedMsg, 'success');

                console.log('🐝 initializeHive: Calling fetchChannelsWithLoading');
                // 初始化完成，获取频道列表
                const result = await fetchChannelsWithLoading();
                console.log('🐝 initializeHive: fetchChannelsWithLoading completed with:', result);

            } catch (error) {
                console.error('🐝 Hive: Initialization failed:', error);
                const isZh = getCurrentLanguage() === 'zh';
                const errorText = getText('toast.connectionFailed', 'Connection failed: ');
                showToast(errorText + error.message, 'error');
            }
        }

        // 更新全局的 onChannelSelect 事件处理函数
        window.onChannelSelect = onChannelSelect;
        window.initializeHive = initializeHive;
        window.currentMainTab = currentMainTab;
        window.currentChannel = currentChannel;
        window.reloadChannels = fetchChannelsWithLoading;

        // 处理频道选择
        async function onChannelSelect(channelId, item) {
            if (channelId === currentChannel) return;

            // 显示loading状态
            if (item) {
                item.style.pointerEvents = 'none';
                item.style.opacity = '0.6';
                const isZh = getCurrentLanguage() === 'zh';
                const connectingText = getText('toast.connectingChannel', 'Connecting...');
                item.innerHTML += `<div class="channel-loading">${connectingText}</div>`;
            }

            try {
                await joinChatRoom(channelId);
            } catch (error) {
                // 连接失败，恢复原状
                if (item) {
                    item.style.pointerEvents = 'auto';
                    item.style.opacity = '1';
                    item.querySelector('.channel-loading').remove();
                }
                throw error;
            }

            // 成功连接，移除loading
            if (item) {
                item.style.pointerEvents = 'auto';
                item.style.opacity = '1';
                item.querySelector('.channel-loading').remove();
            }
        }

        // 控制输入区域启用/禁用
        function setInputAreaEnabled(enabled) {
            const sidebarEl = document.getElementById('hive-sidebar');
            if (!sidebarEl) return;
            const inputArea = sidebarEl.querySelector('.chat-input-area');
            if (!inputArea) return;

            if (enabled) {
                inputArea.classList.remove('hive-input-disabled');
            } else {
                inputArea.classList.add('hive-input-disabled');
            }
        }

        // 处理实时通道连接状态（用于掉线提示和自动重连）
        function handleRealtimeStatus(status) {
            console.log('🐝 Hive: Realtime status update:', { status, currentChannel });

            // 仅在真正异常（CHANNEL_ERROR）时才触发自动重连；
            // TIMED_OUT 由 Supabase 内部处理，这里不再额外重连，避免频繁重连
            const disconnectedStatuses = ['CHANNEL_ERROR'];

            if (status === 'SUBSCRIBED') {
                // 连接已恢复
                if (!isConnectionAlive) {
                    isConnectionAlive = true;
                    setInputAreaEnabled(true);
                    const isZh = getCurrentLanguage() === 'zh';
                    const reconnectText = getText('toast.reconnected', 'Reconnected to Hive chat');
                    showToast(reconnectText, 'success');
                }
                if (reconnectTimer) {
                    clearTimeout(reconnectTimer);
                    reconnectTimer = null;
                }

                // 移除“正在重新连接”提示
                const sidebarEl = document.getElementById('hive-sidebar');
                const existingBanner = sidebarEl?.querySelector('.hive-reconnect-banner');
                if (existingBanner) {
                    existingBanner.remove();
                }
                return;
            }

            if (disconnectedStatuses.includes(status)) {

                // 掉线
                if (isConnectionAlive) {
                    isConnectionAlive = false;
                    setInputAreaEnabled(false);

                    // 在聊天输入区域上方显示持续的“正在重新连接”提示（非 toast）
                    const sidebarEl = document.getElementById('hive-sidebar');
                    if (sidebarEl) {
                        const chatRoom = sidebarEl.querySelector('#hive-chat-room');
                        if (chatRoom && !chatRoom.querySelector('.hive-reconnect-banner')) {
                            const banner = document.createElement('div');
                            banner.className = 'hive-reconnect-banner';
                            const isZh = getCurrentLanguage() === 'zh';
                            banner.textContent = getText('toast.disconnectedReconnecting', 'Connection to Hive chat server lost, attempting to reconnect...');
                            chatRoom.insertBefore(banner, chatRoom.firstChild);
                        }
                    }
                }

                // 安排自动重连
                if (!reconnectTimer && currentChannel) {
                    reconnectTimer = setTimeout(async () => {
                        reconnectTimer = null;
                        try {
                            console.log('🐝 Hive: Auto reconnecting to channel:', currentChannel);
                            await reconnectCurrentChannel();
                        } catch (error) {
                            console.error('🐝 Hive: Auto reconnect failed:', error);
                            // 失败后再次安排重连（简单重试策略）
                            if (!reconnectTimer && currentChannel) {
                                reconnectTimer = setTimeout(async () => {
                                    reconnectTimer = null;
                                    try {
                                        console.log('🐝 Hive: Auto reconnect retry to channel:', currentChannel);
                                        await reconnectCurrentChannel();
                                    } catch (err) {
                                        console.error('🐝 Hive: Auto reconnect retry failed:', err);
                                    }
                                }, 5000);
                            }
                        }
                    }, 3000);
                }
            }
        }

        // 加入聊天室（正常切换频道时使用）
        async function joinChatRoom(channelId) {
            try {
                console.log('🐝 Hive: Joining channel:', channelId);

                // 进入聊天视图时，关闭广场列表的 Presence 轮询
                setPresencePollingEnabled(false);

                // 离开当前频道
                if (realtimeChannel) {
                    // 标记：接下来收到的 CLOSED 是我们主动触发的，避免误判为掉线
                    suppressNextClosedStatus = true;
                    leaveChannel(realtimeChannel);
                    realtimeChannel = null;
                }

                currentChannel = channelId;

                // 先切换视图，确保聊天界面 DOM 已经显示
                toggleView('square', currentChannel);

                // 等待一小段时间，确保 DOM 已经渲染
                await new Promise(resolve => setTimeout(resolve, 50));

                // 设置频道标题
                setChannelTitle(channelId, channels);

                // 清空消息列表
                const chatMessages = document.querySelector('.chat-messages');
                if (chatMessages) {
                    chatMessages.innerHTML = '';
                }

                // 加入新频道
                realtimeChannel = joinChannel(channelId, onMessage, onPresence, handleRealtimeStatus);

                // 立即尝试更新一次在线人数（不等待 sync 事件）
                setTimeout(() => {
                    if (realtimeChannel && realtimeChannel.getOnlineCount) {
                        try {
                            const onlineCount = realtimeChannel.getOnlineCount();
                            if (onPresence) {
                                onPresence(onlineCount);
                            }
                        } catch (error) {
                            console.error(`🐝 Hive: Failed to get immediate presence:`, error);
                        }
                    }
                }, 500);

                // 手动刷新频道列表的 Presence 状态（确保列表显示正确）
                setTimeout(() => {
                    refreshChannelPresence(channelId, (channelId, count) => {
                        updateChannelOnlineCount(channelId, count);
                    });
                }, 1500); // 等待 1.5 秒，确保 Presence 已同步

                // 重置分页状态
                oldestMessageTimestamp = null;
                hasMoreHistory = true;
                isLoadingHistory = false;

                // 加载最新的10条消息
                const historyMessages = await fetchChannelMessages(channelId, 10);

                // 记录最早和最新的消息时间戳
                if (historyMessages.length > 0) {
                    oldestMessageTimestamp = historyMessages[0].created_at;
                    latestMessageTimestamp = historyMessages[historyMessages.length - 1].created_at;
                }

                // 如果没有加载到10条，说明没有更多历史消息了
                if (historyMessages.length < 10) {
                    hasMoreHistory = false;
                }

                // 渲染历史消息
                historyMessages.forEach(msg => {
                    const msgEl = createMessageElement(msg);
                    if (chatMessages) {
                        chatMessages.appendChild(msgEl);
                        // 自动翻译历史消息（仅在开启自动翻译时）
                        try {
                            const autoEnabled = isAutoTranslateEnabled();
                            const currentUser = getCurrentUser();
                            const isSelf = currentUser && msg.user_id === currentUser.id;
                            if (autoEnabled && !isSelf && window.hiveTranslateMessageToggle) {
                                const textEl = msgEl.querySelector('.hive-message-text') || msgEl.querySelector('.hive-bubble');
                                if (textEl) {
                                    window.hiveTranslateMessageToggle(msgEl, textEl, { auto: true });
                                }
                            }
                        } catch (e) {
                            console.warn('🐝 Hive: auto translate history message failed:', e);
                        }
                    }
                });

                // 等待所有图片加载完成后再滚动到底部
                if (chatMessages) {
                    waitForImages(chatMessages).then(() => {
                        // 使用 requestAnimationFrame 确保在 DOM 完全更新后再滚动
                        requestAnimationFrame(() => {
                            requestAnimationFrame(() => {
                                chatMessages.scrollTop = chatMessages.scrollHeight;
                                console.log('🐝 Hive: Scrolled to bottom after images loaded, scrollTop:', chatMessages.scrollTop, 'scrollHeight:', chatMessages.scrollHeight);
                            });
                        });
                    });
                }

                // 添加滚动监听，检测滚动到顶部时加载更多
                const handleScroll = async () => {
                    const currentChatMessages = document.querySelector('.chat-messages');
                    if (!currentChatMessages || isLoadingHistory || !hasMoreHistory) {
                        return;
                    }

                    // 检查是否滚动到顶部（允许 50px 的误差）
                    if (currentChatMessages.scrollTop <= 50) {
                        isLoadingHistory = true;
                        console.log('🐝 Hive: Scrolled to top, loading more messages...', {
                            scrollTop: currentChatMessages.scrollTop,
                            oldestMessageTimestamp,
                            hasMoreHistory
                        });

                        // 显示加载提示
                        showLoadingIndicator(currentChatMessages);

                        try {
                            // 加载更多历史消息
                            const moreMessages = await fetchChannelMessages(channelId, 10, oldestMessageTimestamp);
                            console.log('🐝 Hive: Loaded more history messages:', moreMessages.length, {
                                oldestMessageTimestamp,
                                firstMessageTime: moreMessages.length > 0 ? moreMessages[0].created_at : null
                            });

                            if (moreMessages.length > 0) {
                                // 记录当前滚动位置
                                const oldScrollHeight = currentChatMessages.scrollHeight;
                                const oldScrollTop = currentChatMessages.scrollTop;

                                // 在顶部插入新消息
                                moreMessages.forEach(msg => {
                                    const msgEl = createMessageElement(msg);
                                    if (currentChatMessages) {
                                        currentChatMessages.insertBefore(msgEl, currentChatMessages.firstChild);
                                    }
                                });

                                // 更新最早的消息时间戳（使用最旧的消息时间戳）
                                oldestMessageTimestamp = moreMessages[0].created_at;
                                console.log('🐝 Hive: Updated oldestMessageTimestamp to:', oldestMessageTimestamp);

                                // 如果没有加载到10条，说明没有更多历史消息了
                                if (moreMessages.length < 10) {
                                    hasMoreHistory = false;
                                }

                                // 等待DOM更新后，恢复滚动位置
                                requestAnimationFrame(() => {
                                    requestAnimationFrame(() => {
                                        const newScrollHeight = currentChatMessages.scrollHeight;
                                        const scrollDiff = newScrollHeight - oldScrollHeight;
                                        currentChatMessages.scrollTop = oldScrollTop + scrollDiff;
                                    });
                                });
                            } else {
                                // 没有更多消息了
                                hasMoreHistory = false;
                            }
                        } catch (error) {
                            console.error('🐝 Hive: Error loading more history messages:', error);
                            const isZh = getCurrentLanguage() === 'zh';
                            const loadErrorText = getText('toast.loadHistoryFailed', 'Failed to load history messages: ');
                            showToast(loadErrorText + error.message, 'error');
                        } finally {
                            // 隐藏加载提示
                            hideLoadingIndicator(currentChatMessages);
                            isLoadingHistory = false;
                        }
                    }
                };

                // 确保 chatMessages 元素存在后再添加监听器
                if (chatMessages) {
                    // 移除旧的滚动监听器（如果有）
                    chatMessages.removeEventListener('scroll', handleScroll);
                    // 添加新的滚动监听器
                    chatMessages.addEventListener('scroll', handleScroll, { passive: true });
                } else {
                    console.warn('🐝 Hive: chatMessages element not found, cannot attach scroll listener');
                }

            } catch (error) {
                console.error('🐝 Hive: Failed to join channel:', error);
                const isZh = getCurrentLanguage() === 'zh';
                showToast(getText('toast.joinChannelFailed', 'Failed to join channel: ') + error.message, 'error');
            }
        }

        // 仅用于掉线后的自动重连：不清空历史消息，只补充缺失消息并重建实时订阅
        async function reconnectCurrentChannel() {
            if (!currentChannel) return;

            try {

                // 先关闭旧通道
                if (realtimeChannel) {
                    leaveChannel(realtimeChannel);
                    realtimeChannel = null;
                }

                // 重新创建实时通道
                realtimeChannel = joinChannel(currentChannel, onMessage, onPresence, handleRealtimeStatus);

                // 仅补抓“最新已显示消息时间戳之后”的新消息，避免把很旧的历史重新追加
                const recentMessages = await fetchChannelMessages(currentChannel, 50, null, latestMessageTimestamp);
                const chatMessages = document.querySelector('.chat-messages');
                if (chatMessages && Array.isArray(recentMessages)) {
                    recentMessages.forEach(msg => {
                        if (!msg.id) return;
                        const exists = chatMessages.querySelector(`[data-message-id="${msg.id}"]`);
                        if (exists) return;

                        const msgEl = createMessageElement(msg);
                        chatMessages.appendChild(msgEl);

                        // 更新最新时间戳
                        if (!latestMessageTimestamp || msg.created_at > latestMessageTimestamp) {
                            latestMessageTimestamp = msg.created_at;
                        }
                    });
                }
            } catch (error) {
                console.error('🐝 Hive: reconnectCurrentChannel failed:', error);
            }
        }

        // 处理新消息
        let lastMessageSoundTime = 0;
        const MESSAGE_SOUND_COOLDOWN = 1000; // 毫秒，限制播放频率，避免短时间内多次播放

        function onMessage(message) {

            // 检查是否是自己发送的消息（不播放声音）
            const currentUser = getCurrentUser();
            const isSelfMessage = currentUser && message.user_id === currentUser.id;
            
            // 如果不是自己发送的消息，播放声音提醒（加冷却，避免同时多条消息时多次播放）
            if (!isSelfMessage) {
                const now = Date.now();
                if (now - lastMessageSoundTime >= MESSAGE_SOUND_COOLDOWN) {
                    playMessageSound();
                    lastMessageSoundTime = now;
                }
            }

            // 更新最新消息时间戳（用于断线重连只补充新消息）
            if (!latestMessageTimestamp || message.created_at > latestMessageTimestamp) {
                latestMessageTimestamp = message.created_at;
            }

            const chatMessages = document.querySelector('.chat-messages');
            if (!chatMessages) return;

            // 在添加新消息前，计算当前距离底部的距离
            const scrollHeightBefore = chatMessages.scrollHeight;
            const scrollTop = chatMessages.scrollTop;
            const clientHeight = chatMessages.clientHeight;
            const distanceFromBottomBefore = scrollHeightBefore - scrollTop - clientHeight;

            // 创建消息元素
            const msgEl = createMessageElement(message);
            msgEl.classList.add('hive-message-enter');
            
            // 添加消息到DOM
            chatMessages.appendChild(msgEl);

            // 自动翻译收到的消息（非自己发送 & 开启自动翻译）
            try {
                const autoEnabled = isAutoTranslateEnabled();
                if (autoEnabled && !isSelfMessage && window.hiveTranslateMessageToggle) {
                    const textEl = msgEl.querySelector('.hive-message-text') || msgEl.querySelector('.hive-bubble');
                    if (textEl) {
                        window.hiveTranslateMessageToggle(msgEl, textEl, { auto: true });
                    }
                }
            } catch (e) {
                console.warn('🐝 Hive: auto translate incoming message failed:', e);
            }
            
            // 等待DOM更新后测量消息高度
            requestAnimationFrame(() => {
                // 计算新消息的高度（包括gap）
                const messageHeight = msgEl.offsetHeight;
                const messageGap = 10; // 与 chat-messages 的 gap 一致
                const estimatedMessageHeight = messageHeight + messageGap;
                
                // 计算添加消息后的距离底部距离
                const scrollHeightAfter = chatMessages.scrollHeight;
                const distanceFromBottomAfter = scrollHeightAfter - scrollTop - clientHeight;
                
                
                // 如果添加消息前距离底部不超过1条消息的高度，自动滚动
                const shouldAutoScroll = distanceFromBottomBefore <= estimatedMessageHeight;
                
                if (shouldAutoScroll) {
                    // 自动滚动到底部
                    const hasImage = message.metadata && message.metadata.file_url && 
                                   (message.metadata.type === 'image' || message.metadata.type === 'workflow');
                    
                    if (hasImage) {
                        // 如果有图片，等待图片加载完成后再滚动
                        waitForImages(msgEl).then(() => {
                            requestAnimationFrame(() => {
                                chatMessages.scrollTop = chatMessages.scrollHeight;
                            });
                        });
                    } else {
                        // 如果没有图片，直接滚动
                        requestAnimationFrame(() => {
                            chatMessages.scrollTop = chatMessages.scrollHeight;
                        });
                    }
                } else {
                }
            });
        }

        // 处理Presence变化
        function onPresence(count) {
            updateOnlineCount(count);
        }

        // 显示加载提示
        function showLoadingIndicator(container) {
            // 移除现有的加载提示
            const existing = container.querySelector('.hive-loading-indicator');
            if (existing) {
                existing.remove();
            }

            const indicator = document.createElement('div');
            indicator.className = 'hive-loading-indicator';
            const isZh = getCurrentLanguage() === 'zh';
            const loadingHistoryText = getText('toast.loadingHistory', 'Loading history messages...');
            indicator.innerHTML = `<div class="hive-loading-spinner"></div><span>${loadingHistoryText}</span>`;
            container.insertBefore(indicator, container.firstChild);
        }

        // 隐藏加载提示
        function hideLoadingIndicator(container) {
            const indicator = container.querySelector('.hive-loading-indicator');
            if (indicator) {
                indicator.remove();
            }
        }

        // 返回频道列表
        const backToChannels = async () => {
            currentChannel = null;
            if (realtimeChannel) {
                // 同样忽略主动 leave 导致的 CLOSED
                suppressNextClosedStatus = true;
                leaveChannel(realtimeChannel);
                realtimeChannel = null;
            }
            updateOnlineCount(0);
            toggleView('square', currentChannel);

            // 重置分页状态
            oldestMessageTimestamp = null;
            hasMoreHistory = true;
            isLoadingHistory = false;
            latestMessageTimestamp = null;

            // 重置连接状态并清理重连定时器
            isConnectionAlive = true;
            if (reconnectTimer) {
                clearTimeout(reconnectTimer);
                reconnectTimer = null;
            }
            setInputAreaEnabled(true);

            // 返回广场时，重新开启 Presence 轮询
            setPresencePollingEnabled(true);

            // 重新获取频道列表（会自动重新订阅 Presence）
            await fetchChannelsWithLoading();
        };

        // 监听浏览器网络状态变化，作为辅助掉线检测
        window.addEventListener('offline', () => {
            console.log('🐝 Hive: Browser reported offline');
            if (!isConnectionAlive) return;
            isConnectionAlive = false;
            setInputAreaEnabled(false);

            const sidebarEl = document.getElementById('hive-sidebar');
            const chatRoom = sidebarEl?.querySelector('#hive-chat-room');
            if (chatRoom && !chatRoom.querySelector('.hive-reconnect-banner')) {
                const banner = document.createElement('div');
                banner.className = 'hive-reconnect-banner';
                const isZh = getCurrentLanguage() === 'zh';
                banner.textContent = getText('toast.networkDisconnected', 'Local network disconnected, attempting to reconnect...');
                chatRoom.insertBefore(banner, chatRoom.firstChild);
            }
        });

        window.addEventListener('online', () => {
            console.log('🐝 Hive: Browser reported online');
            // 恢复输入区，但仍等待服务器侧连接真正 SUBSCRIBED 后再移除 banner
            setInputAreaEnabled(true);

            // 触发一次频道列表刷新 + 当前频道重连
            fetchChannelsWithLoading();
            if (currentChannel) {
                reconnectCurrentChannel();
            }
        });

        // 处理文件选择
        // 验证文件格式
        const validateFileFormat = (file) => {
            const fileName = file.name.toLowerCase();
            const fileType = file.type;
            
            // 检查是否是图片文件
            const isImage = fileType.startsWith('image/') && 
                           (fileType === 'image/png' || 
                            fileType === 'image/jpeg' || 
                            fileType === 'image/jpg' || 
                            fileType === 'image/webp' ||
                            fileName.endsWith('.png') ||
                            fileName.endsWith('.jpg') ||
                            fileName.endsWith('.jpeg') ||
                            fileName.endsWith('.webp'));
            
            // 检查是否是JSON文件
            const isJson = fileType === 'application/json' || 
                          fileName.endsWith('.json');
            
            if (!isImage && !isJson) {
                return {
                    valid: false,
                    message: typeof window !== 'undefined' && typeof window.t === 'function' 
                        ? window.t('toast.onlyImageOrJson') 
                        : (typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('toast.onlyImageOrJson') : 'Only image files (PNG/JPG/WebP) or JSON workflow files are supported')
                };
            }
            
            return { valid: true };
        };

        const handleFileSelect = (file) => {
            const isZh = getCurrentLanguage() === 'zh';
            
            if (!currentChannel) {
                showToast(getText('toast.joinChannelFirst', 'Please join a channel before sending files'), 'warning');
                return;
            }

            // 验证文件格式
            const validation = validateFileFormat(file);
            if (!validation.valid) {
                showToast(validation.message, 'error');
                return;
            }

            currentFile = file;
            updateFilePreview();
            const fileReadyText = typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('toast.fileReady', { name: file.name }) : `File "${file.name}" is ready to send`;
            showToast(fileReadyText, 'success');
        };

        // 更新文件预览
        const updateFilePreview = () => {
            const sidebarEl = document.getElementById('hive-sidebar');
            if (!sidebarEl) return;

            const inputArea = sidebarEl.querySelector('.chat-input-area');
            if (!inputArea) return;

            const inputRow = inputArea.querySelector('.chat-input-row');
            if (!inputRow) return;

            let previewContainer = inputArea.querySelector('.hive-file-preview-container');

            if (!previewContainer) {
                previewContainer = document.createElement('div');
                previewContainer.className = 'hive-file-preview-container';
                inputArea.insertBefore(previewContainer, inputRow);
            }

            previewContainer.innerHTML = '';

            if (currentFile) {
                const preview = createFilePreview(currentFile, () => {
                    currentFile = null;
                    updateFilePreview();
                });
                previewContainer.appendChild(preview);
            }
        };

        // ================= 前端防灌水 / 垃圾信息简单防护 =================
        const MESSAGE_COOLDOWN_MS = 800;            // 单条消息冷却时间
        const MESSAGE_WINDOW_MS = 60 * 1000;        // 统计窗口：60 秒
        const MESSAGE_WINDOW_LIMIT = 20;            // 60 秒内允许的最大消息数
        const MAX_MESSAGE_LENGTH = 1000;            // 单条消息最大长度
        const DUPLICATE_INTERVAL_MS = 3000;         // 相同内容在 3 秒内禁止重复发送

        let recentMessageTimestamps = [];           // 记录最近一段时间的发送时间
        let lastTextContent = '';
        let lastTextTime = 0;
        let lastSendTime = 0;

        function isTooManyMessagesInWindow(now) {
            recentMessageTimestamps = recentMessageTimestamps.filter(t => now - t <= MESSAGE_WINDOW_MS);
            if (recentMessageTimestamps.length >= MESSAGE_WINDOW_LIMIT) {
                return true;
            }
            recentMessageTimestamps.push(now);
            return false;
        }

        function isLowQualityText(text) {
            if (!text) return false;
            const len = text.length;
            if (len <= 5) return false;

            // 同一字符占比过高（例如“哈哈哈哈哈”）
            const charCounts = {};
            for (const ch of text) {
                charCounts[ch] = (charCounts[ch] || 0) + 1;
            }
            const maxRepeat = Math.max(...Object.values(charCounts));
            if (maxRepeat / len >= 0.8) return true;

            return false;
        }

        // 发送消息
        const sendMessageToChannel = async () => {
            const sidebarEl = document.getElementById('hive-sidebar');
            if (!sidebarEl) return;

            const inputTextarea = sidebarEl.querySelector('.chat-input-textarea');
            const sendBtn = sidebarEl.querySelector('.chat-send-btn');
            if (!inputTextarea || !sendBtn) return;

            const content = inputTextarea.value.trim();
            
            if (!currentChannel) {
                const isZh = getCurrentLanguage() === 'zh';
                showToast(getText('toast.joinChannelFirstSend', 'Please join a channel first'), 'warning');
                return;
            }

            // 如果当前连接已断开，提示并阻止发送
            if (!isConnectionAlive) {
                showToast(getText('toast.connectionLost', 'Connection lost, attempting to reconnect. Please try again later'), 'warning');
                return;
            }

            if (!content && !currentFile) {
                showToast(getText('toast.enterMessageOrFile', 'Please enter a message or select a file'), 'warning');
                return;
            }

            // ---------- 前端防灌水与垃圾内容检查 ----------
            const now = Date.now();

            // 冷却时间：防止短时间内疯狂连点
            if (now - lastSendTime < MESSAGE_COOLDOWN_MS) {
                showToast(getText('toast.sendingTooFast', 'Message sent too quickly, please try again later'), 'warning');
                return;
            }

            // 统计 60 秒内发送次数
            if (isTooManyMessagesInWindow(now)) {
                showToast(getText('toast.sendingTooFrequent', 'Sending too frequently, please try again later'), 'warning');
                return;
            }

            // 文本长度限制（仅对文本消息生效）
            if (content && content.length > MAX_MESSAGE_LENGTH) {
                const messageTooLongText = typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('toast.messageTooLong', { count: MAX_MESSAGE_LENGTH }) : `Message too long, please limit to ${MAX_MESSAGE_LENGTH} characters`;
                showToast(messageTooLongText, 'warning');
                return;
            }

            // 短时间内重复发送完全相同的文本
            if (content && content === lastTextContent && now - lastTextTime < DUPLICATE_INTERVAL_MS) {
                showToast(getText('toast.duplicateContent', 'Please do not send the same content repeatedly in a short time'), 'warning');
                return;
            }

            // 简单判定低质量文本（大量重复字符）
            if (content && isLowQualityText(content)) {
                showToast(getText('toast.meaninglessContent', 'Message content appears meaningless, please modify before sending'), 'warning');
                return;
            }

            // 通过本地检查后，记录本次内容与时间
            if (content) {
                lastTextContent = content;
                lastTextTime = now;
            }
            lastSendTime = now;

            // 检查是否正在发送
            if (sendBtn.disabled) {
                return;
            }

            // 设置loading状态（按钮本身保留），并统一禁用整个输入区域
            sendBtn.disabled = true;
            const originalText = sendBtn.textContent;
            const sendingText = getText('toast.sending', 'Sending...');
            sendBtn.innerHTML = `<span class="hive-send-loading">⏳</span> ${sendingText}`;
            sendBtn.style.opacity = '0.6';
            sendBtn.style.cursor = 'not-allowed';

            // 统一禁用整个 chat-input-area，避免逐个控件处理
            const inputArea = sidebarEl.querySelector('.chat-input-area');
            let inputAreaWasDisabled = false;
            if (inputArea) {
                inputAreaWasDisabled = inputArea.classList.contains('hive-input-disabled');
                inputArea.classList.add('hive-input-disabled');
            }

            // 禁用输入框（防止按回车发送）
            const textareaState = {
                disabled: inputTextarea.disabled,
                readOnly: inputTextarea.readOnly
            };
            inputTextarea.disabled = true;
            inputTextarea.readOnly = true;

            try {
                // 检查图片是否包含工作流数据，如果包含则询问用户
                let workflowDataToSend = undefined; // undefined表示未询问，null表示不携带，对象表示携带
                if (currentFile && currentFile.type && currentFile.type.startsWith('image/')) {
                    // 在压缩之前提取工作流数据（因为压缩可能会丢失工作流数据）
                    console.log('🐝 Hive: Extracting workflow (and prompt) from image before compression...');
                    const extractedWorkflow = await extractWorkflowFromImage(currentFile);
                    console.log('🐝 Hive: Extracted workflow result:', extractedWorkflow);
                    
                    if (extractedWorkflow && extractedWorkflow.workflow) {
                        // 弹出询问提示
                        const isZh = getCurrentLanguage() === 'zh';
                        const detectedText = getText('workflow.detected', '📋 Workflow Data Detected');
                        const hasWorkflowDataText = getText('workflow.hasWorkflowData', 'This image contains ComfyUI workflow data<br>Do you want to include workflow information when sending?');
                        const includeWorkflowText = getText('workflow.includeWorkflow', 'After including, recipients can see the "Load Workflow" button on the image');
                        const confirmText = `
                            <div style="text-align: center; padding: 10px;">
                                <div style="font-size: 16px; font-weight: bold; margin-bottom: 10px; color: #ffbd2e;">
                                    ${detectedText}
                                </div>
                                <div style="font-size: 14px; color: #ccc; margin-bottom: 15px;">
                                    ${hasWorkflowDataText}
                                </div>
                                <div style="font-size: 12px; color: #999;">
                                    ${includeWorkflowText}
                                </div>
                            </div>
                        `;
                        const shouldInclude = await showConfirm(confirmText);
                        workflowDataToSend = shouldInclude ? extractedWorkflow.workflow : null;
                    }
                } else if (currentFile && currentFile.name && currentFile.name.endsWith('.json')) {
                    // 对于JSON文件，先验证是否是有效的ComfyUI工作流
                    try {
                        const text = await currentFile.text();
                        const parsedData = JSON.parse(text);
                        
                        if (!isValidComfyUIWorkflow(parsedData)) {
                            const isZh = getCurrentLanguage() === 'zh';
                            showToast(getText('toast.notComfyUIWorkflow', 'Not a valid ComfyUI workflow file'), 'error');
                            return; // 阻止发送
                        }
                        
                        // 重新创建File对象（因为text()已经消耗了原file对象）
                        const blob = new Blob([text], { type: 'application/json' });
                        currentFile = new File([blob], currentFile.name, { type: 'application/json' });
                    } catch (error) {
                        const isZh = getCurrentLanguage() === 'zh';
                        showToast(getText('toast.parseJsonFailed', 'Unable to parse JSON file: ') + error.message, 'error');
                        return; // 阻止发送
                    }
                }

                // 发送前再次验证文件格式（防止通过其他方式绕过验证）
                if (currentFile) {
                    const validation = validateFileFormat(currentFile);
                    if (!validation.valid) {
                        showToast(validation.message, 'error');
                        return; // 阻止发送
                    }
                }

                // 发送消息
                const sentMessage = await sendMessage(currentChannel, content, currentFile, workflowDataToSend);
                console.log('🐝 Hive: Message sent successfully:', sentMessage);

                // 获取用户资料并立即显示消息（乐观更新）
                const currentUser = getCurrentUser();
                const enrichedMessage = {
                    ...sentMessage,
                    profile: {
                        id: currentUser.id,
                        username: currentUser.username,
                        avatar_url: currentUser.avatar_url
                    }
                };

                // 立即显示消息
                const chatMessages = document.querySelector('.chat-messages');
                if (chatMessages) {
                    const msgEl = createMessageElement(enrichedMessage);
                    msgEl.classList.add('hive-message-enter');
                    chatMessages.appendChild(msgEl);
                    
                    // 自动滚动到底部
                    requestAnimationFrame(() => {
                        chatMessages.scrollTop = chatMessages.scrollHeight;
                    });
                }

                // 清空输入
                inputTextarea.value = '';
                currentFile = null;
                updateFilePreview();

                // 恢复输入框到初始状态
                autoResizeTextarea(inputTextarea);
                inputTextarea.scrollTop = 0; // 重置滚动位置

                const isZh = getCurrentLanguage() === 'zh';
                showToast(getText('toast.messageSent', 'Message sent'), 'success');
            } catch (error) {
                console.error('🐝 Hive: Send message failed:', error);
                const isZh = getCurrentLanguage() === 'zh';
                const sendFailedText = getText('toast.sendFailed', 'Send failed: ');
                showToast(sendFailedText + error.message, 'error');
            } finally {
                // 恢复按钮状态
                sendBtn.disabled = false;
                sendBtn.textContent = originalText;
                sendBtn.style.opacity = '1';
                sendBtn.style.cursor = 'pointer';

                // 恢复整个输入区域
                const inputArea = sidebarEl.querySelector('.chat-input-area');
                if (inputArea && !inputAreaWasDisabled) {
                    inputArea.classList.remove('hive-input-disabled');
                }

                // 恢复输入框
                inputTextarea.disabled = textareaState.disabled;
                inputTextarea.readOnly = textareaState.readOnly;
            }
        };

        // 检测系统语言
        function detectSystemLanguage() {
            // 优先检测 ComfyUI 的语言设置
            if (window.app && window.app.ui && window.app.ui.settings) {
                const comfyLang = window.app.ui.settings.language;
                if (comfyLang) {
                    return comfyLang.startsWith('zh') ? 'zh' : 'en';
                }
            }
            
            // 检测浏览器语言
            const browserLang = navigator.language || navigator.userLanguage;
            if (browserLang.startsWith('zh')) {
                return 'zh';
            }
            return 'en';
        }

        // 获取当前语言
        function getCurrentLanguage() {
            const savedLang = localStorage.getItem('hive_lang');
            if (savedLang === 'auto' || !savedLang) {
                return detectSystemLanguage();
            }
            return savedLang;
        }

        // 是否开启自动翻译消息
        function isAutoTranslateEnabled() {
            return localStorage.getItem('hive_auto_translate_enabled') === 'true';
        }

        // 检测消息文本语种（仅区分中/英，简单启发式）
        function detectMessageLang(text) {
            if (!text) return 'unknown';
            const hasChinese = /[\u4e00-\u9fff]/.test(text);
            const hasLatin = /[A-Za-z]/.test(text);
            if (hasChinese && !hasLatin) return 'zh';
            if (hasLatin && !hasChinese) return 'en';
            if (hasChinese && hasLatin) {
                // 简单规则：中文数量更多则视为中文
                const chineseCount = (text.match(/[\u4e00-\u9fff]/g) || []).length;
                const latinCount = (text.match(/[A-Za-z]/g) || []).length;
                return chineseCount >= latinCount ? 'zh' : 'en';
            }
            return 'unknown';
        }

        // 全局翻译忙碌标记，避免 translate.js 内部队列堆积
        let hiveTranslateBusy = false;

        // 针对单条消息的翻译逻辑
        async function translateMessageElement(textEl, options = {}) {
            if (!textEl) return;

            const originalText = (textEl.dataset.originalText || textEl.innerText || '').trim();
            if (!originalText) return;

            // 已经是翻译状态则还原
            const isTranslated = textEl.dataset.translated === 'true';
            if (isTranslated) {
                const raw = textEl.dataset.originalText;
                if (raw != null) {
                    textEl.textContent = raw;
                }
                textEl.dataset.translated = 'false';
                return;
            }

            // 自动或手动翻译目标语言
            const currentLang = getCurrentLanguage(); // 'zh' or 'en'
            const msgLang = detectMessageLang(originalText);

            // 自动模式：只翻译与当前界面语言不同的消息
            if (options.auto === true) {
                if (msgLang === 'unknown' || msgLang === currentLang) {
                    return;
                }
            }

            // 目标语言：优先使用当前界面语言；若消息本身就是当前语言且为手动点击，则切到另一种语言
            let targetLang = currentLang;
            if (!options.auto && msgLang === currentLang && (msgLang === 'zh' || msgLang === 'en')) {
                targetLang = currentLang === 'zh' ? 'en' : 'zh';
            }

            // 仅支持中英互译
            if (!((msgLang === 'zh' || msgLang === 'en') && (targetLang === 'zh' || targetLang === 'en'))) {
                return;
            }

            const fromName = msgLang === 'zh' ? 'chinese_simplified' : 'english';
            const toName = targetLang === 'zh' ? 'chinese_simplified' : 'english';

            // 如果上一个翻译任务还没结束，避免继续堆积到 translate.js 队列
            if (hiveTranslateBusy) {
                if (options.auto) {
                    // 自动翻译模式：静默跳过，避免刷屏提示
                    return;
                } else {
                    const isZh = getCurrentLanguage() === 'zh';
                    showToast(getText('toast.translateBusy', 'Previous message is being translated, please try again later'), 'warning');
                    return;
                }
            }

            try {
                hiveTranslateBusy = true;

                await loadTranslateLibrary();

                // 记录原文
                if (!textEl.dataset.originalText) {
                    textEl.dataset.originalText = originalText;
                }

                // 配置 translate.js 仅作用于当前元素
                if (window.translate && typeof window.translate.setDocuments === 'function') {
                    window.translate.language.setLocal(fromName);
                    window.translate.to = toName;
                    window.translate.setDocuments([textEl]);
                    window.translate.execute([textEl]);
                    textEl.dataset.translated = 'true';
                }
            } catch (error) {
                console.error('🐝 Hive: translate single message failed:', error);
                const isZh = getCurrentLanguage() === 'zh';
                showToast(getText('toast.translateFailed', 'Translation failed: ') + error.message, 'error');
            } finally {
                hiveTranslateBusy = false;
            }
        }

        // 暴露给 UI 层使用的翻译切换函数（返回 Promise，便于 UI 做加载状态）
        window.hiveTranslateMessageToggle = function (msgElement, textElement, options = {}) {
            return translateMessageElement(textElement, options);
        };

        // 验证昵称
        function validateUsername(username) {
            const currentLang = getCurrentLanguage();
            const isZh = currentLang === 'zh';
            
            const errorMessages = {
                zh: {
                    empty: getText('username.empty', 'Username cannot be empty'),
                    tooShort: getText('username.tooShort', 'Username must be at least 2 characters'),
                    tooLong: getText('username.tooLong', 'Username cannot exceed 20 characters'),
                    invalidChars: getText('username.invalidChars', 'Username can only contain Chinese, English, numbers, underscores and hyphens')
                },
                en: {
                    empty: 'Username cannot be empty',
                    tooShort: 'Username must be at least 2 characters',
                    tooLong: 'Username cannot exceed 20 characters',
                    invalidChars: 'Username can only contain Chinese, English, numbers, underscores and hyphens'
                }
            };
            const errors = errorMessages[currentLang] || errorMessages.en;
            
            if (!username || username.trim().length === 0) {
                return { valid: false, message: errors.empty };
            }
            
            const trimmed = username.trim();
            
            if (trimmed.length < 2) {
                return { valid: false, message: errors.tooShort };
            }
            
            if (trimmed.length > 20) {
                return { valid: false, message: errors.tooLong };
            }
            
            // 检查是否包含非法字符（只允许中文、英文、数字、下划线、连字符）
            const validPattern = /^[\u4e00-\u9fa5a-zA-Z0-9_-]+$/;
            if (!validPattern.test(trimmed)) {
                return { valid: false, message: errors.invalidChars };
            }
            
            return { valid: true };
        }

        // 输入内容安全清理函数（去除HTML标签和潜在危险字符）
        function sanitizeInput(input) {
            if (!input) return '';
            // 创建一个临时的div元素来去除HTML标签
            const div = document.createElement('div');
            div.textContent = input;
            let sanitized = div.textContent || div.innerText || '';
            // 去除首尾空白
            sanitized = sanitized.trim();
            // 替换一些潜在的危险字符组合
            sanitized = sanitized.replace(/javascript:/gi, '');
            sanitized = sanitized.replace(/on\w+\s*=/gi, '');
            return sanitized;
        }

        // 设置模态框
        const showSettingsModal = () => {
            if (document.getElementById('hive-settings-modal')) return;

            const currentUser = getCurrentUser();
            const currentLang = localStorage.getItem('hive_lang') || 'auto';
            const autoTranslateEnabled = isAutoTranslateEnabled();
            const isZh = getCurrentLanguage() === 'zh';
            
            // 翻译函数辅助
            const tt = (key) => typeof window !== 'undefined' && typeof window.t === 'function' ? window.t(key) : (isZh ? key : key);

            const modal = document.createElement('div');
            modal.id = 'hive-settings-modal';
            modal.innerHTML = `
                <div class="hive-settings-overlay">
                    <div class="hive-settings-content">
                        <div class="hive-settings-header">
                            <h2>⚙️ ${tt('settings.title')}</h2>
                            <button class="hive-settings-close" title="${tt('common.close')}">×</button>
                        </div>
                        <div class="hive-settings-body">
                            <div class="hive-settings-sections">
                                <div class="hive-settings-section">
                                    <h3>${tt('settings.userInfo')}</h3>
                                    <div class="hive-settings-user-info">
                                        <div class="hive-settings-avatar-section">
                                            <img class="hive-settings-avatar-preview" src="${currentUser?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'}" id="avatar-preview">
                                            <button class="hive-settings-btn-random-avatar">${tt('settings.randomAvatar')}</button>
                                        </div>
                                        <div class="hive-settings-user-details">
                                            <div class="hive-settings-form-group">
                                                <label>${tt('settings.username')}</label>
                                                <input type="text" class="hive-settings-input username-input" value="${currentUser?.username || ''}" placeholder="${tt('settings.enterUsername')}">
                                                <div class="hive-settings-error username-error"></div>
                                            </div>
                                            <button class="hive-settings-btn-save btn-save-profile">${tt('common.save')}</button>
                                        </div>
                                    </div>
                                </div>
                                <div class="hive-settings-section">
                                    <h3>${tt('settings.systemSettings')}</h3>
                                    <div class="hive-settings-form-group">
                                        <label>${tt('settings.language')}</label>
                                        <select class="hive-settings-select lang-select">
                                            <option value="auto" ${currentLang === 'auto' ? 'selected' : ''}>${tt('settings.followSystem')}</option>
                                            <option value="zh" ${currentLang === 'zh' ? 'selected' : ''}>${getText('settings.chinese', 'Chinese')}</option>
                                            <option value="en" ${currentLang === 'en' ? 'selected' : ''}>English</option>
                                        </select>
                                    </div>
                                    <div class="hive-settings-auto-translate-row">
                                        <span class="hive-settings-auto-translate-title">${tt('settings.autoTranslate')}</span>
                                        <div class="hive-settings-auto-translate-label">
                                            <input type="checkbox" class="hive-auto-translate-toggle" ${autoTranslateEnabled ? 'checked' : ''} />
                                            <span>${tt('settings.autoTranslateDesc')}</span>
                                        </div>
                                    </div>
                                    <div class="hive-settings-auto-translate-row">
                                        <span class="hive-settings-auto-translate-title">${tt('settings.nodeInstallerGuide')}</span>
                                        <div class="hive-settings-auto-translate-label">
                                            <input type="checkbox" class="hive-node-installer-guide-toggle" ${localStorage.getItem('hive_node_installer_guide_dont_show') === 'true' ? 'checked' : ''} />
                                            <span>${tt('settings.dontShowNodeInstaller')}</span>
                                        </div>
                                    </div>
                                    <div class="hive-settings-auto-translate-row">
                                        <span class="hive-settings-auto-translate-title">${tt('settings.modelDownloaderGuide')}</span>
                                        <div class="hive-settings-auto-translate-label">
                                            <input type="checkbox" class="hive-model-downloader-guide-toggle" ${localStorage.getItem('hive_model_downloader_guide_dont_show') === 'true' ? 'checked' : ''} />
                                            <span>${tt('settings.dontShowModelDownloader')}</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="hive-settings-section">
                                    <h3>${tt('settings.about')}</h3>
                                    <div class="hive-settings-about">
                                        <div class="hive-settings-about-item">
                                            <span class="hive-settings-about-label">${tt('settings.version')}:</span>
                                            <span class="hive-settings-version">v${PLUGIN_VERSION}</span>
                                        </div>
                                        <div class="hive-settings-about-item">
                                            <span class="hive-settings-about-label">${tt('settings.github')}:</span>
                                            <a href="https://github.com/luguoli" target="_blank" class="hive-settings-about-link">https://github.com/luguoli</a>
                                        </div>
                                        <div class="hive-settings-about-item">
                                            <span class="hive-settings-about-label">${tt('settings.contactEmail')}:</span>
                                            <span class="hive-settings-about-email">luguoli@vip.qq.com</span>
                                        </div>
                                        <div class="hive-settings-about-note">
                                            ${tt('settings.customRequirements')}
                                        </div>
                                        <div class="hive-settings-feedback-section" style="margin-top: 16px;">
                                            <button class="hive-settings-feedback-btn">${tt('settings.feedback')}</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        <div class="hive-settings-footer">
                            <button class="hive-settings-close-btn">${tt('common.close')}</button>
                        </div>
                    </div>
                </div>
            `;

            // 绑定关闭事件
            const closeModal = () => {
                modal.remove();
            };

            const closeBtn = modal.querySelector('.hive-settings-close');
            const closeFooterBtn = modal.querySelector('.hive-settings-close-btn');
            const overlay = modal.querySelector('.hive-settings-overlay');

            closeBtn.onclick = closeModal;
            closeFooterBtn.onclick = closeModal;
            overlay.onclick = (e) => {
                if (e.target === overlay || e.target.classList.contains('hive-settings-overlay')) {
                    closeModal();
                }
            };

            // Esc键关闭
            const handleKeyDown = (e) => {
                if (e.key === 'Escape') {
                    closeModal();
                    document.removeEventListener('keydown', handleKeyDown);
                }
            };
            document.addEventListener('keydown', handleKeyDown);

            // 随机头像按钮
            const randomAvatarBtn = modal.querySelector('.hive-settings-btn-random-avatar');
            const avatarPreview = modal.querySelector('#avatar-preview');
            randomAvatarBtn.onclick = () => {
                const newAvatar = generateRandomAvatar();
                avatarPreview.src = newAvatar;
            };

            // 保存用户资料按钮
            const saveProfileBtn = modal.querySelector('.btn-save-profile');
            const usernameInput = modal.querySelector('.username-input');
            const usernameError = modal.querySelector('.username-error');
            
            saveProfileBtn.onclick = async () => {
                const newUsername = usernameInput.value.trim();
                const newAvatar = avatarPreview.src;
                
                // 验证昵称
                const validation = validateUsername(newUsername);
                if (!validation.valid) {
                    usernameError.textContent = validation.message;
                    usernameError.style.display = 'block';
                    return;
                }
                
                usernameError.style.display = 'none';
                usernameError.textContent = '';
                
                // 禁用按钮
                saveProfileBtn.disabled = true;
                const savingText = getText('settings.saving', 'Saving...');
                saveProfileBtn.textContent = savingText;
                
                try {
                    await updateUserProfile(currentUser.id, {
                        username: newUsername,
                        avatar_url: newAvatar
                    });
                    
                    showToast(getText('toast.profileUpdated', 'Profile updated'), 'success');
                    
                    // 清除当前用户的缓存，确保下次获取时使用最新数据
                    clearUserProfileCache(currentUser.id);
                    
                    // 关闭模态框
                    modal.remove();
                    
                    // 刷新消息列表以显示新的头像和昵称（如果正在聊天）
                    if (currentChannel) {
                        const chatMessages = document.querySelector('.chat-messages');
                        if (chatMessages) {
                            // 重新获取并更新消息中的用户信息
                            const messageElements = chatMessages.querySelectorAll('.hive-message');
                            messageElements.forEach(msgEl => {
                                const messageId = msgEl.getAttribute('data-message-id');
                                if (messageId) {
                                    // 可以在这里更新消息显示，但为了简单，我们只更新当前用户的消息
                                    const usernameSpan = msgEl.querySelector('.hive-message-username');
                                    const avatarImg = msgEl.querySelector('.hive-message-meta img');
                                    if (usernameSpan && msgEl.classList.contains('self')) {
                                        usernameSpan.textContent = newUsername;
                                    }
                                    if (avatarImg && msgEl.classList.contains('self')) {
                                        avatarImg.src = newAvatar;
                                    }
                                }
                            });
                        }
                    }
                    
                    // 刷新界面（如果需要）
                    if (currentChannel) {
                        // 可以在这里刷新消息列表以显示新的头像和昵称
                    }
                } catch (error) {
                    console.error('🐝 Hive: Failed to update profile:', error);
                    const updateFailedText = getText('toast.updateFailed', 'Update failed: ');
                    showToast(updateFailedText + error.message, 'error');
                } finally {
                    saveProfileBtn.disabled = false;
                    saveProfileBtn.textContent = getText('common.save', 'Save');
                }
            };

            // 语言选择
            modal.querySelector('.lang-select').onchange = async () => {
                const selectedLang = modal.querySelector('.lang-select').value;
                localStorage.setItem('hive_lang', selectedLang);
                
                // 确保语言文件已加载，然后更新UI文本
                // 使用 setTimeout 确保 localStorage 更新已生效
                setTimeout(() => {
                    if (typeof window.hiveUpdateUITexts === 'function') {
                        window.hiveUpdateUITexts();
                    }
                }, 0);
                
                // 重新加载频道列表和分类（以更新显示的语言）
                if (currentChannel) {
                    const channels = await fetchChannels();
                    renderChannelList(channels, onChannelSelect);
                    setChannelTitle(currentChannel, channels);
                }
                
                // 如果当前在灵感页面，重新加载分类和标签
                if (currentMainTab === 1) {
                    loadInspirationCategories().then(() => {
                        loadInspirationTagsForCurrentCategory();
                    });
                }
                
                const langUpdatedText = typeof window !== 'undefined' && typeof window.t === 'function' 
                    ? window.t('toast.languageUpdated') 
                    : 'Language updated';
                const refreshText = typeof window !== 'undefined' && typeof window.t === 'function' 
                    ? window.t('toast.refreshBrowser') 
                    : 'Please refresh your browser to apply the changes (请刷新浏览器以应用更改)';
                showToast(langUpdatedText + '<br>' + refreshText, 'success');
            };

            // 自动翻译开关
            const autoTranslateToggle = modal.querySelector('.hive-auto-translate-toggle');
            if (autoTranslateToggle) {
                autoTranslateToggle.onchange = () => {
                    const enabled = autoTranslateToggle.checked;
                    localStorage.setItem('hive_auto_translate_enabled', enabled ? 'true' : 'false');
                    const translationStatusText = typeof window !== 'undefined' && typeof window.t === 'function' 
                        ? (enabled ? window.t('settings.autoTranslationEnabled') : window.t('settings.autoTranslationDisabled'))
                        : (enabled ? getText('settings.autoTranslationEnabled', 'Auto translation enabled') : getText('settings.autoTranslationDisabled', 'Auto translation disabled'));
                    showToast(translationStatusText, 'info');
                };

                // 点击文字也能切换开关
                const autoTranslateText = modal.querySelector('.hive-settings-auto-translate-label span');
                if (autoTranslateText) {
                    autoTranslateText.style.cursor = 'pointer';
                    autoTranslateText.onclick = () => {
                        autoTranslateToggle.checked = !autoTranslateToggle.checked;
                        autoTranslateToggle.onchange();
                    };
                }
            }
            
            // 节点安装器提示开关
            const nodeInstallerGuideToggle = modal.querySelector('.hive-node-installer-guide-toggle');
            if (nodeInstallerGuideToggle) {
                nodeInstallerGuideToggle.onchange = () => {
                    const dontShow = nodeInstallerGuideToggle.checked;
                    localStorage.setItem('hive_node_installer_guide_dont_show', dontShow ? 'true' : 'false');
                    showToast(getText('toast.settingsSaved', 'Settings saved'), 'success');
                };
                
                // 点击文字也能切换开关
                const nodeInstallerText = nodeInstallerGuideToggle.closest('.hive-settings-auto-translate-label')?.querySelector('span');
                if (nodeInstallerText) {
                    nodeInstallerText.style.cursor = 'pointer';
                    nodeInstallerText.onclick = () => {
                        nodeInstallerGuideToggle.checked = !nodeInstallerGuideToggle.checked;
                        nodeInstallerGuideToggle.onchange();
                    };
                }
            }
            
            // 模型下载器提示开关
            const modelDownloaderGuideToggle = modal.querySelector('.hive-model-downloader-guide-toggle');
            if (modelDownloaderGuideToggle) {
                modelDownloaderGuideToggle.onchange = () => {
                    const dontShow = modelDownloaderGuideToggle.checked;
                    localStorage.setItem('hive_model_downloader_guide_dont_show', dontShow ? 'true' : 'false');
                    showToast(getText('toast.settingsSaved', 'Settings saved'), 'success');
                };
                
                // 点击文字也能切换开关
                const modelDownloaderText = modelDownloaderGuideToggle.closest('.hive-settings-auto-translate-label')?.querySelector('span');
                if (modelDownloaderText) {
                    modelDownloaderText.style.cursor = 'pointer';
                    modelDownloaderText.onclick = () => {
                        modelDownloaderGuideToggle.checked = !modelDownloaderGuideToggle.checked;
                        modelDownloaderGuideToggle.onchange();
                    };
                }
            }

            // 邮箱点击复制
            const emailEl = modal.querySelector('.hive-settings-about-email');
            if (emailEl) {
                emailEl.onclick = async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const email = 'luguoli@vip.qq.com';
                    try {
                        await navigator.clipboard.writeText(email);
                        showToast(getText('toast.emailCopied', 'Email copied to clipboard'), 'success');
                    } catch (err) {
                        // 降级方案
                        const textarea = document.createElement('textarea');
                        textarea.value = email;
                        textarea.style.position = 'fixed';
                        textarea.style.opacity = '0';
                        document.body.appendChild(textarea);
                        textarea.select();
                        try {
                            document.execCommand('copy');
                            showToast(getText('toast.emailCopied', 'Email copied to clipboard'), 'success');
                        } catch (e2) {
                            showToast(getText('common.copyFailed', 'Copy failed, please copy manually'), 'error');
                        }
                        document.body.removeChild(textarea);
                    }
                };
            }

            // 为设置界面添加文字选择支持
            const setupModalCopySupport = (modalEl) => {
                if (!modalEl) return;
                
                // 设置DOM属性
                modalEl.style.webkitUserSelect = 'text';
                modalEl.style.mozUserSelect = 'text';
                modalEl.style.msUserSelect = 'text';
                modalEl.style.userSelect = 'text';
                
                // 阻止事件冒泡到Canvas
                modalEl.addEventListener('pointerdown', function(e) {
                    e.stopPropagation();
                }, true);
                modalEl.addEventListener('mousedown', function(e) {
                    e.stopPropagation();
                }, true);
                modalEl.addEventListener('wheel', function(e) {
                    e.stopPropagation();
                }, true);
                modalEl.addEventListener('contextmenu', function(e) {
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                }, true);
                modalEl.addEventListener('selectstart', function(e) {
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                }, true);
                modalEl.addEventListener('copy', function(e) {
                    e.stopPropagation();
                }, true);
            };
            
            setupModalCopySupport(modal);

            // 反馈按钮
            const feedbackBtn = modal.querySelector('.hive-settings-feedback-btn');
            if (feedbackBtn) {
                feedbackBtn.onclick = () => {
                    modal.remove();
                    showFeedbackModal();
                };
            }

            document.body.appendChild(modal);
        };

        // 显示反馈弹层
        function showFeedbackModal() {
            if (document.getElementById('hive-feedback-modal')) return;

            const currentUser = getCurrentUser();
            const isZh = getCurrentLanguage() === 'zh';

            const modal = document.createElement('div');
            modal.id = 'hive-feedback-modal';
            const tt = (key) => typeof window !== 'undefined' && typeof window.t === 'function' ? window.t(key) : (isZh ? key : key);
            
            modal.innerHTML = `
                <div class="hive-feedback-overlay">
                    <div class="hive-feedback-content">
                        <div class="hive-feedback-header">
                            <h2>${getText('feedback.title', '💬 Feedback')}</h2>
                            <button class="hive-feedback-close" title="${getText('common.close', 'Close')}">×</button>
                        </div>
                        <div class="hive-feedback-body">
                            <div class="hive-feedback-form-group">
                                <label>${getText('feedback.titleLabel', 'Title')}</label>
                                <input type="text" class="hive-feedback-input" id="feedback-title" placeholder="${getText('feedback.titlePlaceholder', 'Enter feedback title')}" maxlength="100">
                            </div>
                            <div class="hive-feedback-form-group">
                                <label>${getText('feedback.contentLabel', 'Content')}</label>
                                <textarea class="hive-feedback-textarea" id="feedback-content" placeholder="${getText('feedback.contentPlaceholder', 'Enter feedback content...')}" rows="6" maxlength="1000"></textarea>
                            </div>
                            <div class="hive-feedback-info">
                                ${getText('feedback.note', 'Submitting feedback will include your user information and current plugin version.')}
                            </div>
                        </div>
                        <div class="hive-feedback-footer">
                            <button class="hive-feedback-btn-cancel">${getText('common.cancel', 'Cancel')}</button>
                            <button class="hive-feedback-btn-submit">${getText('feedback.submit', 'Submit')}</button>
                        </div>
                    </div>
                </div>
            `;

            // 绑定关闭事件
            const closeModal = () => {
                modal.remove();
                // 关闭反馈弹层时，不关闭侧边栏（通过hasOpenModal检查机制自动处理）
            };

            const closeBtn = modal.querySelector('.hive-feedback-close');
            const cancelBtn = modal.querySelector('.hive-feedback-btn-cancel');
            const submitBtn = modal.querySelector('.hive-feedback-btn-submit');
            const overlay = modal.querySelector('.hive-feedback-overlay');
            const titleInput = modal.querySelector('#feedback-title');
            const contentTextarea = modal.querySelector('#feedback-content');

            closeBtn.onclick = closeModal;
            cancelBtn.onclick = closeModal;
            overlay.onclick = (e) => {
                if (e.target === overlay) {
                    closeModal();
                }
            };

            // 提交反馈
            submitBtn.onclick = async () => {
                let title = (titleInput.value || '').trim();
                let content = (contentTextarea.value || '').trim();

                // 基本安全检查和清理：去除HTML标签和脚本
                title = sanitizeInput(title);
                content = sanitizeInput(content);

                // 长度限制（已经在HTML中设置maxlength，这里作为双重检查）
                const tt = (key) => typeof window !== 'undefined' && typeof window.t === 'function' ? window.t(key) : (isZh ? key : key);
                
                if (title.length > 100) {
                    showToast(tt('feedback.titleTooLong'), 'warning');
                    titleInput.focus();
                    return;
                }

                if (content.length > 1000) {
                    showToast(tt('feedback.contentTooLong'), 'warning');
                    contentTextarea.focus();
                    return;
                }

                if (!title) {
                    showToast(tt('feedback.titleRequired'), 'warning');
                    titleInput.focus();
                    return;
                }

                if (title.length < 2) {
                    showToast(tt('feedback.titleMinLength'), 'warning');
                    titleInput.focus();
                    return;
                }

                if (!content) {
                    showToast(tt('feedback.contentRequired'), 'warning');
                    contentTextarea.focus();
                    return;
                }

                if (content.length < 5) {
                    showToast(tt('feedback.contentMinLength'), 'warning');
                    contentTextarea.focus();
                    return;
                }

                submitBtn.disabled = true;
                submitBtn.textContent = tt('feedback.submitting');

                try {
                    await submitFeedback(title, content, PLUGIN_VERSION);
                    const feedbackSubmittedText = getText('toast.feedbackSubmitted', 'Feedback submitted successfully, thank you!');
                    showToast(feedbackSubmittedText, 'success');
                    closeModal();
                } catch (error) {
                    console.error('🐝 Hive: Submit feedback error:', error);
                    const submitFailedText = getText('toast.submitFailed', 'Submit failed: ');
                    showToast(submitFailedText + error.message, 'error');
                } finally {
                    submitBtn.disabled = false;
                    submitBtn.textContent = tt('feedback.submit');
                }
            };

            // Esc键关闭
            const handleKeyDown = (e) => {
                if (e.key === 'Escape') {
                    closeModal();
                    document.removeEventListener('keydown', handleKeyDown);
                }
            };
            document.addEventListener('keydown', handleKeyDown);

            // 为反馈弹层添加文字选择支持
            const setupModalCopySupport = (modalEl) => {
                if (!modalEl) return;
                
                modalEl.style.webkitUserSelect = 'text';
                modalEl.style.mozUserSelect = 'text';
                modalEl.style.msUserSelect = 'text';
                modalEl.style.userSelect = 'text';
                
                modalEl.addEventListener('pointerdown', function(e) {
                    e.stopPropagation();
                }, true);
                modalEl.addEventListener('mousedown', function(e) {
                    e.stopPropagation();
                }, true);
                modalEl.addEventListener('wheel', function(e) {
                    e.stopPropagation();
                }, true);
                modalEl.addEventListener('contextmenu', function(e) {
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                }, true);
                modalEl.addEventListener('selectstart', function(e) {
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                }, true);
                modalEl.addEventListener('copy', function(e) {
                    e.stopPropagation();
                }, true);
            };
            
            setupModalCopySupport(modal);

            document.body.appendChild(modal);
            // 自动聚焦到标题输入框
            setTimeout(() => {
                titleInput.focus();
            }, 100);
        }

        // 显示更新通知（非强制）
        async function showUpdateNotification(latestVersion, message) {
            const isZh = getCurrentLanguage() === 'zh';
            const defaultMessage = typeof window !== 'undefined' && typeof window.t === 'function' 
                ? window.t('update.newVersionAvailable', { version: latestVersion })
                : `New version v${latestVersion} available. Please update for better experience.`;
            
            // 获取GitHub链接配置
            const config = await getPluginConfig();
            const githubLinks = config.githubLinks || [];
            
            // 生成GitHub链接按钮HTML
            let githubButtonsHtml = '';
            if (githubLinks.length > 0) {
                githubButtonsHtml = githubLinks.map(link => 
                    `<button class="hive-update-btn-github" data-url="${link.url}">${link.name}</button>`
                ).join('');
            } else {
                githubButtonsHtml = `<button class="hive-update-btn-github" data-url="https://github.com/luguoli/ComfyUI-Hive">${getText('update.goToGitHub', 'Go to GitHub')}</button>`;
            }
            
            const modal = document.createElement('div');
            modal.id = 'hive-update-notification-modal';
            modal.innerHTML = `
                <div class="hive-update-overlay">
                    <div class="hive-update-content">
                        <div class="hive-update-header">
                            <h2>${getText('update.title', '📦 Version Update')}</h2>
                            <button class="hive-update-close" title="${getText('common.close', 'Close')}">×</button>
                        </div>
                        <div class="hive-update-body">
                            <p>${message || defaultMessage}</p>
                            <div class="hive-update-actions">
                                <button class="hive-update-btn-dismiss">${getText('update.remindLater', 'Remind Later')}</button>
                                <button class="hive-update-btn-dont-remind">${getText('update.dontRemindThisVersion', 'Don\'t Remind This Version')}</button>
                                ${githubButtonsHtml}
                            </div>
                        </div>
                    </div>
                </div>
            `;

            const closeModal = () => {
                modal.remove();
                // 关闭弹窗时，不关闭侧边栏（通过hasOpenModal检查机制自动处理）
            };

            const normalizedLatestVersion = normalizeVersion(latestVersion);

            modal.querySelector('.hive-update-close').onclick = closeModal;
            
            // 稍后提醒
            modal.querySelector('.hive-update-btn-dismiss').onclick = () => {
                closeModal();
            };
            
            // 该版本不再提醒
            modal.querySelector('.hive-update-btn-dont-remind').onclick = () => {
                const dontRemindVersions = JSON.parse(localStorage.getItem('hive_dont_remind_versions') || '[]');
                if (!dontRemindVersions.includes(normalizedLatestVersion)) {
                    dontRemindVersions.push(normalizedLatestVersion);
                    localStorage.setItem('hive_dont_remind_versions', JSON.stringify(dontRemindVersions));
                }
                showToast(getText('toast.dontRemindVersion', 'This version will not be reminded'), 'success');
                closeModal();
            };
            
            // 所有GitHub链接按钮
            modal.querySelectorAll('.hive-update-btn-github').forEach(btn => {
                btn.onclick = () => {
                    const url = btn.dataset.url || 'https://github.com/luguoli/ComfyUI-Hive';
                    window.open(url, '_blank');
                    closeModal();
                };
            });

            modal.querySelector('.hive-update-overlay').onclick = (e) => {
                if (e.target.classList.contains('hive-update-overlay')) {
                    closeModal();
                }
            };

            // Esc键关闭
            const handleKeyDown = (e) => {
                if (e.key === 'Escape') {
                    closeModal();
                    document.removeEventListener('keydown', handleKeyDown);
                }
            };
            document.addEventListener('keydown', handleKeyDown);

            document.body.appendChild(modal);
        }

        // 显示强制更新蒙版
        async function showForceUpdateModal(latestVersion, message) {
            // 设置强制更新标志
            isForceUpdate = true;
            
            const isZh = getCurrentLanguage() === 'zh';
            const defaultMessage = typeof window !== 'undefined' && typeof window.t === 'function' 
                ? window.t('update.forceUpdateMessage', { version: latestVersion })
                : `This version requires a mandatory update to v${latestVersion} to continue. Please download the latest version from GitHub.`;
            
            // 获取GitHub链接配置
            const config = await getPluginConfig();
            const githubLinks = config.githubLinks || [];
            
            // 生成GitHub链接按钮HTML（侧边栏蒙版显示所有链接）
            let sidebarGithubButtonsHtml = '';
            if (githubLinks.length > 0) {
                sidebarGithubButtonsHtml = githubLinks.map(link => 
                    `<button class="hive-force-update-btn" data-url="${link.url}">${link.name}</button>`
                ).join('');
            } else {
                sidebarGithubButtonsHtml = `<button class="hive-force-update-btn" data-url="https://github.com/luguoli/ComfyUI-Hive">${getText('update.goToGitHubDownload', 'Go to GitHub')}</button>`;
            }
            
            // 在侧边栏上覆盖蒙版
            const sidebar = document.getElementById('hive-sidebar');
            if (sidebar) {
                let forceUpdateOverlay = sidebar.querySelector('.hive-force-update-overlay');
                if (!forceUpdateOverlay) {
                    forceUpdateOverlay = document.createElement('div');
                    forceUpdateOverlay.className = 'hive-force-update-overlay';
                    sidebar.appendChild(forceUpdateOverlay);
                }
                
                // 更新或创建蒙版内容（始终使用最新的配置，显示所有GitHub链接）
                forceUpdateOverlay.innerHTML = `
                    <div class="hive-force-update-content">
                        <div class="hive-force-update-icon">⚠️</div>
                        <h2>${getText('update.updateRequired', 'Update Required')}</h2>
                        <p>${message || defaultMessage}</p>
                        <div class="hive-force-update-actions">
                            ${sidebarGithubButtonsHtml}
                        </div>
                    </div>
                `;
                
                // 绑定所有GitHub链接按钮的点击事件
                forceUpdateOverlay.querySelectorAll('.hive-force-update-btn').forEach(btn => {
                    btn.onclick = () => {
                        const url = btn.dataset.url || 'https://github.com/luguoli/ComfyUI-Hive';
                        window.open(url, '_blank');
                    };
                });
            }

            // 生成GitHub链接按钮HTML（弹窗）
            let githubButtonsHtml = '';
            if (githubLinks.length > 0) {
                githubButtonsHtml = githubLinks.map(link => 
                    `<button class="hive-update-btn-github" data-url="${link.url}">${link.name}</button>`
                ).join('');
            } else {
                githubButtonsHtml = `<button class="hive-update-btn-github" data-url="https://github.com/luguoli/ComfyUI-Hive">${getText('update.goToGitHubDownload', 'Go to GitHub')}</button>`;
            }

            // 同时显示弹层提示
            const modal = document.createElement('div');
            modal.id = 'hive-force-update-modal';
            modal.innerHTML = `
                <div class="hive-update-overlay">
                    <div class="hive-update-content hive-update-force">
                        <div class="hive-update-header">
                            <h2>${getText('update.forceUpdateTitle', '⚠️ Force Update Required')}</h2>
                            <button class="hive-update-close" title="${getText('common.close', 'Close')}">×</button>
                        </div>
                        <div class="hive-update-body">
                            <p>${message || defaultMessage}</p>
                            <div class="hive-update-actions">
                                ${githubButtonsHtml}
                            </div>
                        </div>
                    </div>
                </div>
            `;

            const closeModal = () => {
                modal.remove();
                // 关闭弹窗时，不关闭侧边栏（通过hasOpenModal检查机制自动处理）
                // 但强制更新时，侧边栏上的蒙版仍然保留，用户需要更新才能使用
            };

            modal.querySelector('.hive-update-close').onclick = closeModal;
            
            // 所有GitHub链接按钮
            modal.querySelectorAll('.hive-update-btn-github').forEach(btn => {
                btn.onclick = () => {
                    const url = btn.dataset.url || 'https://github.com/luguoli/ComfyUI-Hive';
                    window.open(url, '_blank');
                    closeModal();
                };
            });

            modal.querySelector('.hive-update-overlay').onclick = (e) => {
                // 强制更新时，点击空白区域不关闭弹窗
                // if (e.target.classList.contains('hive-update-overlay')) {
                //     closeModal();
                // }
            };

            // 强制更新时，不允许Esc键关闭
            // const handleKeyDown = (e) => {
            //     if (e.key === 'Escape') {
            //         closeModal();
            //         document.removeEventListener('keydown', handleKeyDown);
            //     }
            // };
            // document.addEventListener('keydown', handleKeyDown);

            document.body.appendChild(modal);
        }

        // 规范化版本号辅助函数（与hive_data.js中的相同逻辑）
        function normalizeVersion(version) {
            if (!version) return '0.0.0';
            let normalized = version.trim().replace(/^v/i, '');
            normalized = normalized.replace(/[^\d.]/g, '');
            if (!normalized) return '0.0.0';
            return normalized;
        }

        // 创建侧边栏 DOM
        sidebar = document.createElement("div");
        sidebar.id = "hive-sidebar";
        sidebar.innerHTML = `
            <div class="hive-header">
                <span>🐝 Hive Hub</span>
                <div class="hive-header-buttons">
                    <span class="hive-settings-btn">⚙️</span>
                    <span class="hive-close-btn">✕</span>
                </div>
            </div>
            <div id="hive-main-tabs">
                <div class="active" data-i18n-square>Square</div>
                <div data-i18n-inspiration>Inspiration</div>
            </div>
            <div id="hive-content-wrapper">
                <div id="hive-view-square" class="hidden">
                    <div id="hive-channel-list">
                        <!-- 频道列表 -->
                        <div class="loading" data-i18n-connecting>Connecting...</div>
                    </div>
                    <div id="hive-chat-room" class="hidden">
                        <div class="chat-header">
                            <span class="back-btn" data-i18n-back>&lt; Back</span>
                            <span class="channel-title"></span>
                        </div>
                        <div class="chat-messages">
                            <!-- 消息 -->
                        </div>
                        <div class="chat-input-area">
                            <div class="chat-input-row">
                                <textarea class="chat-input-textarea" placeholder="" data-i18n-placeholder-chat></textarea>
                                <button class="chat-send-btn" data-i18n-send>Send</button>
                            </div>
                        </div>
                    </div>
                </div>
                <div id="hive-view-inspiration" class="hidden">
                    <div class="gallery-filters">
                        <!-- 分类按钮将动态加载 -->
                    </div>
                    <div class="hive-insp-toolbar">
                        <div class="hive-insp-search-wrapper">
                            <input class="hive-insp-search" placeholder="" data-i18n-placeholder-search />
                            <button class="hive-insp-search-clear" style="display: none;" title="" data-i18n-clear-title>✕</button>
                            <button class="hive-insp-search-btn" title="" data-i18n-search-title>🔍</button>
                        </div>
                        <div class="hive-insp-sort">
                            <button data-sort="latest" class="active" data-i18n-sort-latest>Latest</button>
                            <button data-sort="most_likes" data-i18n-sort-likes>Most Likes</button>
                            <button data-sort="most_favorites" data-i18n-sort-favorites>Most Favorites</button>
                        </div>
                    </div>
                    <div class="hive-tag-filters"></div>
                    <div class="gallery-grid">
                        <!-- 灵感列表 -->
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(sidebar);

        // 更新UI文本（根据语言设置）- 提升为全局函数以便语言切换时调用
        window.hiveUpdateUITexts = function updateUITexts() {
            const currentLang = getCurrentLanguage(); // 'zh' or 'en'
            const isZh = currentLang === 'zh';
            
            // 翻译函数辅助（必须在函数开头定义，在使用之前）
            const tt = (key) => {
                if (typeof window !== 'undefined' && typeof window.t === 'function') {
                    return window.t(key);
                }
                // 如果语言文件未加载，使用 key 作为回退
                return key;
            };

            // 更新主标签页
            const squareTab = sidebar.querySelector('#hive-main-tabs > div:first-child');
            const inspirationTab = sidebar.querySelector('#hive-main-tabs > div:last-child');
            if (squareTab) squareTab.textContent = tt('inspiration.square');
            if (inspirationTab) inspirationTab.textContent = tt('inspiration.inspiration');

            // 更新返回按钮
            const backBtn = sidebar.querySelector('.back-btn');
            
            if (backBtn) backBtn.textContent = tt('inspiration.back');

            // 更新聊天输入框占位符
            const chatTextarea = sidebar.querySelector('.chat-input-textarea');
            if (chatTextarea) {
                chatTextarea.placeholder = tt('inspiration.saySomething');
            }

            // 更新发送按钮
            const sendBtn = sidebar.querySelector('.chat-send-btn');
            if (sendBtn) sendBtn.textContent = tt('inspiration.send');

            // 更新搜索框占位符
            const searchInput = sidebar.querySelector('.hive-insp-search');
            if (searchInput) {
                searchInput.placeholder = tt('inspiration.searchPlaceholder');
            }

            // 更新搜索按钮标题
            const searchBtn = sidebar.querySelector('.hive-insp-search-btn');
            if (searchBtn) {
                searchBtn.title = tt('inspiration.search');
            }
            
            // 更新清除按钮标题
            const clearBtn = sidebar.querySelector('.hive-insp-search-clear');
            if (clearBtn) {
                clearBtn.title = tt('inspiration.clear');
            }

            // 更新排序按钮
            const sortLatestBtn = sidebar.querySelector('.hive-insp-sort button[data-sort="latest"]');
            const sortLikesBtn = sidebar.querySelector('.hive-insp-sort button[data-sort="most_likes"]');
            const sortFavoritesBtn = sidebar.querySelector('.hive-insp-sort button[data-sort="most_favorites"]');
            if (sortLatestBtn) sortLatestBtn.textContent = tt('inspiration.latest');
            if (sortLikesBtn) sortLikesBtn.textContent = tt('inspiration.mostLikes');
            if (sortFavoritesBtn) sortFavoritesBtn.textContent = tt('inspiration.mostFavorites');

            // 更新加载提示
            const loadingEl = sidebar.querySelector('#hive-channel-list .loading');
            if (loadingEl) {
                loadingEl.textContent = tt('toast.connecting');
            }
        };

        // 初始化时更新UI文本（延迟一点确保语言文件已加载）
        // 使用多种方式确保语言文件加载完成后更新
        const updateOnReady = () => {
            if (typeof window !== 'undefined' && typeof window.t === 'function' && typeof window.hiveUpdateUITexts === 'function') {
                window.hiveUpdateUITexts();
            }
        };
        
        // 立即尝试（语言文件可能已加载）
        updateOnReady();
        
        // 延迟再试一次（确保语言文件加载完成）
        setTimeout(updateOnReady, 100);
        setTimeout(updateOnReady, 500);

        // 绑定基础事件
        sidebar.querySelector(".hive-close-btn").onclick = () => {
            sidebar.classList.remove("open");
        };
        sidebar.querySelector(".hive-settings-btn").onclick = showSettingsModal;
        document.querySelector('.back-btn').onclick = backToChannels;

        // 添加文件上传工具栏
        const inputArea = sidebar.querySelector('.chat-input-area');
        const uploadToolbar = createUploadToolbar(handleFileSelect, handleFileSelect);
        inputArea.insertBefore(uploadToolbar, inputArea.firstChild);

// 自动调整输入框高度
function autoResizeTextarea(textarea) {
    if (!textarea) return;
    
    // 重置高度以获取正确的 scrollHeight
    textarea.style.height = 'auto';
    
    // 获取计算后的最大高度（考虑 padding）
    const computedStyle = window.getComputedStyle(textarea);
    const maxHeight = parseInt(computedStyle.maxHeight) || 120;
    
    // 设置高度为内容高度，但不超过最大高度
    const newHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = newHeight + 'px';
    
    // 如果内容超过最大高度，显示滚动条
    if (textarea.scrollHeight > maxHeight) {
        textarea.style.overflowY = 'auto';
    } else {
        textarea.style.overflowY = 'hidden';
    }
}

// 绑定输入框事件
const sendBtn = sidebar.querySelector('.chat-send-btn');
const inputTextarea = sidebar.querySelector('.chat-input-textarea');

if (sendBtn && inputTextarea) {
    sendBtn.onclick = sendMessageToChannel;
    
    // 输入时自动调整高度
    inputTextarea.addEventListener('input', () => {
        autoResizeTextarea(inputTextarea);
    });
    
    // 初始化高度
    autoResizeTextarea(inputTextarea);
    
    inputTextarea.onkeydown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessageToChannel();
        }
    };
}

        // 添加拖拽上传支持
        let dragOverlay = null;

        inputArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation(); // 阻止事件冒泡，防止ComfyUI自动加载文件
            inputArea.classList.add('drag-over');

            if (!dragOverlay) {
                dragOverlay = document.createElement('div');
                dragOverlay.id = 'hive-drag-overlay';
                const dragDropText = getText('toast.dragDropFiles', '📎<br>Drag and drop files here');
                dragOverlay.innerHTML = dragDropText;
                dragOverlay.style.cssText = `
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(255, 189, 46, 0.8);
                    color: #000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 18px;
                    font-weight: bold;
                    border-radius: 8px;
                    pointer-events: none;
                    z-index: 10;
                `;
                inputArea.style.position = 'relative';
                inputArea.appendChild(dragOverlay);
            }
        });

        inputArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            const rect = inputArea.getBoundingClientRect();
            const x = e.clientX, y = e.clientY;

            if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
                inputArea.classList.remove('drag-over');
                if (dragOverlay) {
                    dragOverlay.remove();
                    dragOverlay = null;
                }
            }
        });

        inputArea.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation(); // 阻止事件冒泡，防止ComfyUI自动加载文件
            inputArea.classList.remove('drag-over');
            if (dragOverlay) {
                dragOverlay.remove();
                dragOverlay = null;
            }

            const files = Array.from(e.dataTransfer.files);
            if (files.length > 0 && currentChannel) {
                const file = files[0];
                // 验证文件格式
                const validation = validateFileFormat(file);
                if (!validation.valid) {
                    showToast(validation.message, 'error');
                    return;
                }
                handleFileSelect(file);
            }
        });

        // 显示/隐藏加载蒙版
        function showInspirationLoading(show) {
            const view = document.getElementById('hive-view-inspiration');
            if (!view) return;
            
            let loadingOverlay = view.querySelector('.hive-inspiration-loading-overlay');
            if (show) {
                if (!loadingOverlay) {
                    loadingOverlay = document.createElement('div');
                    loadingOverlay.className = 'hive-inspiration-loading-overlay';
                    loadingOverlay.innerHTML = '<div class="hive-inspiration-loading-spinner"></div>';
                    view.appendChild(loadingOverlay);
                }
                loadingOverlay.style.display = 'flex';
            } else {
                if (loadingOverlay) {
                    loadingOverlay.style.display = 'none';
                }
            }
        }

        // 加载灵感列表
        async function loadInspirationList() {
            try {
                showInspirationLoading(true);
                
                const { category, keyword, tagIds, favoritesOnly, sort, page } = inspirationState;
                
                // 根据分类设置不同的每页数量
                // 图片、视频、工作流、教程：20条/页
                // 模型、节点：10条/页
                const pageSize = (category === 'model' || category === 'node') ? 10 : 20;
                
                const { items, total } = await searchInspiration({
                    category,
                    keyword,
                    tagIds,
                    onlyNoTag: inspirationState.onlyNoTag,
                    favoritesOnly,
                    sort,
                    page,
                    pageSize
                });
                inspirationState.total = total || 0;

                renderInspirationItems({
                    items,
                    category,
                    page,
                    pageSize,
                    total,
                    onLikeClick: handleInspirationLikeClick,
                    onFavoriteClick: handleInspirationFavoriteClick,
                    onLoadWorkflowClick: handleInspirationLoadWorkflow,
                    onCopyModelLink: () => {},
                    onInstallNodeClick: handleInspirationInstallNode,
                    onDownloadModelClick: handleInspirationDownloadModel,
                    onOpenTutorial: () => {},
                    onPageChange: (newPage) => {
                        inspirationState.page = newPage;
                        loadInspirationList();
                    }
                });
            } catch (error) {
                console.error('🐝 Hive: loadInspirationList error:', error);
                const loadInspirationFailedText = getText('toast.loadInspirationFailed', 'Failed to load inspiration content: ');
                showToast(loadInspirationFailedText + error.message, 'error');
            } finally {
                showInspirationLoading(false);
            }
        }

        async function handleInspirationLikeClick(item) {
            try {
                // 找到对应的DOM元素
                const gridEl = document.querySelector('#hive-view-inspiration .gallery-grid');
                if (!gridEl) return;
                
                // 通过data-item-id找到对应的卡片
                const card = gridEl.querySelector(`[data-item-id="${item.id}"]`);
                if (!card) return;
                
                // 找到点赞按钮
                const likeBtn = card.querySelector('.hive-insp-like');
                if (!likeBtn) return;
                
                // 防止重复点击：检查按钮是否正在处理中
                if (likeBtn.disabled || likeBtn.dataset.processing === 'true') {
                    return;
                }
                
                // 标记为处理中并禁用按钮
                likeBtn.disabled = true;
                likeBtn.dataset.processing = 'true';
                likeBtn.style.opacity = '0.6';
                likeBtn.style.cursor = 'not-allowed';
                
                // 记录开始时间，用于最小延迟
                const startTime = Date.now();
                const minDelay = 300; // 最小延迟300ms，防止快速重复点击
                
                // 执行点赞操作
                await likeInspirationItem(item.id);
                
                // 重新获取当前页的数据，但保持列表顺序不变，只更新对应项的显示
                const { category, keyword, tagIds, favoritesOnly, sort, page, pageSize } = inspirationState;
                let items = [];
                try {
                    const result = await searchInspiration({
                        category,
                        keyword,
                        tagIds,
                        onlyNoTag: inspirationState.onlyNoTag,
                        favoritesOnly,
                        sort,
                        page,
                        pageSize
                    });
                    items = result.items || [];
                } catch (searchError) {
                    console.error('🐝 Hive: Failed to refresh data after like:', searchError);
                    // 如果查询失败，仍然恢复按钮状态，然后重新加载列表
                    const elapsed = Date.now() - startTime;
                    if (elapsed < minDelay) {
                        await new Promise(resolve => setTimeout(resolve, minDelay - elapsed));
                    }
                    likeBtn.disabled = false;
                    likeBtn.dataset.processing = 'false';
                    likeBtn.style.opacity = '';
                    likeBtn.style.cursor = '';
                    loadInspirationList();
                    return;
                }
                
                // 找到更新后的item数据
                const updatedItem = items.find(i => i.id === item.id);
                if (updatedItem) {
                    // 更新点赞按钮的显示和状态
                    likeBtn.textContent = `👍 ${updatedItem.likes_count ?? 0}`;
                    // 根据更新后的数据添加或移除active类
                    if (updatedItem.user_liked) {
                        likeBtn.classList.add('active');
                    } else {
                        likeBtn.classList.remove('active');
                    }
                    
                    // 确保最小延迟时间
                    const elapsed = Date.now() - startTime;
                    if (elapsed < minDelay) {
                        await new Promise(resolve => setTimeout(resolve, minDelay - elapsed));
                    }
                    
                    // 恢复按钮状态
                    likeBtn.disabled = false;
                    likeBtn.dataset.processing = 'false';
                    likeBtn.style.opacity = '';
                    likeBtn.style.cursor = '';
                } else {
                    // 如果item不在查询结果中（可能在"我的收藏"模式下被移除了），重新加载整个列表
                    // 确保最小延迟时间
                    const elapsed = Date.now() - startTime;
                    if (elapsed < minDelay) {
                        await new Promise(resolve => setTimeout(resolve, minDelay - elapsed));
                    }
                    // 重新加载列表以反映变化
                    loadInspirationList();
                }
            } catch (error) {
                console.error('🐝 Hive: like inspiration error:', error);
                const likeFailedText = getText('toast.likeFailed', 'Failed to like: ');
                showToast(likeFailedText + error.message, 'error');
                
                // 出错时也要恢复按钮状态，需要重新查找DOM元素（可能已经变化）
                try {
                    const gridEl = document.querySelector('#hive-view-inspiration .gallery-grid');
                    if (gridEl) {
                        const card = gridEl.querySelector(`[data-item-id="${item.id}"]`);
                        if (card) {
                            const likeBtn = card.querySelector('.hive-insp-like');
                            if (likeBtn) {
                                likeBtn.disabled = false;
                                likeBtn.dataset.processing = 'false';
                                likeBtn.style.opacity = '';
                                likeBtn.style.cursor = '';
                            }
                        }
                    }
                } catch (domError) {
                    console.warn('🐝 Hive: Failed to restore button state after error:', domError);
                    // 如果DOM查找失败，可能是页面已经重新渲染，重新加载列表
                    loadInspirationList();
                }
            }
        }

        async function handleInspirationFavoriteClick(item) {
            try {
                // 找到对应的DOM元素
                const gridEl = document.querySelector('#hive-view-inspiration .gallery-grid');
                if (!gridEl) return;
                
                // 通过data-item-id找到对应的卡片
                const card = gridEl.querySelector(`[data-item-id="${item.id}"]`);
                if (!card) return;
                
                // 找到收藏按钮
                const favBtn = card.querySelector('.hive-insp-fav');
                if (!favBtn) return;
                
                // 防止重复点击：检查按钮是否正在处理中
                if (favBtn.disabled || favBtn.dataset.processing === 'true') {
                    return;
                }
                
                // 标记为处理中并禁用按钮
                favBtn.disabled = true;
                favBtn.dataset.processing = 'true';
                favBtn.style.opacity = '0.6';
                favBtn.style.cursor = 'not-allowed';
                
                // 记录开始时间，用于最小延迟
                const startTime = Date.now();
                const minDelay = 300; // 最小延迟300ms，防止快速重复点击
                
                // 执行收藏操作
                await favoriteInspirationItem(item.id);
                
                // 重新获取当前页的数据，但保持列表顺序不变，只更新对应项的显示
                const { category, keyword, tagIds, favoritesOnly, sort, page, pageSize } = inspirationState;
                let items = [];
                try {
                    const result = await searchInspiration({
                        category,
                        keyword,
                        tagIds,
                        onlyNoTag: inspirationState.onlyNoTag,
                        favoritesOnly,
                        sort,
                        page,
                        pageSize
                    });
                    items = result.items || [];
                } catch (searchError) {
                    console.error('🐝 Hive: Failed to refresh data after favorite:', searchError);
                    // 如果查询失败，仍然恢复按钮状态，然后重新加载列表
                    const elapsed = Date.now() - startTime;
                    if (elapsed < minDelay) {
                        await new Promise(resolve => setTimeout(resolve, minDelay - elapsed));
                    }
                    favBtn.disabled = false;
                    favBtn.dataset.processing = 'false';
                    favBtn.style.opacity = '';
                    favBtn.style.cursor = '';
                    loadInspirationList();
                    return;
                }
                
                // 找到更新后的item数据
                const updatedItem = items.find(i => i.id === item.id);
                if (updatedItem) {
                    // 更新收藏按钮的显示和状态
                    favBtn.textContent = `⭐ ${updatedItem.favorites_count ?? 0}`;
                    // 根据更新后的数据添加或移除active类
                    if (updatedItem.user_favorited) {
                        favBtn.classList.add('active');
                    } else {
                        favBtn.classList.remove('active');
                    }
                    
                    // 确保最小延迟时间
                    const elapsed = Date.now() - startTime;
                    if (elapsed < minDelay) {
                        await new Promise(resolve => setTimeout(resolve, minDelay - elapsed));
                    }
                    
                    // 恢复按钮状态
                    favBtn.disabled = false;
                    favBtn.dataset.processing = 'false';
                    favBtn.style.opacity = '';
                    favBtn.style.cursor = '';
                } else {
                    // 如果item不在查询结果中（在"我的收藏"模式下取消收藏后会被移除），重新加载整个列表
                    // 确保最小延迟时间
                    const elapsed = Date.now() - startTime;
                    if (elapsed < minDelay) {
                        await new Promise(resolve => setTimeout(resolve, minDelay - elapsed));
                    }
                    // 重新加载列表以反映变化（item会被从列表中移除）
                    loadInspirationList();
                }
            } catch (error) {
                console.error('🐝 Hive: favorite inspiration error:', error);
                const favoriteFailedText = getText('toast.favoriteFailed', 'Failed to favorite: ');
                showToast(favoriteFailedText + error.message, 'error');
                
                // 出错时也要恢复按钮状态，需要重新查找DOM元素（可能已经变化）
                try {
                    const gridEl = document.querySelector('#hive-view-inspiration .gallery-grid');
                    if (gridEl) {
                        const card = gridEl.querySelector(`[data-item-id="${item.id}"]`);
                        if (card) {
                            const favBtn = card.querySelector('.hive-insp-fav');
                            if (favBtn) {
                                favBtn.disabled = false;
                                favBtn.dataset.processing = 'false';
                                favBtn.style.opacity = '';
                                favBtn.style.cursor = '';
                            }
                        }
                    }
                } catch (domError) {
                    console.warn('🐝 Hive: Failed to restore button state after error:', domError);
                    // 如果DOM查找失败，可能是页面已经重新渲染，重新加载列表
                    loadInspirationList();
                }
            }
        }

        async function handleInspirationLoadWorkflow(item) {
            // 与广场聊天里的参数名一致：workflow_data（兼容旧的 workflow_ref）
            const workflowData = item.workflow_data || item.workflow_ref;
            const workflowRefType = item.workflow_ref_type;
            const workflowRefIsUrl = item.workflow_ref_is_url;
            
            if (!workflowData) {
                const workflowNotConfiguredText = getText('toast.workflowNotConfigured', 'Workflow data not configured');
                showToast(workflowNotConfiguredText, 'warning');
                return;
            }
            
            // 询问用户是否确认加载工作流（与广场聊天里的逻辑一致）
                const confirmLoadText = getText('workflow.confirmLoad', 'Are you sure you want to load this workflow to the ComfyUI canvas?');
            const confirmed = await showConfirm(confirmLoadText);
            if (!confirmed) {
                return;
            }
            
            try {
                let data = null;
                
                // 判断 workflow_ref 是 URL 还是 JSON 文本
                // 优先使用数据库返回的 workflow_ref_type 字段
                const isUrl = workflowRefIsUrl !== undefined 
                    ? workflowRefIsUrl 
                    : (workflowRefType === 'url' || 
                       (typeof workflowData === 'string' && 
                        (workflowData.startsWith('http://') || 
                         workflowData.startsWith('https://') || 
                         workflowData.match(/\.json$/i))));
                
                if (isUrl) {
                    // 如果是 URL，从 URL 获取 JSON 内容
                    console.log('🐝 Hive: Loading workflow from URL:', workflowData);
                    const loadingWorkflowText = getText('toast.workflowLoadingFromUrl', 'Loading workflow from link...');
                    showToast(loadingWorkflowText, 'info');
                    
                    const response = await fetch(workflowData);
                    if (!response.ok) {
                        throw new Error(typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('toast.loadWorkflowFileFailed', { status: response.status, statusText: response.statusText }) : `Unable to load workflow file: ${response.status} ${response.statusText}`);
                    }
                    
                    const jsonText = await response.text();
                    data = JSON.parse(jsonText);
                    console.log('🐝 Hive: Workflow loaded from URL successfully');
                } else {
                    // 如果是 JSON 文本，直接解析
                    console.log('🐝 Hive: Loading workflow from JSON text');
                    data = typeof workflowData === 'string'
                        ? JSON.parse(workflowData)
                        : workflowData;
                }
                
                // 验证是否是有效的 ComfyUI 工作流
                if (!data || typeof data !== 'object' || !Array.isArray(data.nodes)) {
                    const invalidFormatText = getText('toast.invalidComfyUIWorkflowFormat', 'Invalid ComfyUI workflow format');
                    throw new Error(invalidFormatText);
                }
                    
                if (window.app && window.app.loadGraphData) {
                    window.app.loadGraphData(data);
                    showToast(getText('toast.workflowLoaded', 'Workflow loaded to canvas'), 'success');
                } else {
                    showToast(getText('toast.workflowLoadFailed', 'Unable to load workflow: ComfyUI not found'), 'error');
                }
            } catch (e) {
                console.error('🐝 Hive: load inspiration workflow error:', e);
                showToast(getText('toast.workflowLoadError', 'Failed to load workflow: ') + e.message, 'error');
            }
        }

        async function handleInspirationDownloadModel(item, url) {
            if (!url) {
                showToast(getText('toast.modelDownloadAddressInvalid', 'Model download address is invalid'), 'error');
                return;
            }
            
            // 不再显示弹层，而是直接加载模板工作流
            try {
                // 读取模板工作流文件
                const templatePath = '/extensions/ComfyUI-Hive/res/HiveModelDownloader.json';
                const response = await fetch(templatePath);
                
                if (!response.ok) {
                    throw new Error(typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('toast.loadTemplateFileFailed', { statusText: response.statusText }) : `Unable to load template file: ${response.statusText}`);
                }
                
                const templateWorkflow = await response.json();
                
                // 替换 ModelDownloadUrl 为实际的下载地址
                if (templateWorkflow.nodes && Array.isArray(templateWorkflow.nodes)) {
                    templateWorkflow.nodes.forEach(node => {
                        if (node.widgets_values && Array.isArray(node.widgets_values)) {
                            // 替换 widgets_values 中的 ModelDownloadUrl
                            node.widgets_values = node.widgets_values.map(value => {
                                if (value === 'ModelDownloadUrl') {
                                    return url;
                                }
                                return value;
                            });
                        }
                    });
                }
                
                // 在工作流的 extra 字段中添加文件名信息（用于标识）
                if (!templateWorkflow.extra) {
                    templateWorkflow.extra = {};
                }
                templateWorkflow.extra.workflow_name = 'HiveModelDownloader.json';
                
                // 加载工作流到 ComfyUI
                if (window.app && window.app.loadGraphData) {
                    window.app.loadGraphData(templateWorkflow);
                    
                    // 尝试设置工作流名称（如果 ComfyUI 支持）
                    setTimeout(() => {
                        try {
                            if (window.app && window.app.graph) {
                                // 尝试多种方式设置工作流名称
                                if (window.app.graph.setTitle) {
                                    window.app.graph.setTitle('HiveModelDownloader.json');
                                } else if (window.app.graph.setMetadata) {
                                    window.app.graph.setMetadata({ title: 'HiveModelDownloader.json' });
                                } else if (window.app.graph.extra) {
                                    window.app.graph.extra.workflow_name = 'HiveModelDownloader.json';
                                }
                            }
                        } catch (e) {
                            // 如果设置失败，忽略错误（文件名设置是可选的）
                            console.log('🐝 Hive: Unable to set workflow name, this is optional:', e);
                        }
                    }, 100);
                    
                    // 显示使用指南弹层（检查是否设置了不再提示）
                    const dontShowGuide = localStorage.getItem('hive_model_downloader_guide_dont_show') === 'true';
                    if (!dontShowGuide) {
                        setTimeout(() => {
                            showModelDownloaderGuide();
                        }, 300); // 延迟一点显示，确保工作流已加载
                    }
                    
                    showToast(getText('toast.modelDownloadWorkflowLoaded', 'Model download workflow loaded to canvas'), 'success');
                } else {
                    showToast(getText('toast.workflowLoadFailed', 'Unable to load workflow: ComfyUI not found'), 'error');
                }
            } catch (error) {
                console.error('🐝 Hive: load model downloader workflow error:', error);
                showToast(getText('toast.modelDownloadWorkflowLoadFailed', 'Failed to load model download workflow: ') + error.message, 'error');
            }
        }

        async function handleInspirationInstallNode(item, url) {
            if (!url) {
                const invalidAddressText = getText('toast.nodeInstallAddressInvalid', 'Node installation address is invalid');
                showToast(invalidAddressText, 'error');
                return;
            }
            
            // 不再显示弹层，而是直接加载模板工作流
            try {
                // 读取模板工作流文件
                const templatePath = '/extensions/ComfyUI-Hive/res/HiveNodeInstaller.json';
                const response = await fetch(templatePath);
                
                if (!response.ok) {
                    throw new Error(typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('toast.loadTemplateFileFailed', { statusText: response.statusText }) : `Unable to load template file: ${response.statusText}`);
                }
                
                const templateWorkflow = await response.json();
                
                // 替换 NodeInstallationAddress 为实际的安装地址
                // 格式化URL（与弹层逻辑保持一致）
                let gitUrl = url;
                if (!url.startsWith('http://') && !url.startsWith('https://')) {
                    if (url.includes('github.com') || url.includes('gitlab.com')) {
                        gitUrl = `https://${url}`;
                    } else if (url.includes('/')) {
                        gitUrl = `https://${url}`;
                    }
                }
                
                // 确保GitHub URL格式正确
                if (gitUrl.includes('github.com') && !gitUrl.endsWith('.git') && !gitUrl.includes('/tree/') && !gitUrl.includes('/blob/')) {
                    gitUrl = gitUrl.endsWith('/') ? gitUrl.slice(0, -1) + '.git' : gitUrl + '.git';
                }
                
                // 在工作流中查找并替换 NodeInstallationAddress
                if (templateWorkflow.nodes && Array.isArray(templateWorkflow.nodes)) {
                    templateWorkflow.nodes.forEach(node => {
                        if (node.widgets_values && Array.isArray(node.widgets_values)) {
                            // 替换 widgets_values 中的 NodeInstallationAddress
                            node.widgets_values = node.widgets_values.map(value => {
                                if (value === 'NodeInstallationAddress') {
                                    return gitUrl;
                                }
                                return value;
                            });
                        }
                    });
                }
                
                // 在工作流的 extra 字段中添加文件名信息（用于标识）
                if (!templateWorkflow.extra) {
                    templateWorkflow.extra = {};
                }
                templateWorkflow.extra.workflow_name = 'HiveNodeInstaller.json';
                
                // 加载工作流到 ComfyUI
                if (window.app && window.app.loadGraphData) {
                    window.app.loadGraphData(templateWorkflow);
                    
                    // 尝试设置工作流名称（如果 ComfyUI 支持）
                    // 注意：ComfyUI 的文件名通常在保存时设置，这里尝试设置元数据
                    setTimeout(() => {
                        try {
                            if (window.app && window.app.graph) {
                                // 尝试多种方式设置工作流名称
                                if (window.app.graph.setTitle) {
                                    window.app.graph.setTitle('HiveNodeInstaller.json');
                                } else if (window.app.graph.setMetadata) {
                                    window.app.graph.setMetadata({ title: 'HiveNodeInstaller.json' });
                                } else if (window.app.graph.extra) {
                                    window.app.graph.extra.workflow_name = 'HiveNodeInstaller.json';
                                }
                            }
                        } catch (e) {
                            // 如果设置失败，忽略错误（文件名设置是可选的）
                            console.log('🐝 Hive: Unable to set workflow name, this is optional:', e);
                        }
                    }, 100);
                    
                    // 显示使用指南弹层（检查是否设置了不再提示）
                    const dontShowGuide = localStorage.getItem('hive_node_installer_guide_dont_show') === 'true';
                    if (!dontShowGuide) {
                        setTimeout(() => {
                            showNodeInstallerGuide();
                        }, 300); // 延迟一点显示，确保工作流已加载
                    }
                    
                    showToast(getText('toast.nodeInstallWorkflowLoaded', 'Node installation workflow loaded to canvas'), 'success');
                } else {
                    showToast(getText('toast.workflowLoadFailed', 'Unable to load workflow: ComfyUI not found'), 'error');
                }
            } catch (error) {
                console.error('🐝 Hive: load node installer workflow error:', error);
                const loadFailedText = getText('toast.nodeInstallWorkflowLoadFailed', 'Failed to load node installation workflow: ');
                showToast(loadFailedText + error.message, 'error');
            }
        }

        // 加载并渲染当前分类的标签
        async function loadInspirationTagsForCurrentCategory() {
            const view = document.getElementById('hive-view-inspiration');
            if (!view) return;
            const tagContainer = view.querySelector('.hive-tag-filters');
            if (!tagContainer) return;

            const cat = inspirationState.category;
            if (!inspirationTagsCache[cat]) {
                try {
                    const tags = await fetchInspirationTags(cat);
                    inspirationTagsCache[cat] = tags;
                } catch (err) {
                    console.error('🐝 Hive: fetchInspirationTags error:', err);
                    showToast(getText('toast.loadTagsFailed', 'Failed to load tags: ') + err.message, 'error');
                }
            }

            const tags = inspirationTagsCache[cat] || [];
            tagContainer.innerHTML = '';

            // 获取当前语言设置
            const currentLang = getCurrentLanguage(); // 'zh' or 'en'
            const isZh = currentLang === 'zh';

            // 创建标签容器和展开按钮的包装
            const tagsWrapper = document.createElement('div');
            tagsWrapper.className = 'hive-tag-filters-wrapper';
            
            const tagsInner = document.createElement('div');
            tagsInner.className = 'hive-tag-filters-inner';
            
            // 检查当前分类的展开状态（默认收起）
            // 注意：展开状态只在当前分类下生效，切换分类后重置
            const isExpanded = inspirationState.tagsExpanded[cat] || false;
            // 确保初始状态正确应用
            if (isExpanded) {
                tagsInner.classList.remove('hive-tags-collapsed');
            } else {
                tagsInner.classList.add('hive-tags-collapsed');
            }

            // “全部”按钮
            const allChip = document.createElement('button');
            allChip.className = 'hive-tag-chip';
            allChip.textContent = getText('inspiration.all', 'All');
            if (!inspirationState.tagIds || inspirationState.tagIds.length === 0) {
                if (!inspirationState.favoritesOnly) {
                    allChip.classList.add('active');
                }
            }
            allChip.onclick = () => {
                inspirationState.tagIds = [];
                inspirationState.favoritesOnly = false;
                inspirationState.page = 1;
                loadInspirationTagsForCurrentCategory();
                loadInspirationList();
            };
            tagsInner.appendChild(allChip);

            // “收藏”按钮
            const favoritesChip = document.createElement('button');
            favoritesChip.className = 'hive-tag-chip';
            favoritesChip.textContent = getText('inspiration.favorites', 'Favorites');
            if (inspirationState.favoritesOnly) {
                favoritesChip.classList.add('active');
            }
            favoritesChip.onclick = () => {
                inspirationState.favoritesOnly = !inspirationState.favoritesOnly;
                // 开启收藏模式时，自动清空标签选择
                if (inspirationState.favoritesOnly) {
                    inspirationState.tagIds = [];
                }
                inspirationState.page = 1;
                loadInspirationTagsForCurrentCategory();
                loadInspirationList();
            };
            tagsInner.appendChild(favoritesChip);

            // 实际标签（多选）
            tags.forEach(tag => {
                const chip = document.createElement('button');
                chip.className = 'hive-tag-chip';
                
                // 根据用户语言设置显示对应的标签名
                let tagDisplayName;
                if (currentLang === 'en') {
                    // 英文：优先使用 display_name_en，其次 display_name，最后 name
                    tagDisplayName = tag.display_name_en || tag.display_name || tag.name;
                } else {
                    // 中文：优先使用 display_name，其次 name
                    tagDisplayName = tag.display_name || tag.name;
                }
                chip.textContent = tagDisplayName;
                if (inspirationState.tagIds.includes(tag.id)) {
                    chip.classList.add('active');
                }
                chip.onclick = () => {
                    if (inspirationState.tagIds.includes(tag.id)) {
                        inspirationState.tagIds = inspirationState.tagIds.filter(id => id !== tag.id);
                    } else {
                        inspirationState.tagIds = [...inspirationState.tagIds, tag.id];
                    }
                    // 选择标签时，自动关闭“收藏”模式
                    if (inspirationState.favoritesOnly) {
                        inspirationState.favoritesOnly = false;
                    }
                    inspirationState.page = 1;
                    loadInspirationTagsForCurrentCategory();
                    loadInspirationList();
                };
                tagsInner.appendChild(chip);
            });
            
            tagsWrapper.appendChild(tagsInner);
            
            // 展开/收起按钮（只在有标签时显示）
            if (tags.length > 0 || tagsInner.children.length > 2) {
                const expandBtn = document.createElement('button');
                expandBtn.className = 'hive-tag-expand-btn';
                // 修复：展开时显示▼，收起时显示▶
                expandBtn.innerHTML = isExpanded ? '▶' : '▼';
                    const expandTitle = typeof window !== 'undefined' && typeof window.t === 'function' 
                        ? (isExpanded ? window.t('inspiration.collapse') : window.t('inspiration.expand'))
                        : (isExpanded ? 'Collapse' : 'Expand');
                expandBtn.title = expandTitle;
                expandBtn.onclick = (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    const currentExpanded = !tagsInner.classList.contains('hive-tags-collapsed');
                    const newExpanded = !currentExpanded;
                    inspirationState.tagsExpanded[cat] = newExpanded;
                    // 直接设置class，不使用toggle
                    if (newExpanded) {
                        tagsInner.classList.remove('hive-tags-collapsed');
                    } else {
                        tagsInner.classList.add('hive-tags-collapsed');
                    }
                    // 修复：展开时显示▼，收起时显示▶
                    expandBtn.innerHTML = newExpanded ? '▶' : '▼';
                    const expandTitle = typeof window !== 'undefined' && typeof window.t === 'function' 
                        ? (newExpanded ? window.t('inspiration.collapse') : window.t('inspiration.expand'))
                        : (newExpanded ? 'Collapse' : 'Expand');
                    expandBtn.title = expandTitle;
                };
                tagsWrapper.appendChild(expandBtn);
            }
            
            tagContainer.appendChild(tagsWrapper);
        }

        // 加载并渲染一级大分类
        async function loadInspirationCategories() {
            const view = document.getElementById('hive-view-inspiration');
            if (!view) return;
            const filtersContainer = view.querySelector('.gallery-filters');
            if (!filtersContainer) return;

            try {
                const categories = await fetchInspirationCategories();
                console.log('🐝 Hive: Loaded inspiration categories:', categories);

                // 清空现有按钮
                filtersContainer.innerHTML = '';

                // 如果没有分类，显示提示
                if (!categories || categories.length === 0) {
                    const noCategoryText = getText('inspiration.noCategories', 'No categories');
                    filtersContainer.innerHTML = `<div class="loading">${noCategoryText}</div>`;
                    return;
                }

                // 获取当前语言设置
                const currentLang = getCurrentLanguage(); // 'zh' or 'en'
                const isZh = currentLang === 'zh';

                // 创建分类按钮
                categories.forEach((category, index) => {
                    const chip = document.createElement('button');
                    chip.className = 'gallery-filter-chip';
                    // 根据语言显示分类名称
                    const categoryName = isZh ? (category.name || '') : (category.name_en || category.name || '');
                    chip.textContent = categoryName;
                    chip.dataset.categoryCode = category.code;
                    
                    // 第一个分类默认激活
                    if (index === 0) {
                        chip.classList.add('active');
                        inspirationState.category = category.code;
                        // 根据分类设置不同的每页数量
                        inspirationState.pageSize = (category.code === 'model' || category.code === 'node') ? 10 : 20;
                    }
                    
                    filtersContainer.appendChild(chip);
                });

                // 绑定分类按钮点击事件
                const galleryChips = filtersContainer.querySelectorAll('.gallery-filter-chip');
                galleryChips.forEach(chip => {
                    chip.onclick = () => {
                        const cat = chip.dataset.categoryCode || 'image';
                        
                        // 如果点击的是当前已激活的分类，不重复加载
                        if (inspirationState.category === cat && chip.classList.contains('active')) {
                            return;
                        }
                        
                        inspirationState.category = cat;
                        inspirationState.tagIds = [];
                        inspirationState.page = 1;
                        // 根据分类设置不同的每页数量
                        inspirationState.pageSize = (cat === 'model' || cat === 'node') ? 10 : 20;
                        // 切换大类时，重置该大类的展开状态为收起
                        inspirationState.tagsExpanded[cat] = false;
                        loadInspirationTagsForCurrentCategory();
                        loadInspirationList();

                        // 更新active状态
                        galleryChips.forEach(c => c.classList.remove('active'));
                        chip.classList.add('active');
                    };
                });

                // 如果当前分类不在加载的分类列表中，切换到第一个分类
                const currentCategoryExists = categories.some(cat => cat.code === inspirationState.category);
                if (!currentCategoryExists && categories.length > 0) {
                    inspirationState.category = categories[0].code;
                    inspirationState.tagIds = [];
                    inspirationState.page = 1;
                    // 根据分类设置不同的每页数量
                    inspirationState.pageSize = (categories[0].code === 'model' || categories[0].code === 'node') ? 10 : 20;
                    loadInspirationTagsForCurrentCategory();
                    loadInspirationList();
                }
            } catch (error) {
                console.error('🐝 Hive: loadInspirationCategories error:', error);
                showToast(getText('toast.loadCategoriesFailed', 'Failed to load categories: ') + error.message, 'error');
                filtersContainer.innerHTML = `<div class="error">${getText('toast.loadCategoriesFailedError', 'Failed to load categories')}</div>`;
            }
        }

        // 绑定主标签页切换
        const mainTabs = document.querySelectorAll('#hive-main-tabs > div');
        mainTabs.forEach((tab, i) => {
            tab.onclick = () => {
                currentMainTab = i;
                const viewName = i === 0 ? 'square' : 'inspiration';
                toggleView(viewName, currentChannel);

                // 如果切换到灵感tab，加载分类和灵感内容（只在首次加载时）
                if (viewName === 'inspiration') {
                    if (!isInspirationLoaded) {
                        loadInspirationCategories().then(() => {
                            inspirationState.page = 1;
                            loadInspirationTagsForCurrentCategory();
                            loadInspirationList();
                            isInspirationLoaded = true;
                        });
                    }
                }
            };
        });

        // gallery filter 事件绑定已移至 loadInspirationCategories 函数中

        // 绑定灵感搜索与排序
        const inspSearchInput = sidebar.querySelector('.hive-insp-search');
        const inspSortButtons = sidebar.querySelectorAll('.hive-insp-sort button');
        const inspSearchBtn = sidebar.querySelector('.hive-insp-search-btn');

        if (inspSearchInput) {
            const inspSearchClear = sidebar.querySelector('.hive-insp-search-clear');
            
            // 提取链接的文件名
            const extractFilenameFromUrl = (url) => {
                try {
                    // 检查是否是有效的URL
                    if (!/^https?:\/\//i.test(url)) {
                        return null;
                    }
                    const urlObj = new URL(url);
                    const pathname = urlObj.pathname;
                    // 从路径中提取文件名
                    const filename = pathname.split('/').pop();
                    // 移除可能的查询参数和锚点
                    const cleanFilename = filename.split('?')[0].split('#')[0];
                    // 如果有文件名且不是空字符串，返回它
                    if (cleanFilename && cleanFilename.length > 0) {
                        return cleanFilename;
                    }
                } catch (e) {
                    // 如果不是有效URL，返回null
                }
                return null;
            };
            
            // 更新清除按钮显示状态
            const updateClearButton = () => {
                if (inspSearchClear) {
                    inspSearchClear.style.display = inspSearchInput.value.trim() ? 'block' : 'none';
                }
            };
            
            // 初始状态
            updateClearButton();
            
            // 监听输入变化
            inspSearchInput.addEventListener('input', updateClearButton);
            
            const triggerSearch = () => {
                let newKeyword = (inspSearchInput.value || '').trim();
                const currentKeyword = (inspirationState.keyword || '').trim();
                
                // 如果输入的是链接，提取文件名
                const filename = extractFilenameFromUrl(newKeyword);
                if (filename) {
                    newKeyword = filename;
                    inspSearchInput.value = newKeyword;
                }
                
                // 如果搜索关键词没有变化，不重复加载
                if (newKeyword === currentKeyword) {
                    return;
                }
                
                inspirationState.keyword = newKeyword;
                inspirationState.page = 1;
                updateClearButton();
                loadInspirationList();
            };
            
            inspSearchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    triggerSearch();
                }
            });
            
            if (inspSearchBtn) {
                inspSearchBtn.onclick = () => {
                    triggerSearch();
                };
            }
            
            // 清除按钮点击事件
            if (inspSearchClear) {
                inspSearchClear.onclick = () => {
                    inspSearchInput.value = '';
                    inspirationState.keyword = '';
                    inspirationState.page = 1;
                    updateClearButton();
                    loadInspirationList();
                };
            }
        }

        inspSortButtons.forEach(btn => {
            btn.onclick = () => {
                const sort = btn.getAttribute('data-sort') || 'latest';
                
                // 如果点击的是当前已激活的排序，不重复加载
                if (inspirationState.sort === sort && btn.classList.contains('active')) {
                    return;
                }
                
                inspirationState.sort = sort;
                inspirationState.page = 1;
                inspSortButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                loadInspirationList();
            };
        });

        // esc和全局快捷键Alt+H
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeAllModals();
            } else if (e.key === 'h' && e.altKey) {
                e.preventDefault();
                const hiveSidebar = document.getElementById('hive-sidebar');
                if (hiveSidebar) {
                    hiveSidebar.classList.toggle('open');
                }
            }
        });

        // 确保侧边栏内的文字可以复制 - 阻止事件冒泡到Canvas
        let sidebarCopySupportSetup = false;
        const setupSidebarCopySupport = () => {
            const sidebarEl = document.getElementById('hive-sidebar');
            if (sidebarEl && !sidebarCopySupportSetup) {
                sidebarCopySupportSetup = true;
                
                // 直接设置DOM属性，强制允许文字选择
                sidebarEl.style.webkitUserSelect = 'text';
                sidebarEl.style.mozUserSelect = 'text';
                sidebarEl.style.msUserSelect = 'text';
                sidebarEl.style.userSelect = 'text';
                sidebarEl.setAttribute('contenteditable', 'false'); // 不允许编辑，但允许选择
                
                // 阻止鼠标/指针按下事件冒泡到 Canvas（使用capture阶段，优先级更高）
                // 这样当你在插件上点击或拖拽时，ComfyUI 不会认为你在操作画布
                sidebarEl.addEventListener('pointerdown', function(e) {
                    e.stopPropagation();
                    e.stopImmediatePropagation(); // 阻止同一元素上的其他监听器
                }, true); // capture阶段

                sidebarEl.addEventListener('mousedown', function(e) {
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                }, true); // capture阶段

                // 建议同时也阻断滚轮事件，防止在你的插件上滚动时缩放画布
                sidebarEl.addEventListener('wheel', function(e) {
                    e.stopPropagation();
                }, true); // capture阶段

                // 也阻止touch事件，确保移动端也能正常工作
                sidebarEl.addEventListener('touchstart', function(e) {
                    e.stopPropagation();
                }, true); // capture阶段

                sidebarEl.addEventListener('touchmove', function(e) {
                    e.stopPropagation();
                }, true); // capture阶段
                
                // 特别处理contextmenu事件，确保不会被阻止
                sidebarEl.addEventListener('contextmenu', function(e) {
                    // 不阻止默认行为，允许显示右键菜单
                    // 阻止事件冒泡，防止ComfyUI阻止右键菜单
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                }, true); // capture阶段，优先级最高
                
                // 处理文字选择开始事件
                sidebarEl.addEventListener('selectstart', function(e) {
                    // 允许文字选择，不阻止
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                }, true); // capture阶段
                
                // 处理copy事件，确保复制功能正常
                sidebarEl.addEventListener('copy', function(e) {
                    // 允许复制，不阻止
                    e.stopPropagation();
                    // 不调用preventDefault，允许默认复制行为
                }, true); // capture阶段
                
                // 遍历所有子元素，也设置相同的属性
                const allElements = sidebarEl.querySelectorAll('*');
                allElements.forEach(el => {
                    // 跳过按钮、输入框等交互元素
                    if (el.tagName === 'BUTTON' || el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'A' || el.classList.contains('hive-tag-chip') || el.classList.contains('gallery-filter-chip')) {
                        return;
                    }
                    el.style.webkitUserSelect = 'text';
                    el.style.mozUserSelect = 'text';
                    el.style.msUserSelect = 'text';
                    el.style.userSelect = 'text';
                });
            }
        };

        // 这个监听器已经在setup函数最开始添加了，这里不需要重复添加

        // 延迟执行，确保侧边栏已经创建
        setTimeout(setupSidebarCopySupport, 100);
        // 也监听侧边栏的创建，如果动态创建的话
        const sidebarObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.addedNodes.length > 0) {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === 1 && (node.id === 'hive-sidebar' || (node.querySelector && node.querySelector('#hive-sidebar')))) {
                            setupSidebarCopySupport();
                            // 如果新添加的节点就是侧边栏，也要处理
                            if (node.id === 'hive-sidebar') {
                                sidebarCopySupportSetup = false; // 重置标志，允许重新设置
                            }
                            break;
                        }
                    }
                }
            }
        });
        sidebarObserver.observe(document.body, { childList: true, subtree: true });

        // 点击外部区域自动关闭侧边栏
        document.addEventListener('click', (e) => {

            const hiveSidebar = document.getElementById('hive-sidebar');
            const isHiveTriggeredBtn = e.target.closest('.hive-btn-instance');
            if (isHiveTriggeredBtn) {
                return;
            }

            const hasOpenModal = document.querySelector('#hive-lightbox, #hive-video-modal, #hive-model-detail, #hive-settings-modal, #hive-confirm-modal, #hive-node-install-modal, #hive-node-installer-guide-modal, #hive-model-downloader-guide-modal, #hive-feedback-modal, #hive-update-notification-modal, #hive-force-update-modal');

            if (hasOpenModal) {
            }

            const isInsideSidebar = hiveSidebar && hiveSidebar.contains(e.target);


            if (!isInsideSidebar && hiveSidebar && hiveSidebar.classList.contains('open')) {
                if (!hasOpenModal) {
                    hiveSidebar.classList.remove('open');
                } else {
                }
            }
        }, { capture: true });



        // 初始化缺少模型/节点提示增强器
        // 不等待Hive初始化，因为对话框可能在初始化之前就出现
        // 延迟一点初始化，确保DOM已准备好
        setTimeout(async () => {
            try {
                await initMissingItemsEnhancer();
                console.log('🐝 Hive: Missing items enhancer initialized');
                console.log('🐝 Hive: Debug commands: window.hiveMissingItemsEnhancer.checkNow() or .reset()');
            } catch (error) {
                console.error('🐝 Hive: Failed to initialize missing items enhancer:', error);
            }
        }, 500);

        // 监听自定义事件：从库中下载模型
        window.addEventListener('hive-download-model', async (event) => {
            const { url, saveDirectory, libraryItem } = event.detail;
            if (url && handleInspirationDownloadModel) {
                try {
                    await handleInspirationDownloadModel(libraryItem || {}, url);
                } catch (error) {
                    console.error('🐝 Hive: Error downloading model from library:', error);
                    const errorText = getText('toast.modelDownloadFailed', 'Failed to download model: ');
                    showToast(errorText + error.message, 'error');
                }
            }
        });

        // 监听自定义事件：从库中安装节点
        window.addEventListener('hive-install-node', async (event) => {
            const { url, libraryItem } = event.detail;
            if (url && handleInspirationInstallNode) {
                try {
                    await handleInspirationInstallNode(libraryItem || {}, url);
                } catch (error) {
                    console.error('🐝 Hive: Error installing node from library:', error);
                    const errorText = getText('toast.nodeInstallFailed', 'Failed to install node: ');
                    showToast(errorText + error.message, 'error');
                }
            }
        });

        // 创建插入按钮
        let attempts = 0;
        const interval = setInterval(() => {
            attempts++;
            if (insertButton() || attempts > 10) {
                clearInterval(interval);
                
                // 监听侧边栏打开/关闭，控制右侧按钮的显示
                const sidebar = document.getElementById('hive-sidebar');
                if (sidebar) {
                    const updateSideButtonVisibility = () => {
                        const sideBtn = document.querySelector('.hive-sidebar-toggle-btn');
                        if (sideBtn) {
                            if (sidebar.classList.contains('open')) {
                                sideBtn.style.display = 'none';
                            } else {
                                sideBtn.style.display = 'flex';
                            }
                        }
                    };
                    
                    // 初始检查
                    updateSideButtonVisibility();
                    
                    // 监听 class 变化
                    const observer = new MutationObserver(updateSideButtonVisibility);
                    observer.observe(sidebar, { attributes: true, attributeFilter: ['class'] });
                }
            }
        }, 1000);
    }
});

// 释放资源
document.addEventListener('beforeunload', function() {
    // 清理所有 Presence 订阅
    unsubscribeChannelsPresence();
});

function closeAllModals() {
    const modals = document.querySelectorAll('#hive-lightbox, #hive-video-modal, #hive-model-detail, #hive-settings-modal, #hive-confirm-modal, #hive-node-install-modal, #hive-node-installer-guide-modal, #hive-model-downloader-guide-modal');
    modals.forEach(m => m.remove());
}

function insertButton() {
    const toggleHive = async () => {
        const sidebar = document.getElementById("hive-sidebar");
        const wasOpen = sidebar.classList.contains("open");

        // 允许切换侧边栏的打开/关闭状态（强制更新时仍然可以关闭）
        sidebar.classList.toggle("open");
        const isNowOpen = sidebar.classList.contains("open");
        
        // 如果尝试打开但需要强制更新，显示提示但不阻止打开
        if (isNowOpen && isForceUpdate && !wasOpen) {
            showToast(getText('toast.versionUpdateRequired', 'Current version needs update, please download the latest version'), 'warning');
        }

        // 如果刚刚打开且未初始化，启动初始化
        if (!wasOpen && isNowOpen && !isInitialized && window.initializeHive) {
            try {
                await window.initializeHive();
            } catch (error) {
                console.error('🐝 Hive: Initialization failed:', error);
                showToast(getText('toast.connectionFailedRetry', 'Connection failed, please retry'), 'error');
            }
        }
    };

    let buttonAdded = false;

    // 不再添加到顶部工具栏，只使用右侧固定按钮

    // 添加到屏幕右侧固定按钮
    if (!document.querySelector(".hive-sidebar-toggle-btn")) {
        const sideBtn = document.createElement("button");
        sideBtn.className = "hive-sidebar-toggle-btn hive-btn-instance";
        sideBtn.innerHTML = `<span>🐝</span> <span>Hive</span>`;
        sideBtn.onclick = toggleHive;
        sideBtn.title = getText('toast.toggleSidebar', 'Toggle Hive Hub');
        document.body.appendChild(sideBtn);
        console.log("✅ Hive: Added fixed sidebar toggle button");
        buttonAdded = true;
    }

    // 不再添加到旧版菜单，只使用右侧固定按钮

    // 如果都没有找到，使用后备按钮
    if (!buttonAdded && !document.querySelector(".hive-fallback-btn")) {
        console.warn("⚠️ Hive: Toolbar not found, using fallback button.");
        const fallbackBtn = document.createElement("button");
        fallbackBtn.textContent = "🐝 Hive";
        fallbackBtn.className = "hive-fallback-btn hive-btn-instance";
        fallbackBtn.onclick = toggleHive;
        document.body.appendChild(fallbackBtn);
        buttonAdded = true;
    }

    return buttonAdded;
}
