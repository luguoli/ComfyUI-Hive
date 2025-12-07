// web/js/hive_ui.js - 界面与渲染

// 统一的翻译函数（简化调用）
function t(key, params = {}) {
    if (typeof window !== 'undefined' && typeof window.t === 'function') {
        return window.t(key, params);
    }
    if (typeof window !== 'undefined' && typeof window.getI18nText === 'function') {
        let text = window.getI18nText(key);
        if (typeof params === 'object' && Object.keys(params).length > 0) {
            for (const [paramKey, paramValue] of Object.entries(params)) {
                text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue));
            }
        }
        return text;
    }
    // 回退：返回key本身
    return key;
}

import { getCurrentUser } from './hive_data.js';

// 翻译按钮图标（默认 & 加载中）
function getTranslateIconHtml(isLoading = false) {
    const loadingClass = isLoading ? ' hive-translate-icon-loading' : '';
    return `
        <svg class="hive-translate-icon${loadingClass}" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m5 8 6 6"></path>
            <path d="m4 14 6-6 2-3"></path>
            <path d="M2 5h12"></path>
            <path d="M7 2h1"></path>
            <path d="m22 22-5-10-5 10"></path>
            <path d="M14 18h6"></path>
        </svg>
    `;
}

// Toast通知系统
function showToast(message, type = 'info') {
    // 移除现有的toast容器，如果有的话
    const existingContainer = document.getElementById('hive-toast-container');
    if (existingContainer) {
        existingContainer.remove();
    }

    // 创建toast容器
    const container = document.createElement('div');
    container.id = 'hive-toast-container';
    
    // 尝试定位到发送窗口上方
    const chatInputArea = document.querySelector('.chat-input-area');
    let topPosition = '20px';
    let rightPosition = '20px';
    let maxWidth = '400px';
    
    if (chatInputArea && chatInputArea.offsetParent !== null) {
        // 确保元素可见且已渲染
        const rect = chatInputArea.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
            // 定位到输入框上方，留出10px间距
            // 计算输入框顶部位置，然后向上偏移（假设toast高度约60px，加上间距）
            topPosition = `${Math.max(10, rect.top - 70)}px`;
            // 水平对齐到输入框右侧，留出一些边距
            rightPosition = `${Math.max(10, window.innerWidth - rect.right)}px`;
            // 限制最大宽度，避免超出屏幕
            maxWidth = `${Math.min(400, Math.max(300, rect.width || 400))}px`;
        }
    }
    
    container.style.cssText = `
        position: fixed;
        top: ${topPosition};
        right: ${rightPosition};
        max-width: ${maxWidth};
        z-index: 100002;
        pointer-events: none;
        display: flex;
        flex-direction: column;
        gap: 10px;
    `;
    document.body.appendChild(container);

    // 创建toast元素
    const toast = document.createElement('div');
    toast.className = `hive-toast hive-toast-${type}`;

    // 根据类型设置图标
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };

    toast.innerHTML = `
        <div class="hive-toast-content">
            <span class="hive-toast-icon">${icons[type] || icons.info}</span>
            <span class="hive-toast-message">${message}</span>
        </div>
        <div class="hive-toast-progress"></div>
    `;

    container.appendChild(toast);

    // 添加显示动画
    setTimeout(() => {
        toast.classList.add('hive-toast-show');
    }, 10);

    // 3秒后自动消失
    setTimeout(() => {
        toast.classList.remove('hive-toast-show');
        setTimeout(() => {
            if (toast.parentNode) toast.remove();
            if (container.children.length === 0) container.remove();
        }, 300); // 等待动画完成
    }, 3000);
}

// 显示节点安装说明弹层
function showNodeInstallGuide(item, url) {
    return new Promise((resolve) => {
        // 移除现有的安装说明弹层
        const existingModal = document.getElementById('hive-node-install-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // 获取当前语言
        const currentLang = getCurrentLanguage();
        const isZh = currentLang === 'zh';

        // 从语言文件获取文本
        const getText = (key) => {
            if (typeof window !== 'undefined' && typeof window.t === 'function') {
                return window.t(`nodeInstall.${key}`);
            }
            // 如果语言文件未加载，使用英文作为回退
            return key;
        };
        
        const t = {
            title: getText('title'),
            close: getText('close'),
            nodeName: getText('nodeName'),
            installUrl: getText('installUrl'),
            stepsTitle: getText('stepsTitle'),
            step1Title: getText('step1Title'),
            step1Win: getText('step1Win'),
            step1Mac: getText('step1Mac'),
            step1Linux: getText('step1Linux'),
            step2Title: getText('step2Title'),
            step2Tip: getText('step2Tip'),
            step3Title: getText('step3Title'),
            step3Tip: getText('step3Tip'),
            step4Title: getText('step4Title'),
            step4Desc: getText('step4Desc'),
            noteTitle: getText('noteTitle'),
            note1: getText('note1'),
            note2: getText('note2'),
            note3: getText('note3'),
            note4: getText('note4'),
            closeBtn: getText('closeBtn'),
            copy: getText('copy'),
            copied: getText('copied'),
            copyFailed: getText('copyFailed'),
            comfyUIPath: getText('comfyUIPath')
        };

        // 格式化URL
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
        
        // 提取仓库名称
        const urlParts = gitUrl.split('/');
        const repoName = urlParts[urlParts.length - 1]?.replace('.git', '') || 'custom-node';
        const installCommand = `git clone ${gitUrl} ${repoName}`;
        
        // ComfyUI安装目录提示
        const comfyUIPath = t.comfyUIPath;
        const commandPath = comfyUIPath;

        const modal = document.createElement('div');
        modal.id = 'hive-node-install-modal';
        modal.innerHTML = `
            <div class="hive-install-overlay">
                <div class="hive-install-content">
                    <div class="hive-install-header">
                        <h2>${t.title}</h2>
                        <button class="hive-install-close" title="${t.close}">×</button>
                    </div>
                    <div class="hive-install-body">
                        <div class="hive-install-info">
                            <div class="hive-install-info-item">
                                <span class="hive-install-label">${t.nodeName}</span>
                                <span class="hive-install-value">${item.title || repoName}</span>
                            </div>
                            <div class="hive-install-info-item">
                                <span class="hive-install-label">${t.installUrl}</span>
                                <span class="hive-install-value hive-install-url">${gitUrl}</span>
                            </div>
                        </div>
                        
                        <div class="hive-install-steps">
                            <h3>${t.stepsTitle}</h3>
                            <div class="hive-install-step">
                                <div class="hive-install-step-number">1</div>
                                <div class="hive-install-step-content">
                                    <strong>${t.step1Title}</strong>
                                    <ul>
                                        <li><strong>Windows:</strong> ${t.step1Win}</li>
                                        <li><strong>Mac:</strong> ${t.step1Mac}</li>
                                        <li><strong>Linux:</strong> ${t.step1Linux}</li>
                                    </ul>
                                </div>
                            </div>
                            
                            <div class="hive-install-step">
                                <div class="hive-install-step-number">2</div>
                                <div class="hive-install-step-content">
                                    <strong>${t.step2Title}</strong>
                                    <div class="hive-install-command-box">
                                        <code>cd "${commandPath}/custom_nodes"</code>
                                        <button class="hive-install-copy-btn" data-cmd='cd "${commandPath}/custom_nodes"'>${t.copy}</button>
                                    </div>
                                    <p class="hive-install-tip">${t.step2Tip}</p>
                                </div>
                            </div>
                            
                            <div class="hive-install-step">
                                <div class="hive-install-step-number">3</div>
                                <div class="hive-install-step-content">
                                    <strong>${t.step3Title}</strong>
                                    <div class="hive-install-command-box">
                                        <code>${installCommand}</code>
                                        <button class="hive-install-copy-btn" data-cmd="${installCommand}">${t.copy}</button>
                                    </div>
                                    <p class="hive-install-tip">${t.step3Tip}</p>
                                </div>
                            </div>
                            
                            <div class="hive-install-step">
                                <div class="hive-install-step-number">4</div>
                                <div class="hive-install-step-content">
                                    <strong>${t.step4Title}</strong>
                                    <p>${t.step4Desc}</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="hive-install-note">
                            <strong>${t.noteTitle}</strong>
                            <ul>
                                <li>${t.note1}</li>
                                <li>${t.note2}</li>
                                <li>${t.note3}</li>
                                <li>${t.note4}</li>
                            </ul>
                        </div>
                    </div>
                    <div class="hive-install-footer">
                        <button class="hive-install-close-btn">${t.closeBtn}</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // 绑定关闭事件
        const closeModal = () => {
            modal.remove();
            resolve();
        };

        const closeBtn = modal.querySelector('.hive-install-close');
        const closeFooterBtn = modal.querySelector('.hive-install-close-btn');
        const overlay = modal.querySelector('.hive-install-overlay');

        closeBtn.onclick = closeModal;
        closeFooterBtn.onclick = closeModal;
        overlay.onclick = (e) => {
            // 点击overlay背景时关闭（但不包括内容区域）
            if (e.target === overlay || e.target.classList.contains('hive-install-overlay')) {
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

        // 绑定复制按钮事件
        const copyButtons = modal.querySelectorAll('.hive-install-copy-btn');
        copyButtons.forEach(btn => {
            btn.onclick = async (e) => {
                e.stopPropagation();
                const command = btn.getAttribute('data-cmd');
                
                try {
                    // 使用更可靠的方式复制
                    const textarea = document.createElement('textarea');
                    textarea.value = command;
                    textarea.style.position = 'fixed';
                    textarea.style.left = '-9999px';
                    textarea.style.top = '0';
                    document.body.appendChild(textarea);
                    textarea.focus();
                    textarea.select();
                    
                    try {
                        const successful = document.execCommand('copy');
                        document.body.removeChild(textarea);
                        
                        if (successful) {
                            const originalText = btn.textContent;
                            const currentLang = getCurrentLanguage();
                            const isZh = currentLang === 'zh';
                            btn.textContent = typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('common.copied') : '✓ Copied';
                            btn.style.background = '#4caf50';
                            setTimeout(() => {
                                btn.textContent = originalText;
                                btn.style.background = '';
                            }, 2000);
                        } else {
                            throw new Error('execCommand failed');
                        }
                    } catch (execError) {
                        document.body.removeChild(textarea);
                        await navigator.clipboard.writeText(command);
                        const originalText = btn.textContent;
                        const currentLang = getCurrentLanguage();
                        const isZh = currentLang === 'zh';
                        btn.textContent = typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('common.copied') : '✓ Copied';
                        btn.style.background = '#4caf50';
                        setTimeout(() => {
                            btn.textContent = originalText;
                            btn.style.background = '';
                        }, 2000);
                    }
                } catch (err) {
                    console.error('Failed to copy:', err);
                    const currentLang = getCurrentLanguage();
                    const isZh = currentLang === 'zh';
                    showToast(typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('common.copyFailed') : 'Copy failed, please copy manually', 'error');
                }
            };
        });
    });
}

// 自定义确认对话框
function showConfirm(message) {
    return new Promise((resolve) => {
        // 移除现有的确认对话框
        const existingConfirm = document.getElementById('hive-confirm-modal');
        if (existingConfirm) {
            existingConfirm.remove();
        }

        // 获取当前语言
        const currentLang = getCurrentLanguage();
        const isZh = currentLang === 'zh';
        const cancelText = typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('common.cancel') : 'Cancel';
        const confirmText = typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('common.confirm') : 'Confirm';

        // 创建确认对话框
        const confirmModal = document.createElement('div');
        confirmModal.id = 'hive-confirm-modal';
        confirmModal.innerHTML = `
            <div class="hive-confirm-overlay">
                <div class="hive-confirm-content">
                    <div class="hive-confirm-message">${message}</div>
                    <div class="hive-confirm-buttons">
                        <button class="hive-confirm-btn hive-confirm-cancel">${cancelText}</button>
                        <button class="hive-confirm-btn hive-confirm-ok">${confirmText}</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(confirmModal);

        // 绑定事件
        const okBtn = confirmModal.querySelector('.hive-confirm-ok');
        const cancelBtn = confirmModal.querySelector('.hive-confirm-cancel');
        const overlay = confirmModal.querySelector('.hive-confirm-overlay');

        const cleanup = () => {
            confirmModal.remove();
        };

        okBtn.onclick = () => {
            cleanup();
            resolve(true);
        };

        cancelBtn.onclick = () => {
            cleanup();
            resolve(false);
        };

        overlay.onclick = (e) => {
            if (e.target === overlay) {
                cleanup();
                resolve(false);
            }
        };

        // Esc键关闭
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                cleanup();
                resolve(false);
                document.removeEventListener('keydown', handleKeyDown);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
    });
}

// 格式化消息时间
function formatMessageTime(createdAt) {
    if (!createdAt) return '';
    
    try {
        const msgDate = new Date(createdAt);
        const now = new Date();
        
        // 获取今天的开始时间（00:00:00）
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        // 获取昨天的开始时间
        const yesterdayStart = new Date(todayStart);
        yesterdayStart.setDate(yesterdayStart.getDate() - 1);
        
        // 格式化时间部分（HH:mm）
        const formatTime = (date) => {
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            return `${hours}:${minutes}`;
        };
        
        // 格式化日期部分（YYYY-MM-DD）
        const formatDate = (date) => {
            const year = date.getFullYear();
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const day = date.getDate().toString().padStart(2, '0');
            return `${year}-${month}-${day}`;
        };
        
        if (msgDate >= todayStart) {
            // 今天：只显示时间
            return formatTime(msgDate);
        } else if (msgDate >= yesterdayStart) {
            // 昨天：显示"昨天" + 时间
            const currentLang = getCurrentLanguage();
            const isZh = currentLang === 'zh';
            const yesterdayText = typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('common.yesterday') : 'Yesterday';
            return `${yesterdayText} ${formatTime(msgDate)}`;
        } else {
            // 更早的日期：显示日期 + 时间
            return `${formatDate(msgDate)} ${formatTime(msgDate)}`;
        }
    } catch (error) {
        console.warn('🐝 Hive: Failed to format message time:', error);
        return '';
    }
}

// 创建聊天气泡DOM元素
function createMessageElement(msg) {
    const currentUser = getCurrentUser();
    const msgEl = document.createElement('div');
    msgEl.className = 'hive-message';
    
    // 添加消息ID作为数据属性，用于去重
    if (msg.id) {
        msgEl.setAttribute('data-message-id', msg.id);
    }

    // 判断是否为自己的消息
    const isSelf = currentUser && msg.user_id === currentUser.id;
    if (isSelf) {
        msgEl.classList.add('self');
    }

    const meta = document.createElement('div');
    meta.className = 'hive-message-meta';

    // 添加头像
    if (msg.profile && msg.profile.avatar_url) {
        const avatar = document.createElement('img');
        avatar.src = msg.profile.avatar_url;
        avatar.onerror = () => {
            avatar.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=unknown';
        };
        meta.appendChild(avatar);
    }

    // 添加用户名
    const usernameSpan = document.createElement('span');
    usernameSpan.className = 'hive-message-username';
    usernameSpan.textContent = msg.profile ? msg.profile.username : 'Unknown';
    meta.appendChild(usernameSpan);

    // 添加时间
    if (msg.created_at) {
        const timeSpan = document.createElement('span');
        timeSpan.className = 'hive-message-time';
        timeSpan.textContent = formatMessageTime(msg.created_at);
        meta.appendChild(timeSpan);
    }

    msgEl.appendChild(meta);

    const bubble = document.createElement('div');
    bubble.className = 'hive-bubble';

    // 检查是否是图片或工作流
    const hasImage = msg.metadata && msg.metadata.file_url && msg.metadata.type === 'image';
    const hasWorkflow = msg.metadata && msg.metadata.file_url && msg.metadata.type === 'workflow';
    // 图片中包含工作流数据（支持对象、JSON字符串或URL）
    const hasWorkflowData = msg.metadata && msg.metadata.workflow_data && (
        typeof msg.metadata.workflow_data === 'object' || 
        typeof msg.metadata.workflow_data === 'string'
    );
    const originalFileName = msg.metadata && msg.metadata.original_filename;

    if (hasWorkflow && !hasImage) {
        // JSON工作流文件 - 显示为特定图标和原文件名
        const currentLang = getCurrentLanguage();
        const isZh = currentLang === 'zh';
        
        const workflowContainer = document.createElement('div');
        workflowContainer.className = 'hive-workflow-file';
        
        const workflowIcon = document.createElement('div');
        workflowIcon.className = 'hive-workflow-icon';
        workflowIcon.innerHTML = '📄';
        
        const workflowInfo = document.createElement('div');
        workflowInfo.className = 'hive-workflow-info';
        workflowInfo.innerHTML = `
            <div class="hive-workflow-name">${originalFileName || 'workflow.json'}</div>
            <div class="hive-workflow-label">${typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('common.workflowFile') : 'Workflow File'}</div>
        `;
        
        const loadWorkflowBtn = document.createElement('button');
        loadWorkflowBtn.className = 'hive-load-workflow-btn';
        loadWorkflowBtn.textContent = typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('common.loadWorkflow') : 'Load Workflow';
        loadWorkflowBtn.onclick = async (e) => {
            e.stopPropagation();
            const confirmMsg = typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('workflow.confirmLoad') : 'Are you sure you want to load this workflow to the ComfyUI canvas?';
            const confirmed = await showConfirm(confirmMsg);
            if (!confirmed) {
                return;
            }
            // 如果有工作流数据，直接使用（支持URL和JSON两种格式）
            if (msg.metadata.workflow_data) {
                await loadWorkflowToComfyUI(msg.metadata.workflow_data);
            } else if (msg.metadata.file_url) {
                // 如果没有工作流数据，尝试从文件URL获取
                // loadWorkflowToComfyUI 现在支持URL格式，可以直接使用
                await loadWorkflowToComfyUI(msg.metadata.file_url);
            } else {
                const errorMsg = typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('toast.workflowDataNotFound') : 'Unable to load workflow data: workflow information not found';
                showToast(errorMsg, 'error');
            }
        };
        
        workflowContainer.appendChild(workflowIcon);
        workflowContainer.appendChild(workflowInfo);
        workflowContainer.appendChild(loadWorkflowBtn);
        
        bubble.appendChild(workflowContainer);
        
        // 如果有文字内容，添加到下方（支持链接识别）
        if (msg.content && msg.content.trim()) {
            const line = document.createElement('div');
            line.className = 'hive-message-line';
            const textEl = document.createElement('span');
            textEl.className = 'hive-message-text';
            
            // 自动识别并转换链接
            const content = msg.content || '';
            const urlRegex = /(https?:\/\/[^\s]+)/gi;
            const parts = [];
            let lastIndex = 0;
            let match;
            
            urlRegex.lastIndex = 0;
            
            while ((match = urlRegex.exec(content)) !== null) {
                if (match.index > lastIndex) {
                    parts.push({
                        type: 'text',
                        content: content.substring(lastIndex, match.index)
                    });
                }
                parts.push({
                    type: 'link',
                    content: match[0]
                });
                lastIndex = urlRegex.lastIndex;
            }
            
            if (lastIndex < content.length) {
                parts.push({
                    type: 'text',
                    content: content.substring(lastIndex)
                });
            }
            
            if (parts.length === 0) {
                parts.push({
                    type: 'text',
                    content: content
                });
            }
            
            parts.forEach((part) => {
                if (part.type === 'link') {
                    const link = document.createElement('a');
                    link.href = part.content;
                    link.textContent = part.content;
                    link.target = '_blank';
                    link.rel = 'noopener noreferrer';
                    link.style.color = '#fff';
                    link.style.textDecoration = 'underline';
                    link.style.fontSize = '11px';
                    link.style.cursor = 'pointer';
                    link.onclick = (e) => {
                        e.stopPropagation();
                        window.open(part.content, '_blank', 'noopener,noreferrer');
                    };
                    textEl.appendChild(link);
                } else if (part.content) {
                    const textNode = document.createTextNode(part.content);
                    textEl.appendChild(textNode);
                }
            });
            
            textEl.style.whiteSpace = 'pre-wrap';
            line.appendChild(textEl);
            bubble.appendChild(line);
        }
    } else if (hasImage) {
        // 图片消息（可能包含工作流数据）
        const imageContainer = document.createElement('div');
        imageContainer.className = 'hive-image-container';
        
        const img = document.createElement('img');
        img.className = 'hive-message-image';
        img.loading = 'lazy';
        img.src = msg.metadata.file_url;
        const promptFromMetadata = msg.metadata && msg.metadata.prompt;
        img.onclick = () => showLightbox(msg.metadata.file_url, promptFromMetadata);
        imageContainer.appendChild(img);

        // 如果图片包含工作流数据，在底部显示提示和按钮
        // 检查workflow_data是否存在（可能是对象、字符串或URL）
        let workflowData = msg.metadata && msg.metadata.workflow_data;
        
        // 调试：打印完整的metadata信息
        console.log('🐝 Hive: Checking workflow data for image:', {
            hasMetadata: !!msg.metadata,
            metadata: msg.metadata,
            workflowData: workflowData,
            workflowDataType: typeof workflowData
        });
        
        // 检查是否有工作流数据（支持对象、JSON字符串或URL）
        if (workflowData) {
            // 判断是否是URL格式
            const isUrl = isWorkflowUrl(workflowData);
            
            // 如果是URL，或者如果是JSON字符串/对象，都显示加载按钮
            // 不需要在这里解析，让 loadWorkflowToComfyUI 函数处理
            console.log('🐝 Hive: Found workflow data for image message:', {
                isUrl: isUrl,
                type: typeof workflowData
            });
            
            const currentLang = getCurrentLanguage();
            const isZh = currentLang === 'zh';
            
            const workflowFooter = document.createElement('div');
            workflowFooter.className = 'hive-workflow-footer';
            workflowFooter.innerHTML = `
                <span class="hive-workflow-hint">${typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('workflow.canLoadWorkflow') : 'Workflow that generated this image can be loaded'}</span>
                <button class="hive-load-workflow-btn-small">${typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('common.loadWorkflow') : 'Load Workflow'}</button>
            `;
            
            workflowFooter.querySelector('.hive-load-workflow-btn-small').onclick = async (e) => {
                e.stopPropagation();
                const confirmMsg = typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('workflow.confirmLoad') : 'Are you sure you want to load this workflow to the ComfyUI canvas?';
                const confirmed = await showConfirm(confirmMsg);
                if (confirmed) {
                    // loadWorkflowToComfyUI 现在支持URL和JSON两种格式
                    await loadWorkflowToComfyUI(workflowData);
                }
            };
            
            imageContainer.appendChild(workflowFooter);
        } else {
            console.log('🐝 Hive: No valid workflow data found for image message:', {
                hasMetadata: !!msg.metadata,
                hasWorkflowData: !!msg.metadata?.workflow_data,
                workflowDataType: typeof msg.metadata?.workflow_data,
                workflowData: workflowData
            });
        }

        bubble.appendChild(imageContainer);

        // 如果有文字内容，添加到图片下方（支持链接识别）
        if (msg.content && msg.content.trim()) {
            const line = document.createElement('div');
            line.className = 'hive-message-line';
            const textEl = document.createElement('span');
            textEl.className = 'hive-message-text';
            
            // 自动识别并转换链接（复用相同的函数逻辑）
            const content = msg.content || '';
            const urlRegex = /(https?:\/\/[^\s]+)/gi;
            const parts = [];
            let lastIndex = 0;
            let match;
            
            urlRegex.lastIndex = 0;
            
            while ((match = urlRegex.exec(content)) !== null) {
                if (match.index > lastIndex) {
                    parts.push({
                        type: 'text',
                        content: content.substring(lastIndex, match.index)
                    });
                }
                parts.push({
                    type: 'link',
                    content: match[0]
                });
                lastIndex = urlRegex.lastIndex;
            }
            
            if (lastIndex < content.length) {
                parts.push({
                    type: 'text',
                    content: content.substring(lastIndex)
                });
            }
            
            if (parts.length === 0) {
                parts.push({
                    type: 'text',
                    content: content
                });
            }
            
            parts.forEach((part) => {
                if (part.type === 'link') {
                    const link = document.createElement('a');
                    link.href = part.content;
                    link.textContent = part.content;
                    link.target = '_blank';
                    link.rel = 'noopener noreferrer';
                    link.style.color = '#fff';
                    link.style.textDecoration = 'underline';
                    link.style.fontSize = '11px';
                    link.style.cursor = 'pointer';
                    link.onclick = (e) => {
                        e.stopPropagation();
                        window.open(part.content, '_blank', 'noopener,noreferrer');
                    };
                    textEl.appendChild(link);
                } else if (part.content) {
                    const textNode = document.createTextNode(part.content);
                    textEl.appendChild(textNode);
                }
            });
            
            textEl.style.whiteSpace = 'pre-wrap';
            textEl.dataset.originalText = msg.content;
            line.appendChild(textEl);
            bubble.appendChild(line);
        }
    } else {
        // 纯文字消息 - 保留换行，自动识别链接
        const line = document.createElement('div');
        line.className = 'hive-message-line';
        const textEl = document.createElement('span');
        textEl.className = 'hive-message-text';
        
        // 自动识别并转换链接
        const content = msg.content || '';
        const urlRegex = /(https?:\/\/[^\s]+)/gi;
        const parts = [];
        let lastIndex = 0;
        let match;
        
        // 重置正则表达式的lastIndex
        urlRegex.lastIndex = 0;
        
        while ((match = urlRegex.exec(content)) !== null) {
            // 添加链接前的文本
            if (match.index > lastIndex) {
                parts.push({
                    type: 'text',
                    content: content.substring(lastIndex, match.index)
                });
            }
            // 添加链接
            parts.push({
                type: 'link',
                content: match[0]
            });
            lastIndex = urlRegex.lastIndex;
        }
        
        // 添加剩余的文本
        if (lastIndex < content.length) {
            parts.push({
                type: 'text',
                content: content.substring(lastIndex)
            });
        }
        
        // 如果没有匹配到链接，直接添加整个文本
        if (parts.length === 0) {
            parts.push({
                type: 'text',
                content: content
            });
        }
        
        parts.forEach((part) => {
                if (part.type === 'link') {
                    // 这是一个链接
                    const link = document.createElement('a');
                    link.href = part.content;
                    link.textContent = part.content;
                    link.target = '_blank';
                    link.rel = 'noopener noreferrer';
                    link.style.color = '#fff';
                    link.style.textDecoration = 'underline';
                    link.style.fontSize = '11px';
                    link.style.cursor = 'pointer';
                    link.onclick = (e) => {
                        e.stopPropagation();
                        window.open(part.content, '_blank', 'noopener,noreferrer');
                    };
                    textEl.appendChild(link);
            } else if (part.content) {
                // 普通文本
                const textNode = document.createTextNode(part.content);
                textEl.appendChild(textNode);
            }
        });
        
        textEl.style.whiteSpace = 'pre-wrap';
        textEl.dataset.originalText = msg.content;
        line.appendChild(textEl);
        bubble.appendChild(line);
    }

    // 为可翻译文本添加翻译按钮（单独的 actions 容器，避免被翻译库覆盖）
    const lineContainer = bubble.querySelector('.hive-message-line') || (!hasImage && !hasWorkflow ? bubble : null);
    const textContainer = lineContainer ? lineContainer.querySelector('.hive-message-text') : null;
    if (lineContainer && textContainer && (textContainer.textContent || '').trim()) {
        if (!textContainer.dataset.originalText) {
            textContainer.dataset.originalText = textContainer.textContent;
        }
        const actions = document.createElement('div');
        actions.className = 'hive-message-actions';
        const translateBtn = document.createElement('button');
        translateBtn.type = 'button';
        translateBtn.className = 'hive-translate-btn';
        translateBtn.innerHTML = getTranslateIconHtml(false);
            const translateBtnTitle = typeof window !== 'undefined' && typeof window.t === 'function' 
                ? (window.t('common.translate') + ' / Translate')
                : 'Translate';
        translateBtn.title = translateBtnTitle;
        translateBtn.onclick = (e) => {
            e.stopPropagation();
            if (!window.hiveTranslateMessageToggle) return;

            // 防止重复点击
            if (translateBtn.dataset.loading === 'true') return;

            // 显示加载中的绿色图标
            translateBtn.dataset.loading = 'true';
            translateBtn.innerHTML = getTranslateIconHtml(true);

            const resetIcon = () => {
                // 保证“翻译中”状态至少显示一小段时间，方便用户察觉
                setTimeout(() => {
                    translateBtn.dataset.loading = 'false';
                    translateBtn.innerHTML = getTranslateIconHtml(false);
                }, 500);
            };

            try {
                const result = window.hiveTranslateMessageToggle(msgEl, textContainer, { auto: false });
                if (result && typeof result.finally === 'function') {
                    result.finally(resetIcon);
                } else {
                    resetIcon();
                }
            } catch {
                resetIcon();
            }
        };
        actions.appendChild(translateBtn);
        lineContainer.appendChild(actions);
    }

    msgEl.appendChild(bubble);
    return msgEl;
}

// 频道在线人数缓存
let channelOnlineCounts = new Map(); // channelId -> count

// 渲染频道列表
function renderChannelList(channels, onChannelSelect) {

    // 验证参数
    if (!channels || !Array.isArray(channels)) {
        console.error('🐝 RENDER_CHANNEL_LIST: Invalid channels parameter:', channels);
        return;
    }


    const listEl = document.getElementById('hive-channel-list');
    if (!listEl) {
        console.error('🐝 RENDER_CHANNEL_LIST: #hive-channel-list element not found');
        return;
    }

    listEl.innerHTML = '';

    // 获取当前语言设置
    const currentLang = getCurrentLanguage(); // 'zh' or 'en'
    const isZh = currentLang === 'zh';

    channels.forEach((channel, index) => {

        try {
            const item = document.createElement('div');
            item.className = 'channel-item';
            item.dataset.channelId = channel.id; // 添加 channelId 数据属性，方便后续更新
            
            const onlineCount = channelOnlineCounts.get(channel.id) || 0;
            const onlineCountText = typeof window !== 'undefined' && typeof window.t === 'function' 
                ? window.t('channel.online', { count: onlineCount }) 
                : `${onlineCount} online`;
            const onlineCountHtml = `<span class="channel-online-count">&nbsp;&nbsp;${onlineCountText}</span>`;
            
            // 根据语言显示频道名称和描述
            const channelName = isZh ? (channel.name || '') : (channel.name_en || channel.name || '');
            const channelDesc = isZh 
                ? (channel.description || (typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('channel.enterChannel') : 'Click to enter channel'))
                : (channel.description_en || channel.description || 'Click to enter channel');
            
            item.innerHTML = `
                <div class="channel-name">#${channelName}${onlineCountHtml}</div>
                <div class="channel-desc">${channelDesc}</div>
            `;
            item.onclick = () => onChannelSelect(channel.id, item);
            listEl.appendChild(item);
        } catch (error) {
            console.error('🐝 RENDER_CHANNEL_LIST: Error creating channel item', index, ':', error);
        }
    });

}

// 更新频道列表中的在线人数
function updateChannelOnlineCount(channelId, count) {
    channelOnlineCounts.set(channelId, count);
    
    // 更新频道列表中的显示
    const channelItem = document.querySelector(`.channel-item[data-channel-id="${channelId}"]`);
    console.log(`🐝 updateChannelOnlineCount: channelItem found:`, !!channelItem);
    
    if (channelItem) {
        const channelNameEl = channelItem.querySelector('.channel-name');
        
        if (channelNameEl) {
            // 移除现有的在线人数显示
            const existingCount = channelNameEl.querySelector('.channel-online-count');
            if (existingCount) {
                existingCount.remove();
            }
            
            // 获取当前语言设置
            const currentLang = getCurrentLanguage(); // 'zh' or 'en'
            const isZh = currentLang === 'zh';
            const onlineCountText = typeof window !== 'undefined' && typeof window.t === 'function' 
                ? window.t('channel.online', { count: count }) 
                : `${count} online`;
            
            // 添加新的在线人数显示（包括0人时也显示）
            const countEl = document.createElement('span');
            countEl.className = 'channel-online-count';
            countEl.innerHTML = `&nbsp;&nbsp;${onlineCountText}`;
            channelNameEl.appendChild(countEl);
        } else {
            console.warn(`🐝 updateChannelOnlineCount: channelNameEl not found for channel ${channelId}`);
        }
    } else {
        console.warn(`🐝 updateChannelOnlineCount: channelItem not found for channel ${channelId}`);
    }
}

// 更新在线人数显示
function updateOnlineCount(count) {
    
    // 如果 DOM 还没准备好，延迟重试
    const tryUpdate = (attempt = 1) => {
        const headerElement = document.querySelector('.chat-header .channel-title');
        
        if (headerElement) {
            // 移除现有的在线人数元素
            const existingCount = headerElement.querySelector('.online-count');
            if (existingCount) {
                existingCount.remove();
            }

            // 获取当前语言设置
            const currentLang = getCurrentLanguage(); // 'zh' or 'en'
            const isZh = currentLang === 'zh';
            const onlineCountText = typeof window !== 'undefined' && typeof window.t === 'function' 
                ? window.t('channel.online', { count: count }) 
                : `${count} online`;
            
            // 显示在线人数（包括0人时也显示）
            const countEl = document.createElement('span');
            countEl.className = 'online-count';
            countEl.innerHTML = `&nbsp;&nbsp;${onlineCountText}`;
            headerElement.appendChild(countEl);
        } else {
            // DOM 还没准备好，重试（最多尝试 10 次，每次间隔 200ms）
            if (attempt < 10) {
                setTimeout(() => tryUpdate(attempt + 1), 200);
            } else {
                console.warn(`🐝 updateOnlineCount: .chat-header .channel-title element not found after ${attempt} attempts`);
            }
        }
    };
    
    tryUpdate(1);
}

// 显示灯箱（图片查看）
function showLightbox(src, promptData, itemData = null) {
    if (document.getElementById('hive-lightbox')) return;

    const isZh = getCurrentLanguage() === 'zh';
    
    const lightbox = document.createElement('div');
    lightbox.id = 'hive-lightbox';
    
    // 创建关闭按钮
    const closeBtn = document.createElement('button');
    closeBtn.className = 'hive-lightbox-close';
    closeBtn.innerHTML = '×';
    closeBtn.title = typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('common.close') : 'Close';
    closeBtn.onclick = () => {
        if (document.body.contains(lightbox)) {
            document.body.removeChild(lightbox);
        }
    };
    
    const img = document.createElement('img');
    img.src = src;
    
    // 保存引用，因为onload中会清空innerHTML
    let savedCloseBtn = closeBtn;
    let savedImg = img; // 保存img引用
    
    // 等待图片加载完成后，根据图片方向决定布局
    const setupLayout = () => {
        // 获取图片尺寸（在清空前）
        const imgWidth = savedImg.naturalWidth || savedImg.width || 800;
        const imgHeight = savedImg.naturalHeight || savedImg.height || 600;
        const isPortrait = imgHeight > imgWidth; // 纵向图片
        
        // 收集要显示的信息（在创建元素之前）
        const infoItems = [];
        
        // 获取当前语言
        const currentLang = getCurrentLanguage();
        const isZh = currentLang === 'zh';
        
        // 标签文本映射
        // 直接使用语言文件，不使用硬编码回退
        const labelTexts = {
            prompt: typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('labels.prompt') : 'Prompt',
            negative: typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('labels.negative') : 'Negative Prompt',
            model: typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('labels.model') : 'Model',
            sampler: typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('labels.sampler') : 'Sampler',
            steps: typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('labels.steps') : 'Steps',
            cfgScale: typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('labels.cfgScale') : 'CFG Scale',
            seed: typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('labels.seed') : 'Seed',
            title: typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('labels.title') : 'Title',
            description: typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('labels.description') : 'Description'
        };
        
        // 从 itemData 提取信息
        if (itemData) {
            // 提示词信息
            if (itemData.extra && typeof itemData.extra === 'object') {
                const extra = itemData.extra;
                if (extra.prompt || extra.positive) {
                    infoItems.push({
                        label: labelTexts.prompt,
                        value: extra.prompt || extra.positive || ''
                    });
                }
                if (extra.negative) {
                    infoItems.push({
                        label: labelTexts.negative,
                        value: extra.negative
                    });
                }
                if (extra.model || extra.base_model) {
                    infoItems.push({
                        label: labelTexts.model,
                        value: extra.model || extra.base_model || ''
                    });
                }
                if (extra.sampler) {
                    infoItems.push({
                        label: labelTexts.sampler,
                        value: extra.sampler
                    });
                }
                if (extra.steps) {
                    infoItems.push({
                        label: labelTexts.steps,
                        value: String(extra.steps)
                    });
                }
                if (extra.cfg_scale || extra.cfg) {
                    infoItems.push({
                        label: labelTexts.cfgScale,
                        value: String(extra.cfg_scale || extra.cfg || '')
                    });
                }
                if (extra.seed) {
                    infoItems.push({
                        label: labelTexts.seed,
                        value: String(extra.seed)
                    });
                }
            }
            
            // 标题和描述
            if (itemData.title) {
                infoItems.push({
                    label: labelTexts.title,
                    value: itemData.title
                });
            }
            if (itemData.description) {
                infoItems.push({
                    label: labelTexts.description,
                    value: itemData.description
                });
            }
        }
        
        // 兼容旧的 promptData 参数
        if (promptData && infoItems.length === 0) {
            let text = '';
            if (typeof promptData === 'string') {
                text = promptData;
            } else if (promptData && typeof promptData === 'object') {
                const positive = promptData.prompt || promptData.positive || promptData.text || '';
                const negative = promptData.negative || '';
                text = positive || '';
                if (negative) {
                    text += (text ? '\n\n[Negative]\n' : '[Negative]\n') + negative;
                }
                if (!text) {
                    text = JSON.stringify(promptData, null, 2);
                }
            } else {
                text = String(promptData);
            }
            
            if (text) {
                infoItems.push({
                    label: labelTexts.prompt,
                    value: text
                });
            }
        }
        
        // 清空 lightbox 内容
        lightbox.innerHTML = '';
        lightbox.appendChild(savedCloseBtn); // 重新添加关闭按钮
        
        // 创建新的img元素（因为旧的可能被innerHTML清除了）
        const newImg = document.createElement('img');
        newImg.src = savedImg.src;
        newImg.style.objectFit = 'contain';
        newImg.style.display = 'block';
        
        // 计算可用空间
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const maxContainerWidth = viewportWidth * 0.9;
        const maxContainerHeight = viewportHeight * 0.9;
        const padding = 40; // 20px * 2
        const gap = 20;
        const infoPanelWidth = infoItems.length > 0 ? (isPortrait ? 400 : 0) : 0;
        const infoPanelHeight = infoItems.length > 0 ? (!isPortrait ? 300 : 0) : 0;
        
        // 图片可用空间
        let availableWidth, availableHeight;
        if (isPortrait) {
            // 纵向：图片在左，信息在右
            availableWidth = maxContainerWidth - padding - gap - infoPanelWidth;
            availableHeight = maxContainerHeight - padding;
        } else {
            // 横向：图片在上，信息在下
            availableWidth = maxContainerWidth - padding;
            availableHeight = maxContainerHeight - padding - gap - infoPanelHeight;
        }
        
        // 根据图片实际尺寸计算显示尺寸，保持比例
        const imgAspectRatio = imgWidth / imgHeight;
        let displayWidth = Math.min(imgWidth, availableWidth);
        let displayHeight = displayWidth / imgAspectRatio;
        
        if (displayHeight > availableHeight) {
            displayHeight = Math.min(imgHeight, availableHeight);
            displayWidth = displayHeight * imgAspectRatio;
        }
        
        // 设置图片尺寸，允许小图片保持原始尺寸
        newImg.style.maxWidth = displayWidth + 'px';
        newImg.style.maxHeight = displayHeight + 'px';
        newImg.style.width = Math.min(imgWidth, displayWidth) + 'px';
        newImg.style.height = 'auto';
        
        // 创建内容容器
        const contentContainer = document.createElement('div');
        contentContainer.className = 'hive-lightbox-content-container';
        contentContainer.style.display = 'flex';
        contentContainer.style.gap = gap + 'px';
        contentContainer.style.alignItems = isPortrait ? 'center' : 'flex-start';
        contentContainer.style.justifyContent = 'center';
        contentContainer.style.maxWidth = maxContainerWidth + 'px';
        contentContainer.style.maxHeight = maxContainerHeight + 'px';
        contentContainer.style.margin = 'auto';
        contentContainer.style.padding = '20px';
        contentContainer.style.boxSizing = 'border-box';
        
        // 图片容器
        const imageContainer = document.createElement('div');
        imageContainer.className = 'hive-lightbox-image-container';
        imageContainer.style.display = 'flex';
        imageContainer.style.alignItems = 'center';
        imageContainer.style.justifyContent = 'center';
        imageContainer.style.flexShrink = '0';
        imageContainer.style.flexGrow = '0';
        imageContainer.style.width = 'auto';
        imageContainer.style.height = 'auto';
        imageContainer.appendChild(newImg);
        
        // 信息面板（根据图片方向决定位置）
        let infoPanel = null;
        if (infoItems.length > 0) {
            infoPanel = document.createElement('div');
            infoPanel.className = 'hive-lightbox-info-panel';
            infoPanel.style.flex = isPortrait ? '1 1 auto' : '0 0 auto';
            infoPanel.style.minWidth = isPortrait ? '300px' : 'auto';
            infoPanel.style.maxWidth = isPortrait ? '400px' : '100%';
            infoPanel.style.maxHeight = isPortrait ? '90vh' : 'auto';
            infoPanel.style.overflowY = 'auto';
            infoPanel.style.overflowX = 'hidden';
            if (!isPortrait) {
                // 横向图片：key和value在同一行
                infoPanel.classList.add('hive-lightbox-info-panel-landscape');
            }
            
            infoItems.forEach(item => {
                const infoItem = document.createElement('div');
                infoItem.className = 'hive-lightbox-info-item';
                
                const label = document.createElement('div');
                label.className = 'hive-lightbox-info-label';
                label.textContent = item.label + ':';
                
                const value = document.createElement('div');
                value.className = 'hive-lightbox-info-value';
                value.textContent = item.value;
                
                if (!isPortrait) {
                    // 横向图片：key和value在同一行
                    infoItem.style.display = 'flex';
                    infoItem.style.flexDirection = 'row';
                    infoItem.style.alignItems = 'flex-start';
                    infoItem.style.gap = '8px';
                    label.style.flexShrink = '0';
                    label.style.marginBottom = '0';
                    value.style.flex = '1';
                }
                
                infoItem.appendChild(label);
                infoItem.appendChild(value);
                infoPanel.appendChild(infoItem);
            });
        }
        
        // 设置布局方向并添加子元素
        if (isPortrait) {
            // 纵向图片：图片在左，信息在右
            contentContainer.style.flexDirection = 'row';
            contentContainer.appendChild(imageContainer);
            if (infoPanel) {
                contentContainer.appendChild(infoPanel);
            }
        } else {
            // 横向图片：图片在上，信息在下
            contentContainer.style.flexDirection = 'column';
            contentContainer.appendChild(imageContainer);
            if (infoPanel) {
                contentContainer.appendChild(infoPanel);
            }
        }
        
        lightbox.appendChild(contentContainer);
        
        // 阻止图片和信息面板的点击事件冒泡
        const imgInContainer = imageContainer.querySelector('img');
        if (imgInContainer) {
            imgInContainer.onclick = (e) => {
                e.stopPropagation();
            };
        }
        if (infoPanel) {
            infoPanel.onclick = (e) => {
                e.stopPropagation();
            };
        }
    };
    
    // 绑定onload事件
    img.onload = setupLayout;
    img.onerror = () => {
        // 图片加载失败，仍然显示图片（可能是占位符）
        setupLayout();
    };
    
    // 绑定关闭事件
    lightbox.onclick = (e) => {
        // 点击背景关闭，点击图片或信息面板不关闭
        if (e.target === lightbox || 
            (e.target.classList.contains('hive-lightbox-content-container') && 
             !e.target.closest('.hive-lightbox-image-container') && 
             !e.target.closest('.hive-lightbox-info-panel'))) {
            if (document.body.contains(lightbox)) {
                document.body.removeChild(lightbox);
            }
        }
    };
    
    // 先添加到DOM
    document.body.appendChild(lightbox);
    lightbox.appendChild(savedCloseBtn);
    lightbox.appendChild(savedImg); // 临时添加，触发加载
    
    // 如果图片已加载（缓存），直接触发 setupLayout
    if (savedImg.complete && savedImg.naturalWidth > 0) {
        // 使用setTimeout确保DOM已更新
        setTimeout(setupLayout, 0);
    }
}

// 视图切换逻辑 (广场/灵感)
function toggleView(viewName, currentChannel) {
    // 获取所有视图元素
    const squareView = document.getElementById('hive-view-square');
    const inspirationView = document.getElementById('hive-view-inspiration');
    
    // 先淡出当前显示的视图
    const fadeOutView = squareView && !squareView.classList.contains('hidden') ? squareView : 
                       (inspirationView && !inspirationView.classList.contains('hidden') ? inspirationView : null);
    
    if (fadeOutView) {
        fadeOutView.classList.add('fade-out');
        fadeOutView.classList.remove('fade-in');
        
        // 等待淡出动画完成后再切换视图
        setTimeout(() => {
            document.querySelectorAll('#hive-content-wrapper > div').forEach(view => view.classList.add('hidden'));
            document.querySelectorAll('#hive-main-tabs > div').forEach((tab, i) => {
                if ((viewName === 'square' && i === 0) || (viewName === 'inspiration' && i === 1)) {
                    tab.classList.add('active');
                } else {
                    tab.classList.remove('active');
                }
            });

            if (viewName === 'square') {
                squareView.classList.remove('hidden');
                squareView.classList.remove('fade-out');
                squareView.classList.add('fade-in');

                // 默认显示频道列表，如果没有选频道
                if (!currentChannel) {
                    document.getElementById('hive-channel-list').classList.remove('hidden');
                    document.getElementById('hive-chat-room').classList.add('hidden');
                } else {
                    document.getElementById('hive-channel-list').classList.add('hidden');
                    document.getElementById('hive-chat-room').classList.remove('hidden');
                }
            } else if (viewName === 'inspiration') {
                inspirationView.classList.remove('hidden');
                inspirationView.classList.remove('fade-out');
                inspirationView.classList.add('fade-in');
            }
        }, 150); // 等待淡出动画的一半时间
    } else {
        // 如果没有当前视图，直接切换（首次加载）
        document.querySelectorAll('#hive-content-wrapper > div').forEach(view => view.classList.add('hidden'));
        document.querySelectorAll('#hive-main-tabs > div').forEach((tab, i) => {
            if ((viewName === 'square' && i === 0) || (viewName === 'inspiration' && i === 1)) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });

        if (viewName === 'square') {
            squareView.classList.remove('hidden');
            squareView.classList.add('fade-in');

            // 默认显示频道列表，如果没有选频道
            if (!currentChannel) {
                document.getElementById('hive-channel-list').classList.remove('hidden');
                document.getElementById('hive-chat-room').classList.add('hidden');
            } else {
                document.getElementById('hive-channel-list').classList.add('hidden');
                document.getElementById('hive-chat-room').classList.remove('hidden');
            }
        } else if (viewName === 'inspiration') {
            inspirationView.classList.remove('hidden');
            inspirationView.classList.add('fade-in');
        }
    }
}

// 设置当前频道名
function setChannelTitle(channelId, channels) {
    const headerTitle = document.querySelector('.chat-header .channel-title');
    const channel = channels.find(c => c.id === channelId);
    if (channel && headerTitle) {
        // 获取当前语言设置
        const currentLang = getCurrentLanguage(); // 'zh' or 'en'
        const isZh = currentLang === 'zh';
        
        // 根据语言显示频道名称
        const channelName = isZh ? (channel.name || '') : (channel.name_en || channel.name || '');
        
        // 只更新频道名称文本，不清除在线人数元素
        const nameNode = headerTitle.firstChild;
        if (nameNode && nameNode.nodeType === Node.TEXT_NODE) {
            // 如果是文本节点，直接更新
            nameNode.textContent = `#${channelName}`;
        } else {
            // 如果没有文本节点或第一个子节点不是文本，需要重新设置
            // 但保留在线人数元素
            const existingCount = headerTitle.querySelector('.online-count');
            headerTitle.innerHTML = '';
            headerTitle.textContent = `#${channelName}`;
            if (existingCount) {
                headerTitle.appendChild(existingCount);
            }
        }
    }
}

// 消息提醒声音播放函数
function playMessageSound() {
    try {
        // 检查是否启用声音提醒
        const soundEnabled = localStorage.getItem('hive-sound-notification') !== 'false';
        if (!soundEnabled) {
            return;
        }

        // 使用 Web Audio API 生成好听的通知声音
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // 创建一个悦耳的双音调通知声（类似消息提示音）
        const frequencies = [523.25, 659.25]; // C5 和 E5 音符
        const duration = 0.15;
        const gainValue = 0.3;
        
        frequencies.forEach((freq, index) => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = freq;
            oscillator.type = 'sine'; // 使用正弦波，声音更柔和
            
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(gainValue, audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
            
            oscillator.start(audioContext.currentTime + index * 0.05);
            oscillator.stop(audioContext.currentTime + index * 0.05 + duration);
        });
    } catch (error) {
        console.warn('🐝 Hive: Failed to play notification sound:', error);
    }
}

// 创建上传工具栏
function createUploadToolbar(onImageSelect, onJsonSelect) {
    const toolbar = document.createElement('div');
    toolbar.className = 'hive-input-tools';

    // 隐藏的文件输入框
    const imageInput = document.createElement('input');
    imageInput.type = 'file';
    imageInput.accept = 'image/png,image/jpeg,image/webp';
    imageInput.style.display = 'none';
    // 验证文件格式的辅助函数
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
        
        return { isImage, isJson };
    };

    imageInput.onchange = (e) => {
        if (e.target.files.length > 0) {
            const file = e.target.files[0];
            const validation = validateFileFormat(file);
            if (!validation.isImage) {
                const onlyImageFilesText = typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('toast.onlyImageFiles') : 'Only image files (PNG/JPG/WebP) are supported';
                showToast(onlyImageFilesText, 'error');
                imageInput.value = '';
                return;
            }
            onImageSelect(file);
            imageInput.value = ''; // 重置input以便下次选择相同文件
        }
    };

    const jsonInput = document.createElement('input');
    jsonInput.type = 'file';
    jsonInput.accept = '.json';
    jsonInput.style.display = 'none';
    jsonInput.onchange = (e) => {
        if (e.target.files.length > 0) {
            const file = e.target.files[0];
            const validation = validateFileFormat(file);
            if (!validation.isJson) {
                const currentLang = getCurrentLanguage();
                const isZh = currentLang === 'zh';
                showToast(typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('toast.onlyJsonWorkflow') : 'Only JSON workflow files are supported', 'error');
                jsonInput.value = '';
                return;
            }
            onJsonSelect(file);
            jsonInput.value = ''; // 重置input以便下次选择相同文件
        }
    };

    // 检查声音提醒开关状态（默认开启）
    const soundEnabled = localStorage.getItem('hive-sound-notification') !== 'false';
    const soundIcon = soundEnabled ? '🔔' : '🔕';
    
    // 获取当前语言
    const currentLang = getCurrentLanguage();
    const isZh = currentLang === 'zh';
    const soundText = typeof window !== 'undefined' && typeof window.t === 'function' 
        ? (soundEnabled ? window.t('upload.reminder') : window.t('upload.muted'))
        : (typeof window !== 'undefined' && typeof window.t === 'function' 
            ? (soundEnabled ? window.t('upload.reminder') : window.t('upload.muted'))
            : (soundEnabled ? 'On' : 'Off'));

    // 工具栏按钮
    const addImageTitle = typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('upload.addImage') : 'Add Image (PNG/JPG/WebP)';
    const addJsonTitle = typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('upload.addWorkflowJson') : 'Add Workflow JSON';
    const addEmojiTitle = typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('upload.addEmoji') : 'Add Emoji';
    const soundToggleTitle = typeof window !== 'undefined' && typeof window.t === 'function' 
        ? (soundEnabled ? window.t('upload.disableNotifications') : window.t('upload.enableNotifications'))
        : (soundEnabled ? 'Disable Notifications' : 'Enable Notifications');
    
    toolbar.innerHTML = `
        <button class="hive-upload-btn" id="hive-upload-image" title="${addImageTitle}">
            🖼️
        </button>
        <button class="hive-upload-btn hive-upload-json-btn" id="hive-upload-json" title="${addJsonTitle}">
            📄
        </button>
        <button class="hive-upload-btn" id="hive-upload-emoji" title="${addEmojiTitle}">
            😊
        </button>
        <button class="hive-upload-btn hive-sound-toggle-btn" id="hive-sound-toggle" title="${soundToggleTitle}">
            <span class="hive-sound-icon">${soundIcon}</span>
            <span class="hive-sound-text">${soundText}</span>
        </button>
    `;

    // 消息提醒开关按钮事件
    const soundToggleBtn = toolbar.querySelector('#hive-sound-toggle');
    if (soundToggleBtn) {
        soundToggleBtn.onclick = (e) => {
            e.stopPropagation();
            const currentState = localStorage.getItem('hive-sound-notification') !== 'false';
            const newState = !currentState;
            localStorage.setItem('hive-sound-notification', newState.toString());
            
            // 更新按钮图标和文字
            const iconSpan = soundToggleBtn.querySelector('.hive-sound-icon');
            const textSpan = soundToggleBtn.querySelector('.hive-sound-text');
            if (iconSpan) {
                iconSpan.textContent = newState ? '🔔' : '🔕';
            }
            if (textSpan) {
                const currentLang = getCurrentLanguage();
                const isZh = currentLang === 'zh';
                const reminderText = typeof window !== 'undefined' && typeof window.t === 'function' 
                    ? (newState ? window.t('upload.reminder') : window.t('upload.muted'))
                    : (newState ? 'On' : 'Off');
                textSpan.textContent = reminderText;
            }
            if (soundToggleBtn) {
                const soundToggleTitle = typeof window !== 'undefined' && typeof window.t === 'function' 
                    ? (newState ? window.t('upload.disableNotifications') : window.t('upload.enableNotifications'))
                    : (newState ? 'Disable Notifications' : 'Enable Notifications');
                soundToggleBtn.title = soundToggleTitle;
            }
            
            // 添加视觉反馈
            soundToggleBtn.style.transform = 'scale(1.2)';
            setTimeout(() => {
                soundToggleBtn.style.transform = 'scale(1)';
            }, 200);
            
            // 如果开启，播放一次测试声音
            if (newState) {
                playMessageSound();
            }
        };
    }

    // emoji表情选择器
    const emojiPicker = document.createElement('div');
    emojiPicker.className = 'hive-emoji-picker';
    emojiPicker.style.display = 'none';

    // 常用表情符数组
    const emojiList = [
        '😊', '😂', '😍', '🥰', '😘', '🤗', '🤔', '🙄', '😉', '😋',
        '😎', '🤓', '😇', '🥺', '😢', '😭', '🥴', '😴', '🤗', '🤔',
        '😅', '😆', '😄', '🙃', '😁', '😙', '👍', '👎', '👌', '✌️',
        '🤘', '👏', '🙌', '🤝', '👋', '💪', '♥️', '🔥', '✨', '⭐'
    ];

    emojiList.forEach(emoji => {
        const emojiBtn = document.createElement('button');
        emojiBtn.className = 'hive-emoji-item';
        emojiBtn.textContent = emoji;
        emojiBtn.onclick = (e) => {
            e.stopPropagation();
            insertEmojiToTextarea(emoji);
            emojiPicker.style.display = 'none';
        };
        emojiPicker.appendChild(emojiBtn);
    });

    function insertEmojiToTextarea(emoji) {
        // 查找Hive侧边栏中的输入框
        const textarea = document.querySelector('.chat-input-textarea');
        if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const text = textarea.value;
            textarea.value = text.substring(0, start) + emoji + text.substring(end);
            textarea.selectionStart = textarea.selectionEnd = start + emoji.length;
            textarea.focus();
        }
    }

    // 绑定按钮事件
    toolbar.querySelector('#hive-upload-image').onclick = () => imageInput.click();
    toolbar.querySelector('#hive-upload-json').onclick = () => jsonInput.click();

    const emojiBtn = toolbar.querySelector('#hive-upload-emoji');
    emojiBtn.onclick = (e) => {

        // 切换显示状态
        const isVisible = emojiPicker.style.display !== 'none';

        emojiPicker.style.display = isVisible ? 'none' : 'grid';

        // 如果显示，定位到按钮右侧，对齐底部
        if (!isVisible) {

            const pickerWidth = 320;
            const pickerHeight = 180;

            // 计算相对于工具栏的位置（精确布局）
            // 三个按钮: 每个24px + 两个gap各4px = 24+4+24+4+24 = 80px
            // 第三个按钮右侧6px: 80 + 6 = 86px
            let left = 80 + 6; // 86px - 表情面板左侧挨着按钮右侧
            let top = 24 - pickerHeight; // -156px - 底部对齐

            // 检查右侧边界，避免超出侧边栏
            const sidebar = document.querySelector('#hive-sidebar');
            if (sidebar) {
                const sidebarRect = sidebar.getBoundingClientRect();
                const toolsRect = toolbar.getBoundingClientRect();
                const availableWidth = sidebarRect.width - (toolsRect.left - sidebarRect.left);


                if (left + pickerWidth > availableWidth - 16) {
                    left = availableWidth - pickerWidth - 8; // 留8px小间距
                }
            }


            emojiPicker.style.position = 'absolute';
            emojiPicker.style.left = left + 'px';
            emojiPicker.style.top = top + 'px';
            emojiPicker.style.zIndex = '2000';

        } else {
        }

        // 阻止事件冒泡，防止sidebar关闭
        e.stopPropagation();
    };

    // 点击外部关闭emoji选择器
    const handleGlobalClick = (e) => {
        if (!emojiBtn.contains(e.target) && !emojiPicker.contains(e.target)) {
            emojiPicker.style.display = 'none';
        }
    };

    document.addEventListener('click', handleGlobalClick);
    emojiPicker.addEventListener('click', (e) => e.stopPropagation()); // 防止表情选择器点击自身关闭

    // 将隐藏的input和emoji选择器添加到toolbar
    toolbar.appendChild(imageInput);
    toolbar.appendChild(jsonInput);
    toolbar.appendChild(emojiPicker);

    return toolbar;
}

// 创建文件预览组件
function createFilePreview(file, onRemove) {
    const preview = document.createElement('div');
    preview.className = 'hive-file-preview';

    // 获取当前语言
    const currentLang = getCurrentLanguage();
    const isZh = currentLang === 'zh';

    if (file.type.startsWith('image/')) {
        const imageUrl = URL.createObjectURL(file);
        preview.innerHTML = `
            <div class="hive-file-preview-content">
                <img src="${imageUrl}" alt="${file.name}" />
                <div class="hive-file-preview-info">
                    <div class="hive-file-preview-name">${file.name}</div>
                    <div class="hive-file-preview-type">[${file.type.startsWith('image/') 
                        ? (typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('common.image') : 'Image')
                        : (typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('common.file') : 'File')}]</div>
                </div>
            </div>
            <button class="hive-file-preview-remove" title="${typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('common.remove') : 'Remove'}">×</button>
        `;
    } else {
        preview.innerHTML = `
            <div class="hive-file-preview-content hive-json-preview">
                <div class="hive-json-icon">📄</div>
                <div class="hive-file-preview-info">
                    <div class="hive-file-preview-name">${file.name}</div>
                    <div class="hive-file-preview-type">[${typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('common.workflowJson') : 'Workflow JSON'}]</div>
                </div>
            </div>
            <button class="hive-file-preview-remove" title="${typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('common.remove') : 'Remove'}">×</button>
        `;
    }

    // 绑定移除事件
    if (onRemove) {
        preview.querySelector('.hive-file-preview-remove').onclick = onRemove;
    }

    return preview;
}

// 灵感画廊数据
const GALLERY_DATA = [
    { id: 1, type: 'image', title: 'Sunset Landscape', author: 'Alice', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice', image: 'https://placehold.co/400x240/666/fff?text=Image+1' },
    { id: 2, type: 'video', title: 'Animation Clip', author: 'Bob', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob', image: 'https://placehold.co/400x240/777/fff?text=Video+Poster', video: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4' },
    { id: 3, type: 'workflow', title: 'Advanced Workflow', author: 'Carol', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carol', image: 'https://placehold.co/400x240/555/fff?text=Workflow+Preview', workflowJSON: '{"last_node_id": 10, "last_link_id": 9, "nodes": [{"id": 5, "type": "CLIPTextEncode", "pos": [450, 600], "size": [400, 200], "flags": {}, "order": 7, "mode": 0, "outputs": [{"type": "CLIP_VISION_OUTPUT", "name": "CLIP_VISION"}] }, {"id": 10, "type": "SaveImage", "pos": [1100, 600], "size": [400, 200], "flags": {}, "order": 8, "mode": 0, "outputs": [] }, {"id": 6, "type": "CLIPVisionLoader", "pos": [300, 200], "size": [400, 200], "flags": {}, "order": 0, "mode": 0, "outputs": [{"type": "CLIP", "name": "CLIP"}] }], "links": [[7, 6, 1, 5, 0], [8, 5, 0, 7, 1], [9, 7, 0, 10, 0]], "groups": [], "config": {}, "extra": {}, "version": 0.4}' },
    { id: 4, type: 'image', title: 'Portrait Art', author: 'Dave', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Dave', image: 'https://placehold.co/400x240/888/fff?text=Image+2' },
    { id: 5, type: 'model', title: 'DreamShaper XL', author: 'Lyriel', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lyriel', image: 'https://placehold.co/600x400/333/fff?text=Model+Cover', baseModel: 'SDXL', modelType: 'Checkpoint', downloads: 15420, description: 'High-quality checkpoint model for generating detailed portraits and landscapes. Compatible with SDXL ecosystem.' },
    { id: 6, type: 'model', title: 'Add More Details', author: 'UnknownX', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=UnknownX', image: 'https://placehold.co/600x400/444/fff?text=LoRA+Cover', baseModel: 'SD 1.5', modelType: 'LoRA', downloads: 8920, description: 'LoRA adaptation for adding intricate details to generated images. Great for upscaling and refinement.' },
    { id: 7, type: 'video', title: 'Diffusion Process', author: 'Visualiser', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Visualiser', image: 'https://placehold.co/400x240/999/fff?text=Video+Poster2', video: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4' }
];

// 创建灵感瀑布流卡片DOM元素
function createGalleryCard(item, texts, showLightbox, showVideoPlayer, showEnhancedLightbox, showModelDetail) {
    const itemEl = document.createElement('div');
    itemEl.className = 'gallery-item';

    let media;
    if (item.type === 'video') {
        media = document.createElement('video');
        media.src = item.video;
        media.muted = true;
        media.poster = item.image;
        media.onmouseenter = () => {
            media.play();
        };
        media.onmouseleave = () => {
            media.pause();
            media.currentTime = 0;
        };
    } else {
        media = document.createElement('img');
        media.src = item.image;
    }
    media.onclick = () => {
        if (item.type === 'video') {
            showVideoPlayer(item);
        } else if (item.type === 'model') {
            showModelDetail(item);
        } else if (item.type === 'workflow') {
            showEnhancedLightbox(item);
        } else {
            showLightbox(item.image);
        }
    };
    itemEl.appendChild(media);

    if (item.type === 'workflow') {
        const loadBtn = document.createElement('button');
        loadBtn.className = 'gallery-load-btn';
        loadBtn.textContent = texts.loadBtn;
        loadBtn.onclick = () => showEnhancedLightbox(item);
        itemEl.appendChild(loadBtn);
    }

    const info = document.createElement('div');
    info.className = 'gallery-info';
    if (item.type === 'workflow') {
        info.style.justifyContent = 'center';
    } else {
        const avatar = document.createElement('img');
        avatar.className = 'avatar';
        avatar.src = item.avatar;
        info.appendChild(avatar);
        const title = document.createElement('div');
        title.className = 'title';
        title.textContent = item.title;
        info.appendChild(title);
    }
    itemEl.appendChild(info);

    return itemEl;
}

// 视频播放器DOM创建
function showVideoPlayer(item, itemData = null) {
    if (document.getElementById('hive-video-modal')) return;
    
    const isZh = getCurrentLanguage() === 'zh';
    
    const modal = document.createElement('div');
    modal.id = 'hive-video-modal';
    
    // 创建关闭按钮
    const closeBtn = document.createElement('button');
    closeBtn.className = 'hive-lightbox-close';
    closeBtn.innerHTML = '×';
    closeBtn.title = typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('common.close') : 'Close';
    closeBtn.onclick = () => {
        document.body.removeChild(modal);
    };
    
    const video = document.createElement('video');
    video.controls = true;
    const videoSrc = item.video || item.video_url || '';
    if (!videoSrc) {
        console.error('🐝 Hive: Video source is empty');
        return;
    }
    video.src = videoSrc;
    
    // 保存引用，因为onloadedmetadata中会清空innerHTML
    let savedCloseBtn = closeBtn;
    let savedVideo = video; // 保存video引用
    
    // 等待视频元数据加载完成后，根据视频方向决定布局
    const setupLayout = () => {
        // 获取视频尺寸（在清空前）
        const videoWidth = savedVideo.videoWidth || savedVideo.width || 16;
        const videoHeight = savedVideo.videoHeight || savedVideo.height || 9;
        const isPortrait = videoHeight > videoWidth; // 纵向视频
        
        // 获取当前语言
        const currentLang = getCurrentLanguage();
        const isZhLang = currentLang === 'zh';
        
        // 标签文本映射
        // 直接使用语言文件，不使用硬编码回退
        const labelTexts = {
            prompt: typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('labels.prompt') : 'Prompt',
            negative: typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('labels.negative') : 'Negative Prompt',
            model: typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('labels.model') : 'Model',
            sampler: typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('labels.sampler') : 'Sampler',
            steps: typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('labels.steps') : 'Steps',
            cfgScale: typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('labels.cfgScale') : 'CFG Scale',
            seed: typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('labels.seed') : 'Seed',
            title: typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('labels.title') : 'Title',
            description: typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('labels.description') : 'Description'
        };
        
        // 收集要显示的信息（在创建元素之前）
        const infoItems = [];
        
        // 从 itemData 提取信息
        if (itemData) {
            // 提示词信息
            if (itemData.extra && typeof itemData.extra === 'object') {
                const extra = itemData.extra;
                if (extra.prompt || extra.positive) {
                    infoItems.push({
                        label: labelTexts.prompt,
                        value: extra.prompt || extra.positive || ''
                    });
                }
                if (extra.negative) {
                    infoItems.push({
                        label: labelTexts.negative,
                        value: extra.negative
                    });
                }
                if (extra.model || extra.base_model) {
                    infoItems.push({
                        label: labelTexts.model,
                        value: extra.model || extra.base_model || ''
                    });
                }
                if (extra.sampler) {
                    infoItems.push({
                        label: labelTexts.sampler,
                        value: extra.sampler
                    });
                }
                if (extra.steps) {
                    infoItems.push({
                        label: labelTexts.steps,
                        value: String(extra.steps)
                    });
                }
                if (extra.cfg_scale || extra.cfg) {
                    infoItems.push({
                        label: labelTexts.cfgScale,
                        value: String(extra.cfg_scale || extra.cfg || '')
                    });
                }
                if (extra.seed) {
                    infoItems.push({
                        label: labelTexts.seed,
                        value: String(extra.seed)
                    });
                }
            }
            
            // 标题和描述
            if (itemData.title) {
                infoItems.push({
                    label: labelTexts.title,
                    value: itemData.title
                });
            }
            if (itemData.description) {
                infoItems.push({
                    label: labelTexts.description,
                    value: itemData.description
                });
            }
        }
        
        // 清空 modal 内容
        modal.innerHTML = '';
        modal.appendChild(savedCloseBtn); // 重新添加关闭按钮
        
        // 创建新的video元素（因为旧的可能被innerHTML清除了）
        const newVideo = document.createElement('video');
        newVideo.controls = true;
        newVideo.src = savedVideo.src;
        newVideo.style.objectFit = 'contain';
        newVideo.style.display = 'block';
        
        // 计算可用空间
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const maxContainerWidth = viewportWidth * 0.9;
        const maxContainerHeight = viewportHeight * 0.9;
        const padding = 40; // 20px * 2
        const gap = 20;
        const infoPanelWidth = infoItems.length > 0 ? (isPortrait ? 400 : 0) : 0;
        const infoPanelHeight = infoItems.length > 0 ? (!isPortrait ? 300 : 0) : 0;
        
        // 视频可用空间
        let availableWidth, availableHeight;
        if (isPortrait) {
            // 纵向：视频在左，信息在右
            availableWidth = maxContainerWidth - padding - gap - infoPanelWidth;
            availableHeight = maxContainerHeight - padding;
        } else {
            // 横向：视频在上，信息在下
            availableWidth = maxContainerWidth - padding;
            availableHeight = maxContainerHeight - padding - gap - infoPanelHeight;
        }
        
        // 根据视频实际尺寸计算显示尺寸，保持比例
        const videoAspectRatio = videoWidth / videoHeight;
        let displayWidth = Math.min(videoWidth, availableWidth);
        let displayHeight = displayWidth / videoAspectRatio;
        
        if (displayHeight > availableHeight) {
            displayHeight = Math.min(videoHeight, availableHeight);
            displayWidth = displayHeight * videoAspectRatio;
        }
        
        // 设置视频尺寸，允许小视频保持原始尺寸
        newVideo.style.maxWidth = displayWidth + 'px';
        newVideo.style.maxHeight = displayHeight + 'px';
        newVideo.style.width = Math.min(videoWidth, displayWidth) + 'px';
        newVideo.style.height = 'auto';
        
        // 创建内容容器
        const contentContainer = document.createElement('div');
        contentContainer.className = 'hive-lightbox-content-container';
        contentContainer.style.display = 'flex';
        contentContainer.style.gap = gap + 'px';
        contentContainer.style.alignItems = isPortrait ? 'center' : 'flex-start';
        contentContainer.style.justifyContent = 'center';
        contentContainer.style.maxWidth = maxContainerWidth + 'px';
        contentContainer.style.maxHeight = maxContainerHeight + 'px';
        contentContainer.style.margin = 'auto';
        contentContainer.style.padding = '20px';
        contentContainer.style.boxSizing = 'border-box';
        
        // 视频容器
        const videoContainer = document.createElement('div');
        videoContainer.className = 'hive-lightbox-video-container';
        videoContainer.style.display = 'flex';
        videoContainer.style.alignItems = 'center';
        videoContainer.style.justifyContent = 'center';
        videoContainer.style.flexShrink = '0';
        videoContainer.style.flexGrow = '0';
        videoContainer.style.width = 'auto';
        videoContainer.style.height = 'auto';
        videoContainer.appendChild(newVideo);
        
        // 信息面板（根据视频方向决定位置）
        let infoPanel = null;
        if (infoItems.length > 0) {
            infoPanel = document.createElement('div');
            infoPanel.className = 'hive-lightbox-info-panel';
            infoPanel.style.flex = isPortrait ? '1 1 auto' : '0 0 auto';
            infoPanel.style.minWidth = isPortrait ? '300px' : 'auto';
            infoPanel.style.maxWidth = isPortrait ? '400px' : '100%';
            infoPanel.style.maxHeight = isPortrait ? '90vh' : 'auto';
            infoPanel.style.overflowY = 'auto';
            infoPanel.style.overflowX = 'hidden';
            if (!isPortrait) {
                // 横向视频：key和value在同一行
                infoPanel.classList.add('hive-lightbox-info-panel-landscape');
            }
            
            infoItems.forEach(item => {
                const infoItem = document.createElement('div');
                infoItem.className = 'hive-lightbox-info-item';
                
                const label = document.createElement('div');
                label.className = 'hive-lightbox-info-label';
                label.textContent = item.label + ':';
                
                const value = document.createElement('div');
                value.className = 'hive-lightbox-info-value';
                value.textContent = item.value;
                
                if (!isPortrait) {
                    // 横向视频：key和value在同一行
                    infoItem.style.display = 'flex';
                    infoItem.style.flexDirection = 'row';
                    infoItem.style.alignItems = 'flex-start';
                    infoItem.style.gap = '8px';
                    label.style.flexShrink = '0';
                    label.style.marginBottom = '0';
                    value.style.flex = '1';
                }
                
                infoItem.appendChild(label);
                infoItem.appendChild(value);
                infoPanel.appendChild(infoItem);
            });
        }
        
        // 设置布局方向并添加子元素
        if (isPortrait) {
            // 纵向视频：视频在左，信息在右
            contentContainer.style.flexDirection = 'row';
            contentContainer.appendChild(videoContainer);
            if (infoPanel) {
                contentContainer.appendChild(infoPanel);
            }
        } else {
            // 横向视频：视频在上，信息在下
            contentContainer.style.flexDirection = 'column';
            contentContainer.appendChild(videoContainer);
            if (infoPanel) {
                contentContainer.appendChild(infoPanel);
            }
        }
        
        modal.appendChild(contentContainer);
        
        // 阻止视频和信息面板的点击事件冒泡
        const videoInContainer = videoContainer.querySelector('video');
        if (videoInContainer) {
            videoInContainer.onclick = (e) => {
                e.stopPropagation();
            };
        }
        if (infoPanel) {
            infoPanel.onclick = (e) => {
                e.stopPropagation();
            };
        }
    };
    
    // 绑定事件
    savedVideo.onloadedmetadata = setupLayout;
    savedVideo.onerror = () => {
        console.error('🐝 Hive: Video loading error');
        // 即使加载失败，也显示视频元素（可能可以播放）
        setupLayout();
    };
    
    modal.onclick = (e) => {
        // 点击背景关闭，点击视频或信息面板不关闭
        if (e.target === modal || 
            (e.target.classList.contains('hive-lightbox-content-container') && 
             !e.target.closest('.hive-lightbox-video-container') && 
             !e.target.closest('.hive-lightbox-info-panel'))) {
            if (document.body.contains(modal)) {
                document.body.removeChild(modal);
            }
        }
    };
    
    // 先添加到DOM
    document.body.appendChild(modal);
    modal.appendChild(savedCloseBtn);
    modal.appendChild(savedVideo); // 临时添加，触发元数据加载
    
    // 如果视频元数据已加载，直接触发 setupLayout
    if (savedVideo.readyState >= 1) { // HAVE_METADATA
        // 使用setTimeout确保DOM已更新
        setTimeout(setupLayout, 0);
    }
};

// 模型详情面板
function showModelDetail(item) {
    if (document.getElementById('hive-model-detail')) return;
    
    // 获取当前语言
    const currentLang = getCurrentLanguage();
    const isZh = currentLang === 'zh';
    
    const panel = document.createElement('div');
    panel.id = 'hive-model-detail';
    panel.innerHTML = `
        <div class="model-cover">
            <img src="${item.image}" />
        </div>
        <div class="model-info">
            <h3>${item.title}</h3>
            <div class="model-author">by ${item.author}</div>
            <div class="model-tags">
                <span>${item.baseModel}</span>
                <span>${item.modelType}</span>
            </div>
            <div class="model-desc">${item.description}</div>
            <button class="download-btn">${typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('common.downloadModel') : 'Download Model'}</button>
        </div>
    `;
    const background = document.createElement('div');
    background.style.position = 'fixed';
    background.style.inset = '0';
    background.style.backgroundColor = 'rgba(0,0,0,0.5)';
    background.style.zIndex = '9999';
    background.onclick = () => {
        document.body.removeChild(panel);
        document.body.removeChild(background);
    };
    panel.querySelector('.download-btn').onclick = () => showToast(texts.toast.downloadStarted, 'info');
    document.body.appendChild(background);
    document.body.appendChild(panel);
    setTimeout(() => panel.style.right = '0');
};

// 增强灯箱
function showEnhancedLightbox(item) {
    if (document.getElementById('hive-lightbox')) return;
    
    // 获取当前语言
    const currentLang = getCurrentLanguage();
    const isZh = currentLang === 'zh';
    
    // parse nodes
    const nodes = [];
    try {
        const jsonData = JSON.parse(item.workflowJSON);
        jsonData.nodes.forEach(node => nodes.push(node.type));
    } catch (e) {
        nodes.push(typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('workflow.unableToParse') : 'Unable to parse workflow');
    }
    const lightbox = document.createElement('div');
    lightbox.id = 'hive-lightbox';
    lightbox.innerHTML = `
        <div class="lightbox-content">
            <img src="${item.image}" >
            <div class="node-list">
                <h4>${typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('workflow.nodeList') : 'Node List'}</h4>
                <div class="node-items">
                    ${nodes.map(name => `<div>${name}</div>`).join('')}
                </div>
                <button class="load-workflow-btn">${typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('common.loadWorkflow') : 'Load Workflow'}</button>
            </div>
        </div>
    `;

    lightbox.onclick = (e) => {
        if (e.target === lightbox) document.body.removeChild(lightbox);
    };

    lightbox.querySelector('.load-workflow-btn').onclick = () => {
        try {
            const workflowData = JSON.parse(item.workflowJSON);
            // Load workflow into ComfyUI
            if (window.app && window.app.loadGraphData) {
                window.app.loadGraphData(workflowData);
                document.body.removeChild(lightbox);
                showToast(typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('toast.workflowLoaded') : 'Workflow loaded to canvas', 'success');
            } else {
                console.error('ComfyUI app not found');
                const isZh = getCurrentLanguage() === 'zh';
                showToast(typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('toast.workflowLoadFailed') : 'Unable to load workflow: ComfyUI not found', 'error');
            }
        } catch (e) {
            console.error('Parse workflow error:', e);
            const isZh = getCurrentLanguage() === 'zh';
            showToast(typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('toast.unableToLoadWorkflow') : 'Unable to load workflow', 'error');
        }
    };

    document.body.appendChild(lightbox);
};

// 渲染灵感网格
function renderGallery(filter = 'all') {
    const gridEl = document.querySelector('.gallery-grid');
    if (!gridEl) {
        console.error('🐝 Hive: gallery-grid not found');
        return;
    }

    gridEl.innerHTML = '';
    const filtered = GALLERY_DATA.filter(item => filter === 'all' || item.type === filter);
    console.log('🐝 Filtered items:', filtered.length);

    const isZh = getCurrentLanguage() === 'zh';
    const texts = {
        loadBtn: typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('common.loadWorkflow') : 'Load Workflow',
        toast: {
            workflowLoaded: typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('toast.workflowLoaded') : 'Workflow loaded to canvas',
            downloadStarted: typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('toast.downloadStarted') : 'Download started'
        }
    };

    filtered.forEach(item => {
        const itemEl = createGalleryCard(item, texts, showLightbox, showVideoPlayer, showEnhancedLightbox, showModelDetail);
        gridEl.appendChild(itemEl);
    });

}

// 设置Gallery过滤器
function setGalleryFilter(filter) {
    const chips = document.querySelectorAll('.gallery-filter-chip');
    chips.forEach(chip => chip.classList.remove('active'));
    const activeChip = Array.from(chips).find(chip => chip.textContent === reverseFilterMap[filter]);
    if (activeChip) activeChip.classList.add('active');
    renderGallery(filter);
}

// 过滤映射
const reverseFilterMap = {
    all: 'All',
    image: 'Images',
    video: 'Videos',
    workflow: 'Workflows',
    model: 'Models'
};

// 等待容器内所有图片加载完成
function waitForImages(container) {
    return new Promise((resolve) => {
        const images = container.querySelectorAll('img');
        if (images.length === 0) {
            resolve();
            return;
        }

        let loadedCount = 0;
        let errorCount = 0;
        const totalImages = images.length;

        const checkComplete = () => {
            if (loadedCount + errorCount >= totalImages) {
                resolve();
            }
        };

        images.forEach((img) => {
            if (img.complete) {
                // 图片已经加载完成
                loadedCount++;
                checkComplete();
            } else {
                img.onload = () => {
                    loadedCount++;
                    checkComplete();
                };
                img.onerror = () => {
                    errorCount++;
                    checkComplete();
                };
            }
        });

        // 设置超时，避免某些图片永远不加载
        setTimeout(() => {
            resolve();
        }, 5000); // 最多等待 5 秒
    });
}

// 判断 workflowData 是否是 URL
function isWorkflowUrl(workflowData) {
    if (!workflowData || typeof workflowData !== 'string') {
        return false;
    }
    return workflowData.startsWith('http://') || 
           workflowData.startsWith('https://') || 
           workflowData.match(/\.json$/i) !== null;
}

// 加载工作流到ComfyUI（支持JSON文本和URL两种格式）
async function loadWorkflowToComfyUI(workflowData) {
    try {
        const currentLang = getCurrentLanguage();
        const isZh = currentLang === 'zh';
        
        let workflow = null;
        
        // 判断是 URL 还是 JSON 文本
        if (isWorkflowUrl(workflowData)) {
            // 如果是 URL，从 URL 获取 JSON 内容
            console.log('🐝 Hive: Loading workflow from URL:', workflowData);
            showToast(typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('toast.workflowLoadingFromUrl') : 'Loading workflow from link...', 'info');
            
            const response = await fetch(workflowData);
            if (!response.ok) {
                const errorMsg = typeof window !== 'undefined' && typeof window.t === 'function' 
                    ? window.t('toast.unableToLoadWorkflowFile') + `${response.status} ${response.statusText}` 
                    : `Unable to load workflow file: ${response.status} ${response.statusText}`;
                throw new Error(errorMsg);
            }
            
            const jsonText = await response.text();
            workflow = JSON.parse(jsonText);
            console.log('🐝 Hive: Workflow loaded from URL successfully');
        } else if (typeof workflowData === 'string') {
            // 如果是 JSON 文本字符串，直接解析
            console.log('🐝 Hive: Loading workflow from JSON text');
            workflow = JSON.parse(workflowData);
        } else if (typeof workflowData === 'object') {
            // 如果已经是对象，直接使用
            workflow = workflowData;
        } else {
            throw new Error(typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('toast.invalidWorkflowFormat') : 'Invalid workflow data format');
        }
        
        // 验证工作流数据
        if (!workflow || typeof workflow !== 'object' || !Array.isArray(workflow.nodes)) {
            throw new Error(typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('toast.invalidComfyUIWorkflow') : 'Invalid ComfyUI workflow format');
        }
        
        // 加载到ComfyUI
        if (window.app && window.app.loadGraphData) {
            window.app.loadGraphData(workflow);
            showToast(typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('toast.workflowLoaded') : 'Workflow loaded to canvas', 'success');
        } else {
            console.error('ComfyUI app not found');
            showToast(typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('toast.workflowLoadFailed') : 'Unable to load workflow: ComfyUI not found', 'error');
        }
    } catch (error) {
        console.error('🐝 Hive: Failed to load workflow:', error);
        const currentLang = getCurrentLanguage();
        const isZh = currentLang === 'zh';
        const loadWorkflowErrorText = typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('toast.workflowLoadError') : 'Failed to load workflow: ';
        showToast(loadWorkflowErrorText + error.message, 'error');
    }
}

// ======================== 翻译辅助函数（灵感模块用） ========================

// 检测系统语言
function detectSystemLanguage() {
    if (window.app && window.app.ui && window.app.ui.settings) {
        const comfyLang = window.app.ui.settings.language;
        if (comfyLang) {
            return comfyLang.startsWith('zh') ? 'zh' : 'en';
        }
    }
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

// 导出到全局，以便语言文件可以访问
if (typeof window !== 'undefined') {
    window.getCurrentLanguage = getCurrentLanguage;
}

// 是否开启自动翻译
function isAutoTranslateEnabled() {
    return localStorage.getItem('hive_auto_translate_enabled') === 'true';
}

// 检测文本语种
function detectTextLang(text) {
    if (!text) return 'unknown';
    const hasChinese = /[\u4e00-\u9fff]/.test(text);
    const hasLatin = /[A-Za-z]/.test(text);
    if (hasChinese && !hasLatin) return 'zh';
    if (hasLatin && !hasChinese) return 'en';
    if (hasChinese && hasLatin) {
        const chineseCount = (text.match(/[\u4e00-\u9fff]/g) || []).length;
        const latinCount = (text.match(/[A-Za-z]/g) || []).length;
        return chineseCount >= latinCount ? 'zh' : 'en';
    }
    return 'unknown';
}

// 翻译文本元素（包括title属性）
let inspirationTranslateBusy = false;
let inspirationTranslateQueue = [];
let inspirationTranslateProcessing = false;

// 内部翻译函数（支持队列控制）
async function translateInspirationTextInternal(textEl, options = {}) {
    if (!textEl) return;

    const originalText = (textEl.dataset.originalText || textEl.textContent || '').trim();
    if (!originalText) return;

    // 已经是翻译状态则还原
    const isTranslated = textEl.dataset.translated === 'true';
    if (isTranslated) {
        const raw = textEl.dataset.originalText;
        if (raw != null) {
            textEl.textContent = raw;
            // 同时还原title
            if (textEl.title && textEl.dataset.originalTitle) {
                textEl.title = textEl.dataset.originalTitle;
            }
        }
        textEl.dataset.translated = 'false';
        return;
    }

    const currentLang = getCurrentLanguage();
    const textLang = detectTextLang(originalText);

    // 自动模式：只翻译与当前界面语言不同的文本
    if (options.auto === true) {
        if (textLang === 'unknown' || textLang === currentLang) {
            return;
        }
    }

    // 目标语言
    let targetLang = currentLang;
    if (!options.auto && textLang === currentLang && (textLang === 'zh' || textLang === 'en')) {
        targetLang = currentLang === 'zh' ? 'en' : 'zh';
    }

    // 仅支持中英互译
    if (!((textLang === 'zh' || textLang === 'en') && (targetLang === 'zh' || targetLang === 'en'))) {
        return;
    }

    const fromName = textLang === 'zh' ? 'chinese_simplified' : 'english';
    const toName = targetLang === 'zh' ? 'chinese_simplified' : 'english';

    // 如果跳过队列（内部调用），直接执行
    if (options.skipQueue) {
        // 继续执行翻译逻辑
    } else if (options.auto) {
        // 自动翻译：加入队列并立即返回（不阻塞）
        inspirationTranslateQueue.push({ textEl, options });
        processInspirationTranslateQueue();
        return;
    } else {
        // 手动翻译：等待队列清空
        while (inspirationTranslateQueue.length > 0 || inspirationTranslateProcessing) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        inspirationTranslateProcessing = true;
    }

    try {
        if (!options.skipQueue) {
            inspirationTranslateProcessing = true;
        }

        // 加载翻译库
        if (!window.translate || !window.translate.version) {
            const script = document.createElement('script');
            script.src = '/extensions/ComfyUI-Hive/lib/translate.js';
            await new Promise((resolve, reject) => {
                script.onload = () => {
                    setTimeout(() => {
                        if (window.translate && window.translate.version) {
                            // 初始化 translate.js（如果需要）
                            if (window.translate.request && typeof window.translate.request.init === 'function') {
                                window.translate.request.init();
                            }
                            resolve();
                        } else {
                            reject(new Error('translate.js loaded but translate object not found'));
                        }
                    }, 100);
                };
                script.onerror = () => reject(new Error('Failed to load translate.js'));
                document.head.appendChild(script);
            });
        } else {
            // 确保已初始化
            if (window.translate.request && typeof window.translate.request.init === 'function') {
                window.translate.request.init();
            }
        }

        // 记录原文
        if (!textEl.dataset.originalText) {
            textEl.dataset.originalText = originalText;
        }
        // 记录原始title
        if (textEl.title && !textEl.dataset.originalTitle) {
            textEl.dataset.originalTitle = textEl.title;
        }

        // 配置 translate.js
        if (window.translate && typeof window.translate.setDocuments === 'function') {
            // 确保请求已初始化
            if (window.translate.request && typeof window.translate.request.initRequest === 'function') {
                window.translate.request.initRequest();
            }
            
            // 设置源语言和目标语言
            window.translate.language.setLocal(fromName);
            window.translate.to = toName;
            
            // 设置要翻译的文档
            window.translate.setDocuments([textEl]);
            
            // 等待前一个翻译任务完成（简单轮询检查）
            let waitCount = 0;
            while (inspirationTranslateBusy && waitCount < 30) {
                await new Promise(resolve => setTimeout(resolve, 100));
                waitCount++;
            }
            
            // 额外等待一小段时间，确保前一个任务完全完成
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // 执行翻译
            window.translate.execute([textEl]);
            
            // 等待翻译完成（简单等待，translate.js 会异步处理）
            // 等待足够的时间让翻译完成
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            textEl.dataset.translated = 'true';

            // 翻译title属性（延迟执行，等文本翻译完成）
            if (textEl.title && textEl.dataset.originalTitle) {
                // 等待一下再翻译 title
                await new Promise(resolve => setTimeout(resolve, 300));
                
                try {
                    // 使用 translate.js 翻译 title 文本
                    const titleText = textEl.dataset.originalTitle;
                    const titleSpan = document.createElement('span');
                    titleSpan.textContent = titleText;
                    titleSpan.style.display = 'none';
                    document.body.appendChild(titleSpan);
                    
                    window.translate.language.setLocal(fromName);
                    window.translate.to = toName;
                    window.translate.setDocuments([titleSpan]);
                    window.translate.execute([titleSpan]);
                    
                    // 等待翻译完成
                    await new Promise((resolve) => {
                        let finished = false;
                        const finishCallback = function(uuid, to) {
                            if (!finished) {
                                finished = true;
                                if (window.translate.lifecycle && window.translate.lifecycle.execute) {
                                    const index = window.translate.lifecycle.execute.renderFinish.indexOf(finishCallback);
                                    if (index > -1) {
                                        window.translate.lifecycle.execute.renderFinish.splice(index, 1);
                                    }
                                }
                                resolve();
                            }
                        };
                        
                        if (window.translate.lifecycle && window.translate.lifecycle.execute) {
                            if (!window.translate.lifecycle.execute.renderFinish) {
                                window.translate.lifecycle.execute.renderFinish = [];
                            }
                            window.translate.lifecycle.execute.renderFinish.push(finishCallback);
                        }
                        
                        setTimeout(() => {
                            if (!finished) {
                                finished = true;
                                const index = window.translate.lifecycle.execute.renderFinish.indexOf(finishCallback);
                                if (index > -1) {
                                    window.translate.lifecycle.execute.renderFinish.splice(index, 1);
                                }
                                resolve();
                            }
                        }, 3000);
                    });
                    
                    if (titleSpan.textContent && titleSpan.textContent !== titleText) {
                        textEl.title = titleSpan.textContent;
                    }
                    
                    document.body.removeChild(titleSpan);
                } catch (e) {
                    console.warn('🐝 Hive: Failed to translate title:', e);
                }
            }
        }
    } catch (error) {
        console.error('🐝 Hive: translate inspiration text failed:', error);
        if (!options.auto) {
            const isZh = getCurrentLanguage() === 'zh';
            const translateFailedText = typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('toast.translateFailed') : 'Translation failed: ';
            showToast(translateFailedText + error.message, 'error');
        }
    } finally {
        if (!options.skipQueue) {
            inspirationTranslateProcessing = false;
            // 处理队列中的下一个任务
            processInspirationTranslateQueue();
        }
    }
}

// 公开的翻译函数（支持队列）
async function translateInspirationText(textEl, options = {}) {
    return await translateInspirationTextInternal(textEl, options);
}

// 处理翻译队列
async function processInspirationTranslateQueue() {
    if (inspirationTranslateProcessing || inspirationTranslateQueue.length === 0) {
        return;
    }

    const task = inspirationTranslateQueue.shift();
    if (!task) return;

    inspirationTranslateProcessing = true;
    try {
        // 直接调用翻译函数，不使用 auto 选项（避免再次入队）
        await translateInspirationTextInternal(task.textEl, { ...task.options, skipQueue: true });
    } catch (error) {
        console.error('🐝 Hive: Queue translation failed:', error);
    } finally {
        inspirationTranslateProcessing = false;
        // 继续处理下一个任务
        setTimeout(() => processInspirationTranslateQueue(), 200);
    }
}

// 显示节点安装器使用指南弹层
function showNodeInstallerGuide() {
    return new Promise((resolve) => {
        // 移除现有的安装器指南弹层
        const existingModal = document.getElementById('hive-node-installer-guide-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // 获取当前语言
        const currentLang = getCurrentLanguage(); // 'zh' or 'en'
        const isZh = currentLang === 'zh';

        // 从语言文件获取文本，如果没有则使用回退
        const getText = (key) => {
            if (typeof window !== 'undefined' && typeof window.t === 'function') {
                return window.t(`nodeInstallerGuide.${key}`);
            }
            // 如果语言文件未加载，返回 key
            return key;
        };
        
        const t = {
            title: getText('title'),
            step1Title: getText('step1Title'),
            step1Desc: getText('step1Desc'),
            step1Tip: getText('step1Tip'),
            step2Title: getText('step2Title'),
            step2Desc: getText('step2Desc'),
            step3Title: getText('step3Title'),
            step3Desc: getText('step3Desc'),
            step4Title: getText('step4Title'),
            step4Desc: getText('step4Desc'),
            exampleImage: getText('exampleImage'),
            closeBtn: getText('closeBtn'),
            dontShowAgain: getText('dontShowAgain'),
            note: getText('note')
        };
        
        const exampleImagePath = '/extensions/ComfyUI-Hive/res/HiveNodeInstaller_Example.png';

        const modal = document.createElement('div');
        modal.id = 'hive-node-installer-guide-modal';
        modal.innerHTML = `
            <div class="hive-install-overlay">
                <div class="hive-install-content" style="max-width: 800px;">
                    <div class="hive-install-header">
                        <h2>${t.title}</h2>
                        <button class="hive-install-close" title="${t.closeBtn}">×</button>
                    </div>
                    <div class="hive-install-body">
                        <div class="hive-install-steps">
                            <div class="hive-install-step">
                                <div class="hive-install-step-number">1</div>
                                <div class="hive-install-step-content">
                                    <strong>${t.step1Title}</strong>
                                    <p>${t.step1Desc}${t.step1Tip ? `<div class="hive-install-step1-highlight" style="background: linear-gradient(135deg, rgba(255, 189, 46, 0.15) 0%, rgba(245, 166, 35, 0.1) 100%); border: 2px solid rgba(255, 189, 46, 0.5); border-radius: 8px; padding: 12px; margin-top: 10px; text-align: center;"><div style="font-size: 16px; font-weight: bold; color: #ffbd2e; line-height: 1.6;">${t.step1Tip}</div></div>` : ''}</p>
                                </div>
                            </div>
                            
                            <div class="hive-install-step">
                                <div class="hive-install-step-number">2</div>
                                <div class="hive-install-step-content">
                                    <strong>${t.step2Title}</strong>
                                    <p>${t.step2Desc}</p>
                                </div>
                            </div>
                            
                            <div class="hive-install-step">
                                <div class="hive-install-step-number">3</div>
                                <div class="hive-install-step-content">
                                    <strong>${t.step3Title}</strong>
                                    <p>${t.step3Desc}</p>
                                </div>
                            </div>
                            
                            <div class="hive-install-step">
                                <div class="hive-install-step-number">4</div>
                                <div class="hive-install-step-content">
                                    <strong>${t.step4Title}</strong>
                                    <p>${t.step4Desc}</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="hive-installer-example-image-container" style="margin-top: 20px; text-align: center;">
                            <div style="color: #ccc; font-size: 14px; margin-bottom: 10px;">${t.exampleImage}</div>
                            <img src="${exampleImagePath}" 
                                 alt="${t.exampleImage}" 
                                 style="max-width: 100%; border-radius: 8px; border: 1px solid #555; box-shadow: 0 4px 12px rgba(0,0,0,0.3);"
                                 onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                            <div style="display: none; color: #888; font-size: 12px; padding: 20px;">
                                ${typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('nodeInstallerGuide.exampleImageFailed') : 'Example image failed to load'}
                            </div>
                        </div>
                        
                        <div class="hive-install-note" style="margin-top: 20px;">
                            <p>${t.note}</p>
                        </div>
                    </div>
                    <div class="hive-install-footer">
                        <div class="hive-install-dont-show-row">
                            <label class="hive-install-dont-show-label">
                                <input type="checkbox" class="hive-install-dont-show-checkbox">
                                <span>${t.dontShowAgain}</span>
                            </label>
                        </div>
                        <button class="hive-install-close-btn">${t.closeBtn}</button>
                    </div>
                </div>
            </div>
        `;

        // 为弹层添加文字选择支持
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

        document.body.appendChild(modal);

        // 绑定关闭事件
        const closeModal = () => {
            modal.remove();
            resolve();
        };

        const closeBtn = modal.querySelector('.hive-install-close');
        const closeFooterBtn = modal.querySelector('.hive-install-close-btn');
        const overlay = modal.querySelector('.hive-install-overlay');
        const dontShowCheckbox = modal.querySelector('.hive-install-dont-show-checkbox');

        // 处理"不再提示"开关
        const handleClose = () => {
            if (dontShowCheckbox && dontShowCheckbox.checked) {
                localStorage.setItem('hive_node_installer_guide_dont_show', 'true');
            }
            closeModal();
        };

        closeBtn.onclick = handleClose;
        closeFooterBtn.onclick = handleClose;
        overlay.onclick = (e) => {
            // 点击overlay背景时关闭（但不包括内容区域）
            if (e.target === overlay || e.target.classList.contains('hive-install-overlay')) {
                handleClose();
            }
        };

        // Esc键关闭
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                handleClose();
                document.removeEventListener('keydown', handleKeyDown);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
    });
}

// 显示模型下载器使用指南弹层
function showModelDownloaderGuide() {
    return new Promise((resolve) => {
        // 移除现有的模型下载器指南弹层
        const existingModal = document.getElementById('hive-model-downloader-guide-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // 获取当前语言
        const currentLang = getCurrentLanguage(); // 'zh' or 'en'
        const isZh = currentLang === 'zh';

        // 从语言文件获取文本，如果没有则使用回退
        const getText = (key) => {
            if (typeof window !== 'undefined' && typeof window.t === 'function') {
                return window.t(`modelDownloaderGuide.${key}`);
            }
            // 如果语言文件未加载，使用key本身
            return key;
        };
        
        const t = {
            title: getText('title'),
            step1Title: getText('step1Title'),
            step1Desc: getText('step1Desc'),
            step1Tip: getText('step1Tip'),
            step2Title: getText('step2Title'),
            step2Desc: getText('step2Desc'),
            step3Title: getText('step3Title'),
            step3Desc: getText('step3Desc'),
            step4Title: getText('step4Title'),
            step4Desc: getText('step4Desc'),
            exampleImage: getText('exampleImage'),
            closeBtn: getText('closeBtn'),
            dontShowAgain: getText('dontShowAgain'),
            note: getText('note')
        };
        
        const exampleImagePath = '/extensions/ComfyUI-Hive/res/HiveModelDownloader_Example.png';

        const modal = document.createElement('div');
        modal.id = 'hive-model-downloader-guide-modal';
        modal.innerHTML = `
            <div class="hive-install-overlay">
                <div class="hive-install-content" style="max-width: 800px;">
                    <div class="hive-install-header">
                        <h2>${t.title}</h2>
                        <button class="hive-install-close" title="${t.closeBtn}">×</button>
                    </div>
                    <div class="hive-install-body">
                        <div class="hive-install-steps">
                            <div class="hive-install-step">
                                <div class="hive-install-step-number">1</div>
                                <div class="hive-install-step-content">
                                    <strong>${t.step1Title}</strong>
                                    <p>${t.step1Desc}${t.step1Tip ? `<div class="hive-install-step1-highlight" style="background: linear-gradient(135deg, rgba(255, 189, 46, 0.15) 0%, rgba(245, 166, 35, 0.1) 100%); border: 2px solid rgba(255, 189, 46, 0.5); border-radius: 8px; padding: 12px; margin-top: 10px; text-align: center;"><div style="font-size: 16px; font-weight: bold; color: #ffbd2e; line-height: 1.6;">${t.step1Tip}</div></div>` : ''}</p>
                                </div>
                            </div>
                            
                            <div class="hive-install-step">
                                <div class="hive-install-step-number">2</div>
                                <div class="hive-install-step-content">
                                    <strong>${t.step2Title}</strong>
                                    <p>${t.step2Desc}</p>
                                </div>
                            </div>
                            
                            <div class="hive-install-step">
                                <div class="hive-install-step-number">3</div>
                                <div class="hive-install-step-content">
                                    <strong>${t.step3Title}</strong>
                                    <p>${t.step3Desc}</p>
                                </div>
                            </div>
                            
                            <div class="hive-install-step">
                                <div class="hive-install-step-number">4</div>
                                <div class="hive-install-step-content">
                                    <strong>${t.step4Title}</strong>
                                    <p>${t.step4Desc}</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="hive-installer-example-image-container" style="margin-top: 20px; text-align: center;">
                            <div style="color: #ccc; font-size: 14px; margin-bottom: 10px;">${t.exampleImage}</div>
                            <img src="${exampleImagePath}" 
                                 alt="${t.exampleImage}" 
                                 style="max-width: 100%; border-radius: 8px; border: 1px solid #555; box-shadow: 0 4px 12px rgba(0,0,0,0.3);"
                                 onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                            <div style="display: none; color: #888; font-size: 12px; padding: 20px;">
                                ${typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('modelDownloaderGuide.exampleImageFailed') : 'Example image failed to load'}
                            </div>
                        </div>
                        
                        <div class="hive-install-note" style="margin-top: 20px;">
                            <p>${t.note}</p>
                        </div>
                    </div>
                    <div class="hive-install-footer">
                        <div class="hive-install-dont-show-row">
                            <label class="hive-install-dont-show-label">
                                <input type="checkbox" class="hive-install-dont-show-checkbox">
                                <span>${t.dontShowAgain}</span>
                            </label>
                        </div>
                        <button class="hive-install-close-btn">${t.closeBtn}</button>
                    </div>
                </div>
            </div>
        `;

        // 为弹层添加文字选择支持
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

        document.body.appendChild(modal);

        // 绑定关闭事件
        const closeModal = () => {
            modal.remove();
            resolve();
        };

        const closeBtn = modal.querySelector('.hive-install-close');
        const closeFooterBtn = modal.querySelector('.hive-install-close-btn');
        const overlay = modal.querySelector('.hive-install-overlay');
        const dontShowCheckbox = modal.querySelector('.hive-install-dont-show-checkbox');

        // 处理"不再提示"开关（使用独立的 localStorage key）
        const handleClose = () => {
            if (dontShowCheckbox && dontShowCheckbox.checked) {
                localStorage.setItem('hive_model_downloader_guide_dont_show', 'true');
            }
            closeModal();
        };

        closeBtn.onclick = handleClose;
        closeFooterBtn.onclick = handleClose;
        overlay.onclick = (e) => {
            // 点击overlay背景时关闭（但不包括内容区域）
            if (e.target === overlay || e.target.classList.contains('hive-install-overlay')) {
                handleClose();
            }
        };

        // Esc键关闭
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                handleClose();
                document.removeEventListener('keydown', handleKeyDown);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
    });
}

// ======================== 灵感模块 UI 渲染 ========================

/**
 * 渲染“灵感”模块列表
 * 所有类型统一显示：头像、昵称、点赞数、收藏数、标题
 * 其他展示差异由 category 决定
 */
function renderInspirationItems({
    items,
    category,
    page,
    pageSize,
    total,
    onLikeClick,
    onFavoriteClick,
    onLoadWorkflowClick,
    onCopyModelLink,
    onInstallNodeClick,
    onDownloadModelClick,
    onOpenTutorial,
    onPageChange
}) {
    const wrapper = document.getElementById('hive-view-inspiration');
    if (!wrapper) return;

    const gridEl = wrapper.querySelector('.gallery-grid');
    if (!gridEl) return;

    // 检查是否有现有内容，如果有则添加淡出动画
    const hasContent = gridEl.children.length > 0;
    
    if (hasContent) {
        // 添加淡出动画
        gridEl.classList.add('fade-out');
        gridEl.classList.remove('fade-in');
        
        // 等待淡出动画完成后再清空内容并渲染
        setTimeout(() => {
            gridEl.innerHTML = '';
            gridEl.classList.remove('fade-out');
            gridEl.classList.add('fade-in');
            
            renderItemsContent();
        }, 125); // 等待淡出动画的一半时间
    } else {
        // 首次加载，直接渲染，添加淡入动画
        gridEl.innerHTML = '';
        gridEl.classList.remove('fade-out');
        gridEl.classList.add('fade-in');
        renderItemsContent();
    }
    
    function renderItemsContent() {
        // 使用外部已定义的 currentLang 和 isZh
        
        // 空列表
        if (!items || items.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'hive-insp-empty';
            empty.textContent = typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('toast.noContent') : 'No items found';
            gridEl.appendChild(empty);
            return;
        }

    // 布局：图片 / 视频 / 工作流 / 教程 -> 双列，其余单行
    const isTwoColumn = ['image', 'video', 'workflow', 'tutorial'].includes(category);
    gridEl.classList.toggle('hive-insp-two-col', isTwoColumn);
    gridEl.classList.toggle('hive-insp-list', !isTwoColumn);

    // 创建标题/描述的 wrapper（包含翻译按钮）
    function createTextWrapper(textEl, translateBtn, className) {
        const wrapper = document.createElement('div');
        wrapper.className = className;
        wrapper.appendChild(textEl);
        if (translateBtn) wrapper.appendChild(translateBtn);
        return wrapper;
    }

    // 统一头部：头像 + 昵称 + 点赞/收藏
    function createMetaBar(item) {
        const meta = document.createElement('div');
        meta.className = 'hive-insp-meta';

        const left = document.createElement('div');
        left.className = 'hive-insp-meta-left';

        const avatar = document.createElement('img');
        avatar.className = 'hive-insp-avatar';
        avatar.src = item.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=unknown';
        avatar.onerror = () => {
            avatar.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=unknown';
        };
        left.appendChild(avatar);

        const name = document.createElement('span');
        name.className = 'hive-insp-username';
        name.textContent = item.username || 'Unknown';
        if (name.textContent) {
            name.title = name.textContent;
        }
        left.appendChild(name);

        meta.appendChild(left);

        const right = document.createElement('div');
        right.className = 'hive-insp-meta-right';

        const likeBtn = document.createElement('button');
        likeBtn.className = 'hive-insp-stat-btn hive-insp-like';
        // 如果用户已点赞，添加active类来高亮显示
        if (item.user_liked) {
            likeBtn.classList.add('active');
        }
        likeBtn.textContent = `👍 ${item.likes_count ?? 0}`;
        likeBtn.onclick = (e) => {
            e.stopPropagation();
            onLikeClick && onLikeClick(item);
        };
        right.appendChild(likeBtn);

        const favBtn = document.createElement('button');
        favBtn.className = 'hive-insp-stat-btn hive-insp-fav';
        // 如果用户已收藏，添加active类来高亮显示
        if (item.user_favorited) {
            favBtn.classList.add('active');
        }
        favBtn.textContent = `⭐ ${item.favorites_count ?? 0}`;
        favBtn.onclick = (e) => {
            e.stopPropagation();
            onFavoriteClick && onFavoriteClick(item);
        };
        right.appendChild(favBtn);

        meta.appendChild(right);

        return meta;
    }

    // 获取当前语言（在循环外定义，确保所有地方都能访问）
    const currentLangInLoop = getCurrentLanguage();
    const isZhInLoop = currentLangInLoop === 'zh';
    
    items.forEach(item => {
        const card = document.createElement('div');
        card.className = `hive-insp-item hive-insp-${category}`;
        card.setAttribute('data-item-id', item.id);

        // 统一头部
        const meta = createMetaBar(item);
        card.appendChild(meta);

        // 标题 / 描述（根据类型插入到合适位置）
        const titleEl = document.createElement('div');
        titleEl.className = 'hive-insp-title';
        const titleText = item.title || '';
        titleEl.textContent = titleText;
        if (titleText) {
            titleEl.title = titleText;
            titleEl.dataset.originalText = titleText;
            titleEl.dataset.originalTitle = titleText;
        }

        let descEl = null;
        if (item.description) {
            descEl = document.createElement('div');
            descEl.className = 'hive-insp-desc';
            descEl.textContent = item.description;
            descEl.title = item.description;
            descEl.dataset.originalText = item.description;
            descEl.dataset.originalTitle = item.description;
        }

        // 统一的翻译按钮（同时翻译标题和描述）
        let translateBtn = null;
        if (titleText || item.description) {
            translateBtn = document.createElement('button');
            translateBtn.type = 'button';
            translateBtn.className = 'hive-insp-translate-btn';
            translateBtn.innerHTML = getTranslateIconHtml(false);
            const translateTitle = typeof window !== 'undefined' && typeof window.t === 'function' 
                ? (window.t('common.translate') + ' / Translate')
                : 'Translate';
            translateBtn.title = translateTitle;
            translateBtn.onclick = async (e) => {
                e.stopPropagation();
                if (translateBtn.dataset.loading === 'true') return;
                translateBtn.dataset.loading = 'true';
                translateBtn.innerHTML = getTranslateIconHtml(true);
                try {
                    // 同时翻译标题和描述
                    const promises = [];
                    if (titleEl && titleText) {
                        promises.push(translateInspirationText(titleEl, { auto: false }));
                    }
                    if (descEl && item.description) {
                        promises.push(translateInspirationText(descEl, { auto: false }));
                    }
                    await Promise.all(promises);
                } finally {
                    setTimeout(() => {
                        translateBtn.dataset.loading = 'false';
                        translateBtn.innerHTML = getTranslateIconHtml(false);
                    }, 500);
                }
            };
        }

        // 分类特定内容
        if (category === 'image') {
            // 使用与 workflow 相同布局，但独立样式名：图片预览 + 可选“加载工作流”按钮
            const preview = document.createElement('div');
            preview.className = 'hive-insp-image-preview';
            const img = document.createElement('img');
            img.src = item.preview_image_url || 'https://placehold.co/600x400/333/fff?text=Image';
            img.loading = 'lazy';
            img.onclick = () => {
                // 传递完整的item对象，以便显示提示词、模型等信息
                showLightbox(item.preview_image_url || img.src, null, item);
            };
            preview.appendChild(img);

            // 检查是否有工作流数据（与广场聊天里的参数名一致：workflow_data）
            const hasWorkflowData = item.workflow_data || item.workflow_ref;
            if (hasWorkflowData && onLoadWorkflowClick) {
                const btn = document.createElement('button');
                btn.className = 'hive-insp-workflow-btn';
                        btn.textContent = typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('common.loadWorkflow') : 'Load Workflow';
                btn.onclick = (e) => {
                    e.stopPropagation();
                    onLoadWorkflowClick(item);
                };
                preview.appendChild(btn);
            }

            card.appendChild(preview);
            if (titleText) {
                card.appendChild(createTextWrapper(titleEl, translateBtn, 'hive-insp-title-wrapper'));
            }
            if (descEl) {
                card.appendChild(createTextWrapper(descEl, null, 'hive-insp-desc-wrapper'));
            }
        } else if (category === 'video') {
            // 使用独立的样式名，但样式内容与workflow一致
            const preview = document.createElement('div');
            preview.className = 'hive-insp-video-preview';
            const video = document.createElement('video');
            if (item.video_url) {
                video.src = item.video_url;
            }
            if (item.preview_image_url) {
                video.poster = item.preview_image_url;
            }
            video.muted = true;
            video.loop = true;
            video.onmouseenter = () => {
                try { video.play(); } catch {}
            };
            video.onmouseleave = () => {
                video.pause();
                video.currentTime = 0;
            };
            video.onclick = (e) => {
                e.stopPropagation();
                if (item.video_url) {
                    showVideoPlayer({ video: item.video_url }, item);
                }
            };
            preview.appendChild(video);
            
            // 检查是否有工作流数据（与广场聊天里的参数名一致：workflow_data）
            const hasWorkflowData = item.workflow_data || item.workflow_ref;
            if (hasWorkflowData && onLoadWorkflowClick) {
                const btn = document.createElement('button');
                btn.className = 'hive-insp-workflow-btn';
                        btn.textContent = typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('common.loadWorkflow') : 'Load Workflow';
                btn.onclick = (e) => {
                    e.stopPropagation();
                    onLoadWorkflowClick(item);
                };
                preview.appendChild(btn);
            }
            
            card.appendChild(preview);
            if (titleText) {
                card.appendChild(createTextWrapper(titleEl, translateBtn, 'hive-insp-title-wrapper'));
            }
            if (descEl) {
                card.appendChild(createTextWrapper(descEl, null, 'hive-insp-desc-wrapper'));
            }
        } else if (category === 'workflow') {
            const preview = document.createElement('div');
            preview.className = 'hive-insp-workflow-preview';
            const img = document.createElement('img');
            img.src = item.preview_image_url || 'https://placehold.co/600x400/333/fff?text=Workflow';
            img.loading = 'lazy';
            preview.appendChild(img);
            card.appendChild(preview);

            // 只有存在工作流引用时才显示按钮
            // 检查是否有工作流数据（与广场聊天里的参数名一致：workflow_data）
            const hasWorkflowData = item.workflow_data || item.workflow_ref;
            if (hasWorkflowData && onLoadWorkflowClick) {
                const btn = document.createElement('button');
                btn.className = 'hive-insp-workflow-btn';
                        btn.textContent = typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('common.loadWorkflow') : 'Load Workflow';
                btn.onclick = (e) => {
                    e.stopPropagation();
                    onLoadWorkflowClick(item);
                };
                preview.appendChild(btn);
            }
            if (titleText) {
                card.appendChild(createTextWrapper(titleEl, translateBtn, 'hive-insp-title-wrapper'));
            }
            if (descEl) {
                card.appendChild(createTextWrapper(descEl, null, 'hive-insp-desc-wrapper'));
            }
        } else if (category === 'model') {
            card.classList.add('hive-insp-row');

            const rowMain = document.createElement('div');
            rowMain.className = 'hive-insp-row-main';

            if (titleText) {
                rowMain.appendChild(createTextWrapper(titleEl, translateBtn, 'hive-insp-title-wrapper'));
            }
            if (descEl) {
                rowMain.appendChild(createTextWrapper(descEl, null, 'hive-insp-desc-wrapper'));
            }

            const btnBar = document.createElement('div');
            btnBar.className = 'hive-insp-model-btns';

            if (item.model_hf_url) {
                const hfBtn = document.createElement('button');
                hfBtn.className = 'hive-insp-link-btn';
                hfBtn.textContent = typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('model.huggingfaceUrl') : 'HuggingFace URL';
                hfBtn.onclick = async (e) => {
                    e.stopPropagation();
                    try {
                        await navigator.clipboard.writeText(item.model_hf_url);
                        showToast(typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('toast.hfUrlCopied') : 'HuggingFace URL copied', 'success');
                    } catch {
                        showToast(typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('toast.clipboardCopyFailed') : 'Failed to copy to clipboard', 'error');
                    }
                    onCopyModelLink && onCopyModelLink(item, 'huggingface');
                };
                btnBar.appendChild(hfBtn);
                
                // 添加下载按钮
                const hfDownloadBtn = document.createElement('button');
                hfDownloadBtn.className = 'hive-insp-model-download-btn';
                hfDownloadBtn.textContent = typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('common.download') : 'Download';
                hfDownloadBtn.onclick = async (e) => {
                    e.stopPropagation();
                    onDownloadModelClick && onDownloadModelClick(item, item.model_hf_url);
                };
                btnBar.appendChild(hfDownloadBtn);
            }

            if (item.model_mirror_url) {
                const mirrorBtn = document.createElement('button');
                mirrorBtn.className = 'hive-insp-link-btn';
                mirrorBtn.textContent = typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('model.mirrorUrl') : 'Mirror URL';
                mirrorBtn.onclick = async (e) => {
                    e.stopPropagation();
                    try {
                        await navigator.clipboard.writeText(item.model_mirror_url);
                        showToast(typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('toast.mirrorUrlCopied') : 'Mirror URL copied', 'success');
                    } catch {
                        const clipboardFailedText = typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('toast.clipboardCopyFailed') : 'Failed to copy to clipboard';
                        showToast(clipboardFailedText, 'error');
                    }
                    onCopyModelLink && onCopyModelLink(item, 'mirror');
                };
                btnBar.appendChild(mirrorBtn);
                
                // 添加下载按钮
                const mirrorDownloadBtn = document.createElement('button');
                mirrorDownloadBtn.className = 'hive-insp-model-download-btn';
                mirrorDownloadBtn.textContent = typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('common.download') : 'Download';
                mirrorDownloadBtn.onclick = async (e) => {
                    e.stopPropagation();
                    onDownloadModelClick && onDownloadModelClick(item, item.model_mirror_url);
                };
                btnBar.appendChild(mirrorDownloadBtn);
            }

            rowMain.appendChild(btnBar);
            card.appendChild(rowMain);
        } else if (category === 'node') {
            card.classList.add('hive-insp-row');

            if (titleText) {
                card.appendChild(createTextWrapper(titleEl, translateBtn, 'hive-insp-title-wrapper'));
            }
            if (descEl) {
                card.appendChild(createTextWrapper(descEl, null, 'hive-insp-desc-wrapper'));
            }

            const linksWrap = document.createElement('div');
            linksWrap.className = 'hive-insp-node-links';

            const links = (item.extra && (item.extra.node_links || item.extra.links)) || [];
            if (Array.isArray(links) && links.length > 0) {
                links.forEach(linkObj => {
                    const url = typeof linkObj === 'string' ? linkObj : linkObj.url;
                    if (!url) return;
                    const label = typeof linkObj === 'string'
                        ? url
                        : (linkObj.label || url);

                    const line = document.createElement('div');
                    line.className = 'hive-insp-node-link-row';

                    const span = document.createElement('span');
                    span.className = 'hive-insp-node-link-text';
                    span.textContent = label;
                    line.appendChild(span);

                    const installBtn = document.createElement('button');
                    installBtn.className = 'hive-insp-node-install-btn';
                    installBtn.textContent = typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('common.install') : 'Install';
                    installBtn.onclick = (e) => {
                        e.stopPropagation();
                        onInstallNodeClick && onInstallNodeClick(item, url);
                    };
                    line.appendChild(installBtn);

                    linksWrap.appendChild(line);
                });
            } else {
                const tip = document.createElement('div');
                tip.className = 'hive-insp-node-empty';
                const noInstallUrlText = typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('toast.noInstallUrl') : 'No installation URL available';
                tip.textContent = noInstallUrlText;
                linksWrap.appendChild(tip);
            }

            card.appendChild(linksWrap);
        } else if (category === 'tutorial') {
            const mediaWrapper = document.createElement('div');
            mediaWrapper.className = 'hive-insp-workflow-preview';
            const img = document.createElement('img');
            img.className = 'hive-insp-image';
            img.src = item.preview_image_url || 'https://placehold.co/600x400/333/fff?text=Tutorial';
            img.loading = 'lazy';
            mediaWrapper.appendChild(img);
            card.appendChild(mediaWrapper);

            card.onclick = () => {
                if (item.tutorial_url) {
                    window.open(item.tutorial_url, '_blank');
                    onOpenTutorial && onOpenTutorial(item);
                }
            };
            if (titleText) {
                card.appendChild(createTextWrapper(titleEl, translateBtn, 'hive-insp-title-wrapper'));
            }
            if (descEl) {
                card.appendChild(createTextWrapper(descEl, null, 'hive-insp-desc-wrapper'));
            }
        }

        gridEl.appendChild(card);

        // 自动翻译（如果开启）
        if (isAutoTranslateEnabled()) {
            // 为每个项目设置不同的延迟，避免同时触发多个翻译任务
            const itemIndex = items.indexOf(item);
            const delay = itemIndex * 300 + 500; // 每个项目间隔 300ms，初始延迟 500ms
            setTimeout(async () => {
                // 先翻译标题
                if (titleEl && titleText) {
                    await translateInspirationText(titleEl, { auto: true });
                }
                // 再翻译描述（等待标题翻译完成）
                if (descEl && item.description) {
                    await translateInspirationText(descEl, { auto: true });
                }
            }, delay);
        }
    });

    // 简单分页信息
    const footerId = 'hive-insp-footer';
    let footer = wrapper.querySelector('#' + footerId);
    if (!footer) {
        footer = document.createElement('div');
        footer.id = footerId;
        footer.className = 'hive-insp-footer';
        wrapper.appendChild(footer);
    }
    footer.textContent = '';
    if (typeof total === 'number' && pageSize && total > 0) {
        const totalPages = Math.max(1, Math.ceil(total / pageSize));

        const prevBtn = document.createElement('button');
        prevBtn.className = 'hive-insp-page-btn';
        prevBtn.textContent = typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('common.previous') : 'Previous';
        if (page <= 1) {
            prevBtn.disabled = true;
        }
        prevBtn.onclick = () => {
            if (page > 1 && typeof onPageChange === 'function') {
                onPageChange(page - 1);
            }
        };
        footer.appendChild(prevBtn);

        const info = document.createElement('span');
        info.className = 'hive-insp-page-info';
        info.textContent = typeof window !== 'undefined' && typeof window.t === 'function' 
            ? window.t('toast.pageInfo', { page: page, totalPages: totalPages, total: total }) 
            : `Page ${page} / ${totalPages}, Total ${total} items`;
        footer.appendChild(info);

        const nextBtn = document.createElement('button');
        nextBtn.className = 'hive-insp-page-btn';
        nextBtn.textContent = typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('common.next') : 'Next';
        if (page >= totalPages) {
            nextBtn.disabled = true;
        }
        nextBtn.onclick = () => {
            if (page < totalPages && typeof onPageChange === 'function') {
                onPageChange(page + 1);
            }
        };
        footer.appendChild(nextBtn);
    }
    
    // 翻页后滚动到顶部
    // #hive-view-inspiration 本身是可滚动的容器
    requestAnimationFrame(() => {
        wrapper.scrollTop = 0;
    });
    } // 结束 renderItemsContent 函数
}

export { showToast, showConfirm, showNodeInstallGuide, showNodeInstallerGuide, showModelDownloaderGuide, createMessageElement, renderChannelList, updateOnlineCount, updateChannelOnlineCount, showLightbox, toggleView, setChannelTitle, createUploadToolbar, createFilePreview, renderGallery, setGalleryFilter, showVideoPlayer, showModelDetail, showEnhancedLightbox, waitForImages, loadWorkflowToComfyUI, playMessageSound, renderInspirationItems };
