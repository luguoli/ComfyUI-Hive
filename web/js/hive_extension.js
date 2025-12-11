// web/js/hive_extension.js - 节点扩展功能
// Node extension functionality

// 获取翻译文本的辅助函数
function getText(key, fallback = '') {
    if (typeof window !== 'undefined' && typeof window.t === 'function') {
        return window.t(key);
    }
    return fallback;
}

// 获取当前语言
function getCurrentLanguage() {
    try {
        const lang = localStorage.getItem('hive_lang') || 
                     (typeof navigator !== 'undefined' && navigator.language && navigator.language.startsWith('zh') ? 'zh' : 'en');
        return lang;
    } catch (e) {
        return 'en';
    }
}

// 注册节点扩展功能：Hive 修复节点
// 延迟执行，确保 LiteGraph 已加载
export function registerNodeExtension() {
    setTimeout(() => {
        try {

            // 提示词扩写选项
            const expandPromptMenuOption = {
                content: `🐝 ${getText('contextMenu.expandPrompt')}`,
                callback: () => {
                    if (typeof window.showExpandPromptModal === 'function') {
                        window.showExpandPromptModal();
                    }
                }
            };

            // 随机提示词选项
            const randomPromptMenuOption = {
                content: `🐝 ${getText('contextMenu.randomPrompt')}`,
                callback: () => {
                    if (typeof window.showRandomPromptModal === 'function') {
                        window.showRandomPromptModal();
                    }
                }
            };

            // 摄影提示词生成器选项
            const photoPromptMenuOption = {
                content: `🐝 ${getText('photoPrompt.photoPromptGenerator')}`,
                callback: () => {
                    if (typeof window.showPhotoPromptModal === 'function') {
                        window.showPhotoPromptModal();
                    }
                }
            };

            // AI对话选项
            const aiChatMenuOption = {
                content: `🐝 ${getText('contextMenu.aiChat')}`,
                callback: () => {
                    if (typeof window.showAIChatModal === 'function') {
                        window.showAIChatModal();
                    }
                }
            };

            // 翻译选项
            const translateMenuOption = {
                content: `🐝 ${getText('contextMenu.translate')}`,
                callback: () => {
                    if (typeof window.showTranslateModal === 'function') {
                        window.showTranslateModal();
                    }
                }
            };

            


            // 重写 getNodeMenuOptions 方法
            if (typeof LGraphCanvas !== 'undefined' && LGraphCanvas.prototype.getNodeMenuOptions) {
                const originalGetNodeMenuOptions = LGraphCanvas.prototype.getNodeMenuOptions;
                LGraphCanvas.prototype.getNodeMenuOptions = function(node) {
                    // 调用原始方法获取默认菜单选项
                    const originalOptions = originalGetNodeMenuOptions.apply(this, arguments);

                    // 修复节点选项
                    const fixNodeMenuOption = {
                        content: `🐝 ${getText('contextMenu.fixNodeWithHive')}`,
                        callback: () => {
                            if (typeof window.fixNodeWithHive === 'function') {
                                window.fixNodeWithHive(node);
                            }
                        }
                    };

                    // 节点右键菜单：顺序：提示词扩写、随机提示词、摄影提示词生成器、与AI对话、翻译、修复节点
                    return [expandPromptMenuOption, randomPromptMenuOption, photoPromptMenuOption, aiChatMenuOption, translateMenuOption, fixNodeMenuOption, null, ...originalOptions];
                };
                console.log('🐝 Hive: Node extension registered successfully');
            } else {
                console.warn('🐝 Hive: LGraphCanvas not available, cannot register node extension');
            }

            if (typeof LGraphCanvas !== 'undefined' && LGraphCanvas.prototype.getCanvasMenuOptions) {
                const originalGetCanvasMenuOptions = LGraphCanvas.prototype.getCanvasMenuOptions;
                LGraphCanvas.prototype.getCanvasMenuOptions = function() {
                    const originalOptions = originalGetCanvasMenuOptions.apply(this, arguments);

                    // 画布右键菜单：顺序：提示词扩写、随机提示词、摄影提示词生成器、与AI对话、翻译
                    return [expandPromptMenuOption, randomPromptMenuOption, photoPromptMenuOption, aiChatMenuOption, translateMenuOption, null, ...originalOptions];
                };
                console.log('🐝 Hive: Canvas extension registered successfully');
            } else {
                console.warn('🐝 Hive: LGraphCanvas not available, cannot register Canvas extension');
            }

            // 注册图片右键菜单：提示词反推
            // 只在侧边栏内的图片上添加右键菜单，节点内的图片通过getExtraMenuOptions处理
            const setupImageContextMenu = () => {
                // 检查图片是否在侧边栏内
                const isInSidebar = (element) => {
                    const sidebarEl = document.getElementById('hive-sidebar');
                    if (!sidebarEl) {
                        return false;
                    }
                    return sidebarEl.contains(element);
                };
                
                // 为图片元素添加右键菜单事件
                const addContextMenuToImage = (imgElement) => {
                    // 检查是否已经添加过事件监听器
                    if (imgElement._hiveContextMenuAdded) {
                        return;
                    }
                    
                    // 只处理侧边栏内的图片
                    if (!isInSidebar(imgElement)) {
                        return;
                    }
                    
                    // 检查是否有有效的src
                    if (!imgElement.src) {
                        return;
                    }
                    
                    // 标记已添加
                    imgElement._hiveContextMenuAdded = true;
                    
                    // 添加右键菜单事件（使用capture阶段，确保能捕获事件）
                    const handleContextMenu = function(e) {
                        // 再次检查是否在侧边栏内（防止动态移动）
                        if (!isInSidebar(imgElement)) {
                            return;
                        }
                        
                        // 检查是否是有效的图片URL
                        if (!imgElement.src || (imgElement.src.startsWith('data:') && imgElement.src.length < 100)) {
                            return;
                        }
                        
                        // 阻止默认右键菜单和事件传播
                        e.preventDefault();
                        e.stopPropagation();
                        e.stopImmediatePropagation();
                        
                        // 移除现有的自定义菜单
                        const existingMenu = document.getElementById('hive-image-context-menu');
                        if (existingMenu) {
                            existingMenu.remove();
                        }
                        
                        const reversePromptText = getText('contextMenu.reversePrompt', 'Hive 提示词反推');
                        
                        // 创建菜单
                        const menu = document.createElement('div');
                        menu.id = 'hive-image-context-menu';
                        menu.style.cssText = `
                            position: fixed;
                            left: ${e.clientX}px;
                            top: ${e.clientY}px;
                            background-color: var(--comfy-menu-bg);
                            border: 1px solid var(--border-color);
                            border-radius: 4px;
                            padding: 2px 0;
                            z-index: 10001;
                            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
                            min-width: 150px;
                        `;
                        
                        const menuItem = document.createElement('div');
                        menuItem.style.cssText = `
                            padding: 6px 12px;
                            color: var(--input-text);
                            cursor: pointer;
                            font-size: 12px;
                        `;
                        menuItem.textContent = `🐝 ${reversePromptText}`;
                        menuItem.onmouseenter = () => {
                            menuItem.style.backgroundColor = 'var(--comfy-input-bg)';
                        };
                        menuItem.onmouseleave = () => {
                            menuItem.style.backgroundColor = 'transparent';
                        };
                        menuItem.onclick = () => {
                            menu.remove();
                            if (typeof window.showReversePromptModal === 'function') {
                                window.showReversePromptModal(imgElement.src);
                            }
                        };
                        
                        menu.appendChild(menuItem);
                        document.body.appendChild(menu);
                        
                        // 点击其他地方关闭菜单
                        const closeMenu = (e2) => {
                            if (!menu.contains(e2.target)) {
                                menu.remove();
                                document.removeEventListener('click', closeMenu);
                                document.removeEventListener('contextmenu', closeMenu);
                            }
                        };
                        
                        setTimeout(() => {
                            document.addEventListener('click', closeMenu, true);
                            document.addEventListener('contextmenu', closeMenu, true);
                        }, 100);
                    };
                    
                    // 在bubble阶段添加监听器（不使用capture），确保在全局监听器之后执行
                    // 但需要确保事件能到达这里
                    imgElement.addEventListener('contextmenu', handleContextMenu, false);
                };
                
                // 为所有现有的图片元素添加右键菜单
                const addToExistingImages = () => {
                    const sidebarEl = document.getElementById('hive-sidebar');
                    if (!sidebarEl) {
                        // 如果侧边栏还没加载，稍后重试
                        setTimeout(addToExistingImages, 1000);
                        return;
                    }
                    
                    // 直接在侧边栏内查找图片，更准确
                    const sidebarImages = sidebarEl.querySelectorAll('img');
                    sidebarImages.forEach(img => {
                        if (img.src && !img._hiveContextMenuAdded) {
                            addContextMenuToImage(img);
                        }
                    });
                };
                
                // 初始添加（延迟一点，确保侧边栏已加载）
                setTimeout(() => {
                    addToExistingImages();
                }, 500);
                
                // 定期检查新添加的图片（因为侧边栏内容可能是动态加载的）
                setInterval(() => {
                    const sidebarEl = document.getElementById('hive-sidebar');
                    if (sidebarEl) {
                        const sidebarImages = sidebarEl.querySelectorAll('img');
                        sidebarImages.forEach(img => {
                            if (img.src && !img._hiveContextMenuAdded) {
                                addContextMenuToImage(img);
                            }
                        });
                    }
                }, 2000);
                
                // 在MutationObserver中也直接检查侧边栏内的图片
                const observer = new MutationObserver((mutations) => {
                    mutations.forEach((mutation) => {
                        mutation.addedNodes.forEach((node) => {
                            if (node.nodeType === 1) { // Element node
                                const sidebarEl = document.getElementById('hive-sidebar');
                                if (!sidebarEl) return;
                                
                                // 检查节点本身是否是图片
                                if (node.tagName === 'IMG' && sidebarEl.contains(node)) {
                                    addContextMenuToImage(node);
                                }
                                // 检查节点内是否包含图片
                                const images = node.querySelectorAll && node.querySelectorAll('img');
                                if (images) {
                                    images.forEach(img => {
                                        if (sidebarEl.contains(img) && !img._hiveContextMenuAdded) {
                                            addContextMenuToImage(img);
                                        }
                                    });
                                }
                            }
                        });
                    });
                });
                
                // 开始观察
                observer.observe(document.body, {
                    childList: true,
                    subtree: true
                });
                
            };
            
            // 延迟执行，确保DOM已加载
            setTimeout(setupImageContextMenu, 1000);
            
        } catch (error) {
            console.error('🐝 Hive: Failed to register node extension:', error);
        }
    }, 1000);
}




async function checkLLMAPiKey() {
    // 检查是否配置了API
    const apiKey = localStorage.getItem('hive_llm_api_key') || '';
    const apiUrl = localStorage.getItem('hive_llm_api_url') || '';
    const model = localStorage.getItem('hive_llm_model') || '';
    if (!apiKey || !apiUrl || !model) {
        const pleaseConfigureText = getText('settings.pleaseConfigureLLM');
        if (typeof window.showConfigPromptModal === 'function') {
            window.showConfigPromptModal(pleaseConfigureText);
        } else if (typeof window.showToast === 'function') {
            window.showToast(pleaseConfigureText, 'warning');
        }
        return false;
    }
    return true;
}


async function checkVLMAPiKey() {
    // 检查是否配置了视觉模型API
    const visionApiKey = localStorage.getItem('hive_vision_api_key') || '';
    const visionApiUrl = localStorage.getItem('hive_vision_api_url') || '';
    const visionModel = localStorage.getItem('hive_vision_model') || '';
    if (!visionApiKey || !visionApiUrl || !visionModel) {
        const pleaseConfigureText = getText('settings.pleaseConfigureVision');
        if (typeof window.showConfigPromptModal === 'function') {
            window.showConfigPromptModal(pleaseConfigureText);
        } else if (typeof window.showToast === 'function') {
            window.showToast(pleaseConfigureText, 'warning');
        }
        return false;
    }
    return true;
}


// 提示词扩写功能
async function expandPrompt(prompt) {
    try {
        // 获取大语言模型配置
        const provider = localStorage.getItem('hive_llm_provider') || '';
        const apiKey = localStorage.getItem('hive_llm_api_key') || '';
        const apiUrl = localStorage.getItem('hive_llm_api_url') || '';
        const model = localStorage.getItem('hive_llm_model') || '';

        if (!apiKey || !apiUrl || !model) {
            const errorMsg = getText('settings.pleaseConfigureLLM');
            throw new Error(errorMsg);
        }

        // 获取当前语言设置
        const currentLang = getCurrentLanguage();
        const isZh = currentLang === 'zh';

        // 构建提示词
        let systemPrompt, userPrompt;
        if (isZh) {
            systemPrompt = `你是一位专业的AI图像生成提示词工程师。请将用户提供的简短提示词扩写成详细、专业、富有创意的长提示词。

要求：
- 保持原提示词的核心内容和主题
- 添加丰富的视觉细节（构图、光线、风格、情绪、艺术元素等）
- 适合Stable Diffusion等AI图像生成模型
- 专业且结构良好
- 100-200个单词

只返回扩写后的提示词，不要有任何解释、前缀或后缀。`;
            userPrompt = `请扩写以下提示词：${prompt}`;
        } else {
            systemPrompt = `You are a professional prompt engineer for AI image generation. Please expand the user-provided short prompt into a detailed, professional, and creative long prompt.

Requirements:
- Keep the core content and theme of the original prompt
- Add rich visual details (composition, lighting, style, mood, artistic elements, etc.)
- Suitable for AI image generation models like Stable Diffusion
- Professional and well-structured
- 100-200 words

Return only the expanded prompt, without any explanations, prefixes, or suffixes.`;
            userPrompt = `Please expand the following prompt: ${prompt}`;
        }

        // 构建请求头
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        };

        // 构建请求体
        const requestBody = {
            model: model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.7,
            max_tokens: 2000,
            top_p: 0.9
        };

        // 智谱AI特殊处理
        if (provider === 'zhipu' || apiUrl.includes('bigmodel.cn')) {
            requestBody.thinking = { type: "disabled" };
        }

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            try {
                const errorText = await response.clone().text();
                if (errorText) {
                    try {
                        const errorData = JSON.parse(errorText);
                        if (errorData.error) {
                            if (typeof errorData.error === 'string') {
                                errorMessage = errorData.error;
                            } else if (errorData.error.message) {
                                errorMessage = errorData.error.message;
                            }
                        } else {
                            errorMessage = errorText.substring(0, 200);
                        }
                    } catch (e) {
                        errorMessage = errorText.substring(0, 200);
                    }
                }
            } catch (e) {
                // 忽略
            }
            throw new Error(errorMessage);
        }

        const data = await response.json();
        let content = data.choices?.[0]?.message?.content?.trim();
        const reasoningContent = data.choices?.[0]?.message?.reasoning_content?.trim();
        
        if (!content && reasoningContent) {
            content = reasoningContent;
        }
        
        if (!content) {
            throw new Error('No response from API');
        }

        return content;
    } catch (error) {
        console.error('🐝 Hive: Error expanding prompt:', error);
        throw error;
    }
}

// 显示提示词扩写弹窗
async function showExpandPromptModal() {
    // 移除现有的弹窗
    const existingModal = document.getElementById('hive-expand-prompt-modal');
    if (existingModal) {
        existingModal.remove();
    }

    // 检查 大语言模型 API 密钥
    if (!(await checkLLMAPiKey())) return;

    const expandText = getText('contextMenu.expandPrompt', 'Hive 提示词扩写');
    const placeholderText = getText('contextMenu.expandPromptPlaceholder', '请输入要扩写的提示词...');
    const expandingText = getText('contextMenu.expandingPrompt', '正在扩写提示词...');
    const failedText = getText('contextMenu.expandPromptFailed', '扩写提示词失败：');
    const sendText = getText('contextMenu.expandPromptSend', '扩写');
    const copyPromptText = getText('contextMenu.copyPrompt', '复制提示词');
    const promptCopiedText = getText('contextMenu.promptCopied', '提示词已复制到剪贴板');

    // 创建弹窗
    const modal = document.createElement('div');
    modal.id = 'hive-expand-prompt-modal';
    modal.innerHTML = `
        <div class="hive-confirm-overlay" style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        ">
            <div class="hive-confirm-content" style="
                background-color: var(--comfy-menu-bg);
                border-radius: 8px;
                padding: 24px;
                max-width: 700px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            ">
                <div style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                    padding-bottom: 12px;
                    border-bottom: 1px solid var(--border-color);
                ">
                    <h3 style="
                        margin: 0;
                        color: var(--input-text);
                        font-size: 18px;
                    ">🐝 ${expandText}</h3>
                    <button class="hive-expand-prompt-close" style="
                        background: none;
                        border: none;
                        color: var(--input-text);
                        font-size: 24px;
                        cursor: pointer;
                        padding: 0;
                        width: 30px;
                        height: 30px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    ">×</button>
                </div>
                <div class="hive-expand-prompt-content" style="
                    margin-bottom: 20px;
                    min-height: 200px;
                    max-height: 400px;
                    overflow-y: auto;
                    padding: 16px;
                    background-color: var(--comfy-input-bg);
                    border-radius: 4px;
                    border: 1px solid var(--border-color);
                    color: var(--input-text);
                    font-size: 14px;
                    line-height: 1.6;
                    white-space: pre-wrap;
                    word-wrap: break-word;
                "></div>
                <div class="hive-expand-prompt-buttons" style="
                    display: flex;
                    gap: 12px;
                    margin-bottom: 12px;
                ">
                    <input type="text" class="hive-expand-prompt-input" placeholder="${placeholderText}" style="
                        flex: 1;
                        padding: 8px 12px;
                        border-radius: 4px;
                        border: 1px solid var(--border-color);
                        background-color: var(--comfy-input-bg);
                        color: var(--input-text);
                        font-size: 14px;
                    ">
                    <button class="hive-expand-prompt-send" style="
                        padding: 8px 16px;
                        border-radius: 4px;
                        border: none;
                        background-color: #ffe066;
                        color: #000;
                        cursor: pointer;
                        font-weight: 500;
                        font-size: 14px;
                    ">${sendText}</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const closeBtn = modal.querySelector('.hive-expand-prompt-close');
    const sendBtn = modal.querySelector('.hive-expand-prompt-send');
    const inputEl = modal.querySelector('.hive-expand-prompt-input');
    const contentDiv = modal.querySelector('.hive-expand-prompt-content');
    const buttonsContainer = modal.querySelector('.hive-expand-prompt-buttons');
    const overlay = modal.querySelector('.hive-confirm-overlay');

    const cleanup = () => {
        modal.remove();
    };

    closeBtn.onclick = cleanup;
    // 移除底部关闭按钮，点击弹窗外的空白区域不关闭
    // closeBtn2.onclick = cleanup;
    // overlay.onclick = (e) => {
    //     if (e.target === overlay) {
    //         cleanup();
    //     }
    // };

    // Esc键关闭
    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            cleanup();
            document.removeEventListener('keydown', handleKeyDown);
        }
    };
    document.addEventListener('keydown', handleKeyDown);

    // 扩写提示词
    const doExpandPrompt = async () => {
        const prompt = inputEl.value.trim();
        if (!prompt) {
            return;
        }

        // 移除之前的复制按钮（如果存在）
        const existingCopyBtn = buttonsContainer.querySelector('.hive-expand-prompt-copy');
        if (existingCopyBtn) {
            existingCopyBtn.remove();
        }

        // 显示加载状态
        contentDiv.textContent = expandingText;
        contentDiv.style.cssText = `
            margin-bottom: 20px;
            min-height: 200px;
            max-height: 400px;
            overflow-y: auto;
            padding: 16px;
            background-color: var(--comfy-input-bg);
            border-radius: 4px;
            border: 1px solid var(--border-color);
            color: var(--descrip-text);
            font-size: 14px;
            text-align: center;
        `;

        inputEl.disabled = true;
        sendBtn.disabled = true;
        sendBtn.textContent = expandingText;

        try {
            const expandedPrompt = await expandPrompt(prompt);
            
            // 显示扩写后的提示词
            contentDiv.textContent = expandedPrompt;
            contentDiv.style.cssText = `
                margin-bottom: 20px;
                min-height: 200px;
                max-height: 400px;
                overflow-y: auto;
                padding: 16px;
                background-color: var(--comfy-input-bg);
                border-radius: 4px;
                border: 1px solid var(--border-color);
                color: var(--input-text);
                font-size: 14px;
                line-height: 1.6;
                white-space: pre-wrap;
                word-wrap: break-word;
            `;
            
            // 添加复制按钮
            const copyBtn = document.createElement('button');
            copyBtn.className = 'hive-expand-prompt-copy';
            copyBtn.textContent = copyPromptText;
            copyBtn.style.cssText = `
                padding: 8px 16px;
                border-radius: 4px;
                border: none;
                background-color: #ffe066;
                color: #000;
                cursor: pointer;
                font-weight: 500;
                font-size: 14px;
                margin-left: auto;
            `;
            copyBtn.onclick = async () => {
                try {
                    await navigator.clipboard.writeText(expandedPrompt);
                    window.showToast(promptCopiedText, 'success');
                } catch (err) {
                    console.error('🐝 Hive: Failed to copy prompt:', err);
                    window.showToast(getText('common.copyFailed', '复制失败，请手动复制'), 'error');
                }
            };
            
            // 将复制按钮添加到按钮容器中（在输入框和发送按钮之后）
            buttonsContainer.appendChild(copyBtn);
        } catch (error) {
            const tryChangeModelText = getText('settings.tryChangeModel', '如果问题持续，您可以尝试更换模型后再试');
            contentDiv.innerHTML = `
                <div style="margin-bottom: 12px;">${failedText}${error.message}</div>
                <div style="font-size: 12px; color: var(--descrip-text); padding-top: 12px; border-top: 1px solid var(--border-color);">💡 ${tryChangeModelText}</div>
            `;
            contentDiv.style.cssText = `
                margin-bottom: 20px;
                min-height: 200px;
                max-height: 400px;
                overflow-y: auto;
                padding: 16px;
                background-color: var(--comfy-input-bg);
                border-radius: 4px;
                border: 1px solid var(--border-color);
                color: var(--input-text);
                font-size: 14px;
                text-align: center;
            `;
        } finally {
            inputEl.disabled = false;
            sendBtn.disabled = false;
            sendBtn.textContent = sendText;
            inputEl.focus();
        }
    };

    sendBtn.onclick = doExpandPrompt;
    inputEl.onkeydown = (e) => {
        if (e.key === 'Enter') {
            doExpandPrompt();
        }
    };

    inputEl.focus();
};


// 导出函数供全局使用
if (typeof window !== 'undefined') {
    window.showExpandPromptModal = showExpandPromptModal;
}





// 生成随机提示词的函数（调用AI API）
async function generateRandomPrompt() {
    try {
        // 获取当前语言设置
        const currentLang = getCurrentLanguage();
        const isZh = currentLang === 'zh';
        
        let systemPrompt, userPrompt;
        
        if (isZh) {
            // 中文用户：生成中英文提示词
            // 优化prompt，要求更简洁，减少输出长度
            systemPrompt = `你是专业的AI图像生成提示词工程师。生成详细、创意的图像提示词，同时提供英文和中文版本。

要求：
- 英文提示词：100-150个单词（不要超过），包含视觉细节（构图、光线、风格、情绪、艺术元素），适合Stable Diffusion
- 中文提示词：与英文对应，保持相同创意和细节
- 专注于视觉美学

严格按JSON格式返回，不要有任何其他文字、解释或推理过程：
{
  "english": "英文提示词",
  "chinese": "中文提示词"
}

只返回JSON对象，不要有任何前缀、后缀或其他文本。`;
            
            // 随机决定是否包含人物（70%概率包含人物）
            const includeCharacter = Math.random() < 0.7;
            if (includeCharacter) {
                userPrompt = `生成一个随机、创意且详细的AI图像生成提示词，必须包含人物（可以是人物肖像、人物场景、人物与环境的互动等）。让它独特且富有启发性。只返回JSON对象，不要有任何其他文字。`;
            } else {
                userPrompt = `生成一个随机、创意且详细的AI图像生成提示词，不包含人物（可以是风景、建筑、物品、抽象艺术等）。让它独特且富有启发性。只返回JSON对象，不要有任何其他文字。`;
            }
        } else {
            // 英文用户：只生成英文提示词
            systemPrompt = `You are a professional prompt engineer for AI image generation. Generate a detailed, creative, and high-quality prompt in English for image generation. The prompt should be:
- 100-200 words long
- Rich in visual details, including composition, lighting, style, mood, and artistic elements
- Suitable for AI image generation models like Stable Diffusion
- Professional and well-structured
- Focus on visual aesthetics and artistic quality

Generate only the prompt text, without any explanations or additional text.`;

            // 随机决定是否包含人物（70%概率包含人物）
            const includeCharacter = Math.random() < 0.7;
            if (includeCharacter) {
                userPrompt = `Generate a random, creative, and detailed prompt for AI image generation that must include characters (portraits, character scenes, character-environment interactions, etc.). Make it unique and inspiring.`;
            } else {
                userPrompt = `Generate a random, creative, and detailed prompt for AI image generation without characters (landscapes, architecture, objects, abstract art, etc.). Make it unique and inspiring.`;
            }
        }

        // 尝试从localStorage获取API配置（优先使用新配置方式）
        let apiKey = localStorage.getItem('hive_llm_api_key') || '';
        let apiUrl = localStorage.getItem('hive_llm_api_url') || '';
        let model = localStorage.getItem('hive_llm_model') || '';
        const provider = localStorage.getItem('hive_llm_provider') || '';

        // 如果没有配置，提示用户去设置界面配置
        if (!apiKey || !apiUrl || !model) {
            const errorMsg = getText('settings.pleaseConfigureLLM');
            throw new Error(errorMsg);
        }

        // 如果使用新配置方式，根据provider设置apiUrl
        if (provider && !apiUrl) {
            const providers = {
                siliconflow: 'https://api.siliconflow.cn/v1/chat/completions',
                zhipu: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
                ai302: 'https://api.302.ai/v1/chat/completions',
                openrouter: 'https://openrouter.ai/api/v1/chat/completions'
            };
            if (providers[provider]) {
                apiUrl = providers[provider];
            }
        }

        // 构建请求头
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        };

        // 根据不同的提供商构建请求体
        let requestBody = {
            model: model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ]
        };

        // 所有提供商统一使用相同的参数
        requestBody = {
            model: model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.7,
            max_tokens: 2000,
            top_p: 0.9
        };
        
        // 智谱AI特殊处理：添加thinking参数
        if (provider === 'zhipu' || apiUrl.includes('bigmodel.cn')) {
            requestBody.thinking = {
                type: "disabled"  // 禁用推理模式，只返回最终结果（GLM-4.5及以上版本支持）
            };
        } else {
            // 其他提供商也添加thinking参数（如果支持）
            requestBody.thinking = {
                type: "disabled"
            };
        }

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            // 获取详细的错误信息
            let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            try {
                const errorText = await response.clone().text();
                if (errorText) {
                    try {
                        const errorData = JSON.parse(errorText);
                        if (errorData.error) {
                            if (typeof errorData.error === 'string') {
                                errorMessage = errorData.error;
                            } else if (errorData.error.message) {
                                errorMessage = errorData.error.message;
                            } else if (errorData.error.code) {
                                errorMessage = `错误代码: ${errorData.error.code}${errorData.error.message ? ', ' + errorData.error.message : ''}`;
                            }
                        } else {
                            errorMessage = errorText.substring(0, 200); // 限制长度
                        }
                    } catch (e) {
                        errorMessage = errorText.substring(0, 200); // 限制长度
                    }
                }
            } catch (e) {
                // 如果无法读取错误响应，使用默认错误信息
            }
            
            // 根据状态码提供更详细的错误信息
            let detailedError = '';
            if (response.status === 401) {
                detailedError = 'API密钥无效或已过期。请检查API Key是否正确。';
            } else if (response.status === 403) {
                detailedError = 'API访问被拒绝。请检查API Key是否有权限访问该模型。';
            } else if (response.status === 429) {
                detailedError = 'API调用频率过高，已达到速率限制。请稍后再试。';
            } else if (response.status === 400) {
                detailedError = `请求参数错误: ${errorMessage}`;
            } else if (response.status >= 500) {
                detailedError = `服务器错误 (${response.status}): ${errorMessage}`;
            } else {
                detailedError = `API调用失败: ${errorMessage}`;
            }
            
            throw new Error(detailedError);
        }

        const data = await response.json();
        // 优先使用 content 字段（如果存在且不为空）
        let content = data.choices?.[0]?.message?.content?.trim();
        const reasoningContent = data.choices?.[0]?.message?.reasoning_content?.trim();
        const finishReason = data.choices?.[0]?.finish_reason;
        
        // 如果 content 为空，才尝试使用 reasoning_content
        if (!content && reasoningContent) {
            content = reasoningContent;
        }
        
        // 如果 finish_reason 是 "length"，说明内容被截断了
        if (finishReason === 'length' && content) {
            console.warn('🐝 Hive: Response was truncated due to max_tokens limit. Content may be incomplete.');
        }
        
        if (!content) {
            throw new Error('No prompt generated from API response');
        }

        // 解析返回的内容（使用函数开头已声明的 currentLang 和 isZh）
        if (isZh) {
            // 中文用户：尝试解析JSON格式（中英文）
            // 首先尝试直接解析整个内容
            try {
                const parsed = JSON.parse(content);
                if (parsed.english && parsed.chinese) {
                    return {
                        english: parsed.english,
                        chinese: parsed.chinese
                    };
                }
            } catch (e) {
                // 如果不是纯JSON，尝试从文本中提取JSON部分
                // 查找JSON格式的内容（可能包含在推理过程中）
                // 使用更宽松的匹配，允许JSON被截断
                const jsonMatch = content.match(/\{[\s\S]*?"english"\s*:\s*"([^"]+)"[\s\S]*?"chinese"\s*:\s*"([^"]+)"[\s\S]*?\}/);
                if (jsonMatch) {
                    try {
                        // 尝试修复可能被截断的JSON
                        let jsonStr = jsonMatch[0];
                        // 如果JSON被截断，尝试补全
                        if (!jsonStr.endsWith('}')) {
                            // 查找最后一个完整的字段
                            const lastQuote = jsonStr.lastIndexOf('"');
                            if (lastQuote > 0) {
                                jsonStr = jsonStr.substring(0, lastQuote + 1) + '}';
                            }
                        }
                        const parsed = JSON.parse(jsonStr);
                        if (parsed.english && parsed.chinese) {
                            return {
                                english: parsed.english,
                                chinese: parsed.chinese
                            };
                        }
                    } catch (e2) {
                        // 如果JSON解析失败，尝试直接提取字段值
                        const englishMatch = jsonMatch[0].match(/"english"\s*:\s*"([^"]+)"/);
                        const chineseMatch = jsonMatch[0].match(/"chinese"\s*:\s*"([^"]+)"/);
                        if (englishMatch && chineseMatch) {
                            return {
                                english: englishMatch[1],
                                chinese: chineseMatch[1]
                            };
                        }
                        console.warn('🐝 Hive: Failed to parse extracted JSON:', e2);
                    }
                }
                
                // 如果还是无法解析JSON，尝试从文本中提取英文和中文提示词
                // 优先查找JSON格式的字段
                let englishMatch = content.match(/"english"\s*:\s*"([^"]+)"/);
                let chineseMatch = content.match(/"chinese"\s*:\s*"([^"]+)"/);
                
                // 如果没找到JSON格式，尝试查找标记后的内容
                // 支持两种格式：1) 引号中的内容  2) 直接跟在冒号后面的内容（直到下一个标记或文本结束）
                if (!englishMatch) {
                    // 先尝试引号格式
                    englishMatch = content.match(/(?:英文提示词|English Prompt)[:：]\s*["""]([^"""]{50,})["""]/);
                    // 如果没找到引号格式，尝试直接提取冒号后的内容
                    if (!englishMatch) {
                        const englishStart = content.search(/(?:英文提示词|English Prompt)[:：]\s*/);
                        if (englishStart >= 0) {
                            const afterColon = content.substring(englishStart);
                            // 查找下一个标记（中文提示词）或文本结束
                            const nextMarker = afterColon.search(/(?:中文提示词|Chinese Prompt)[:：]|$/);
                            if (nextMarker > 0) {
                                let englishText = afterColon.substring(afterColon.indexOf(':') + 1, nextMarker).trim();
                                // 移除可能的引号
                                englishText = englishText.replace(/^["""]|["""]$/g, '').trim();
                                if (englishText.length > 50) {
                                    englishMatch = [null, englishText];
                                }
                            }
                        }
                    }
                }
                
                if (!chineseMatch) {
                    // 先尝试引号格式
                    chineseMatch = content.match(/(?:中文提示词|Chinese Prompt)[:：]\s*["""]([^"""]{50,})["""]/);
                    // 如果没找到引号格式，尝试直接提取冒号后的内容
                    if (!chineseMatch) {
                        const chineseStart = content.search(/(?:中文提示词|Chinese Prompt)[:：]\s*/);
                        if (chineseStart >= 0) {
                            const afterColon = content.substring(chineseStart);
                            // 提取到文本结束（因为中文提示词通常在最后）
                            let chineseText = afterColon.substring(afterColon.indexOf(':') + 1).trim();
                            // 移除可能的引号
                            chineseText = chineseText.replace(/^["""]|["""]$/g, '').trim();
                            if (chineseText.length > 20) { // 中文可能被截断，降低最小长度要求
                                chineseMatch = [null, chineseText];
                            }
                        }
                    }
                }
                
                // 如果还是没找到，尝试查找最长的引号内容（可能是提示词）
                if (!englishMatch || !chineseMatch) {
                    // 查找所有长引号内容
                    const allQuoted = content.match(/"([^"]{100,})"/g);
                    if (allQuoted && allQuoted.length >= 2) {
                        // 取最长的两个作为英文和中文提示词
                        const sorted = allQuoted.map(q => q.slice(1, -1)).sort((a, b) => b.length - a.length);
                        if (sorted.length >= 2) {
                            return {
                                english: sorted[0],
                                chinese: sorted[1]
                            };
                        }
                    }
                }
                
                if (englishMatch && chineseMatch) {
                    const english = (englishMatch[1] || '').trim();
                    const chinese = (chineseMatch[1] || '').trim();
                    // 降低中文的最小长度要求，因为可能被截断
                    if (english && english.length > 50) {
                        return {
                            english: english,
                            chinese: chinese && chinese.length > 20 ? chinese : null
                        };
                    }
                }
                
                console.warn('🐝 Hive: Failed to parse JSON response, using content as English prompt');
            }
        }
        
        // 英文用户或解析失败：返回纯文本（英文提示词）
        return {
            english: content,
            chinese: null
        };
    } catch (error) {
        console.error('🐝 Hive: Error generating random prompt:', error);
        throw error;
    }
}

// 显示随机提示词弹层
async function showRandomPromptModal() {
    // 移除现有的弹层
    const existingModal = document.getElementById('hive-random-prompt-modal');
    if (existingModal) {
        existingModal.remove();
    }

    // 检查 大语言模型 API 密钥
    if (!(await checkLLMAPiKey())) return;

    const randomPromptText = getText('contextMenu.randomPrompt', '随机提示词');
    const generatingText = getText('contextMenu.generatingPrompt', '正在生成提示词...');
    const copyPromptText = getText('contextMenu.copyPrompt', '复制提示词');
    const promptCopiedText = getText('contextMenu.promptCopied', '提示词已复制到剪贴板');
    const generatePromptFailedText = getText('contextMenu.generatePromptFailed', '生成提示词失败：');
    const closeText = getText('common.close', '关闭');

    // 创建弹层
    const modal = document.createElement('div');
    modal.id = 'hive-random-prompt-modal';
    modal.innerHTML = `
        <div class="hive-confirm-overlay" style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        ">
            <div class="hive-confirm-content" style="
                background-color: var(--comfy-menu-bg);
                border-radius: 8px;
                padding: 24px;
                max-width: 700px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            ">
                <div style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                    padding-bottom: 12px;
                    border-bottom: 1px solid var(--border-color);
                ">
                    <h3 style="
                        margin: 0;
                        color: var(--input-text);
                        font-size: 18px;
                    ">🐝 ${randomPromptText}</h3>
                    <button class="hive-random-prompt-close" style="
                        background: none;
                        border: none;
                        color: var(--input-text);
                        font-size: 24px;
                        cursor: pointer;
                        padding: 0;
                        width: 30px;
                        height: 30px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    ">×</button>
                </div>
                <div class="hive-random-prompt-content" style="
                    margin-bottom: 20px;
                    min-height: 200px;
                ">
                    <div class="hive-random-prompt-loading" style="
                        text-align: center;
                        padding: 40px;
                        color: var(--descrip-text);
                    ">
                        ${generatingText}
                    </div>
                </div>
                <div style="
                    display: flex;
                    justify-content: flex-end;
                    gap: 12px;
                ">
                    <button class="hive-random-prompt-copy" style="
                        padding: 8px 16px;
                        border-radius: 4px;
                        border: none;
                        background-color: #ffe066;
                        color: #000;
                        cursor: pointer;
                        font-weight: 500;
                        font-size: 14px;
                        display: none;
                    ">${copyPromptText}</button>
                    <button class="hive-random-prompt-close-btn" style="
                        padding: 8px 16px;
                        border-radius: 4px;
                        border: none;
                        background-color: var(--comfy-input-bg);
                        color: var(--input-text);
                        cursor: pointer;
                        font-weight: 500;
                        font-size: 14px;
                    ">${closeText}</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const closeBtn = modal.querySelector('.hive-random-prompt-close');
    const closeBtn2 = modal.querySelector('.hive-random-prompt-close-btn');
    const copyBtn = modal.querySelector('.hive-random-prompt-copy');
    const overlay = modal.querySelector('.hive-confirm-overlay');
    const contentDiv = modal.querySelector('.hive-random-prompt-content');
    const loadingDiv = modal.querySelector('.hive-random-prompt-loading');

    let generatedPrompt = null; // 改为对象：{english: string, chinese: string | null}

    const cleanup = () => {
        modal.remove();
    };

    // 关闭按钮
    closeBtn.onclick = cleanup;
    closeBtn2.onclick = cleanup;

    // 设置复制按钮（根据语言显示不同的复制按钮）
    const setupCopyButtons = (promptData) => {
        const currentLang = getCurrentLanguage();
        const isZh = currentLang === 'zh';
        
        // 清空现有的复制按钮区域
        const buttonContainer = modal.querySelector('.hive-random-prompt-close-btn').parentElement;
        buttonContainer.innerHTML = '';
        
        if (isZh && promptData.chinese) {
            // 中文用户且有中文提示词：显示两个复制按钮
            const copyEnglishBtn = document.createElement('button');
            copyEnglishBtn.className = 'hive-random-prompt-copy-english';
            copyEnglishBtn.textContent = getText('contextMenu.copyEnglishPrompt', '复制英文提示词');
            copyEnglishBtn.style.cssText = `
                padding: 8px 16px;
                border-radius: 4px;
                border: none;
                background-color: #ffe066;
                color: #000;
                cursor: pointer;
                font-weight: 500;
                font-size: 14px;
                margin-right: 8px;
            `;
            copyEnglishBtn.onclick = async () => {
                try {
                    await navigator.clipboard.writeText(promptData.english);
                    if (typeof window.showToast === 'function') {
                        window.showToast(promptCopiedText, 'success');
                    }
                } catch (err) {
                    console.error('🐝 Hive: Failed to copy English prompt:', err);
                    if (typeof window.showToast === 'function') {
                        window.showToast(getText('common.copyFailed', '复制失败，请手动复制'), 'error');
                    }
                }
            };
            
            const copyChineseBtn = document.createElement('button');
            copyChineseBtn.className = 'hive-random-prompt-copy-chinese';
            copyChineseBtn.textContent = getText('contextMenu.copyChinesePrompt', '复制中文提示词');
            copyChineseBtn.style.cssText = `
                padding: 8px 16px;
                border-radius: 4px;
                border: none;
                background-color: #ffe066;
                color: #000;
                cursor: pointer;
                font-weight: 500;
                font-size: 14px;
                margin-right: 8px;
            `;
            copyChineseBtn.onclick = async () => {
                try {
                    await navigator.clipboard.writeText(promptData.chinese);
                    if (typeof window.showToast === 'function') {
                        window.showToast(promptCopiedText, 'success');
                    }
                } catch (err) {
                    console.error('🐝 Hive: Failed to copy Chinese prompt:', err);
                    if (typeof window.showToast === 'function') {
                        window.showToast(getText('common.copyFailed', '复制失败，请手动复制'), 'error');
                    }
                }
            };
            
            buttonContainer.appendChild(copyEnglishBtn);
            buttonContainer.appendChild(copyChineseBtn);
        } else {
            // 英文用户或只有英文提示词：显示一个复制按钮
            const singleCopyBtn = document.createElement('button');
            singleCopyBtn.className = 'hive-random-prompt-copy';
            singleCopyBtn.textContent = copyPromptText;
            singleCopyBtn.style.cssText = `
                padding: 8px 16px;
                border-radius: 4px;
                border: none;
                background-color: #ffe066;
                color: #000;
                cursor: pointer;
                font-weight: 500;
                font-size: 14px;
                margin-right: 8px;
            `;
            singleCopyBtn.onclick = async () => {
                try {
                    await navigator.clipboard.writeText(promptData.english);
                    if (typeof window.showToast === 'function') {
                        window.showToast(promptCopiedText, 'success');
                    }
                } catch (err) {
                    console.error('🐝 Hive: Failed to copy prompt:', err);
                    if (typeof window.showToast === 'function') {
                        window.showToast(getText('common.copyFailed', '复制失败，请手动复制'), 'error');
                    }
                }
            };
            
            buttonContainer.appendChild(singleCopyBtn);
        }
        
        // 添加关闭按钮
        const closeBtn = document.createElement('button');
        closeBtn.className = 'hive-random-prompt-close-btn';
        closeBtn.textContent = closeText;
        closeBtn.style.cssText = `
            padding: 8px 16px;
            border-radius: 4px;
            border: none;
            background-color: var(--comfy-input-bg);
            color: var(--input-text);
            cursor: pointer;
            font-weight: 500;
            font-size: 14px;
        `;
        closeBtn.onclick = cleanup;
        buttonContainer.appendChild(closeBtn);
    };

    // Esc键关闭
    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            cleanup();
            document.removeEventListener('keydown', handleKeyDown);
        }
    };
    document.addEventListener('keydown', handleKeyDown);

    // 生成提示词
    try {
        generatedPrompt = await generateRandomPrompt();
        
        // 隐藏加载提示，显示生成的提示词
        loadingDiv.style.display = 'none';
        
        const currentLang = getCurrentLanguage();
        const isZh = currentLang === 'zh';
        
        if (isZh && generatedPrompt.chinese) {
            // 中文用户且有中文提示词：显示两个提示词框
            contentDiv.innerHTML = `
                <div style="margin-bottom: 16px;">
                    <div style="
                        margin-bottom: 8px;
                        color: var(--input-text);
                        font-weight: 500;
                        font-size: 14px;
                    ">${getText('contextMenu.englishPrompt', '英文提示词')}</div>
                    <div style="
                        padding: 16px;
                        background-color: var(--comfy-input-bg);
                        border-radius: 4px;
                        border: 1px solid var(--border-color);
                        color: var(--input-text);
                        font-size: 14px;
                        line-height: 1.6;
                        white-space: pre-wrap;
                        word-wrap: break-word;
                    ">${generatedPrompt.english}</div>
                </div>
                <div>
                    <div style="
                        margin-bottom: 8px;
                        color: var(--input-text);
                        font-weight: 500;
                        font-size: 14px;
                    ">${getText('contextMenu.chinesePrompt', '中文提示词')}</div>
                    <div style="
                        padding: 16px;
                        background-color: var(--comfy-input-bg);
                        border-radius: 4px;
                        border: 1px solid var(--border-color);
                        color: var(--input-text);
                        font-size: 14px;
                        line-height: 1.6;
                        white-space: pre-wrap;
                        word-wrap: break-word;
                    ">${generatedPrompt.chinese}</div>
                </div>
            `;
        } else {
            // 英文用户或只有英文提示词：只显示英文提示词
            contentDiv.innerHTML = `
                <div style="
                    padding: 16px;
                    background-color: var(--comfy-input-bg);
                    border-radius: 4px;
                    border: 1px solid var(--border-color);
                    color: var(--input-text);
                    font-size: 14px;
                    line-height: 1.6;
                    white-space: pre-wrap;
                    word-wrap: break-word;
                ">${generatedPrompt.english}</div>
            `;
        }
        
        // 设置复制按钮
        setupCopyButtons(generatedPrompt);
    } catch (error) {
        console.error('🐝 Hive: Error generating prompt:', error);
        // 显示详细的错误信息
        let errorMessage = error.message || '未知错误';
        // 如果是API未配置的错误，显示配置提示
        if (errorMessage.includes('请先在设置界面配置') || errorMessage.includes('API未配置')) {
            const pleaseConfigureText = getText(
                'settings.pleaseConfigureLLM', 
                '🤖 大语言模型 API 未填写。请先在浏览器右侧点击 🐝Hive 打开侧边栏，点击右上角齿轮 ⚙️ 打开设置，然后点击 🤖 配置大模型API 按钮填写 API Key 与模型并保存后再试'
            );
            loadingDiv.innerHTML = `
                <div style="
                    color: var(--descrip-text);
                    text-align: center;
                ">
                    <div style="margin-bottom: 12px; color: var(--input-text); font-weight: 500;">${generatePromptFailedText}</div>
                    <div style="font-size: 14px; line-height: 1.6; white-space: pre-line; color: var(--descrip-text);">${pleaseConfigureText}</div>
                </div>
            `;
        } else {
            // 显示详细的错误信息
            const tryChangeModelText = getText('settings.tryChangeModel', '如果问题持续，您可以尝试更换模型后再试');
            loadingDiv.innerHTML = `
                <div style="
                    color: var(--descrip-text);
                    text-align: center;
                ">
                    <div style="margin-bottom: 12px; color: var(--input-text); font-weight: 500;">${generatePromptFailedText}</div>
                    <div style="font-size: 14px; line-height: 1.6; white-space: pre-wrap; word-wrap: break-word; color: var(--descrip-text); padding: 12px; background-color: var(--comfy-input-bg); border-radius: 4px; border: 1px solid var(--border-color); margin-bottom: 12px;">${errorMessage}</div>
                    <div style="font-size: 13px; line-height: 1.6; color: var(--descrip-text); padding: 8px 12px; background-color: var(--comfy-menu-bg); border-radius: 4px; border: 1px solid var(--border-color);">💡 ${tryChangeModelText}</div>
                </div>
            `;
        }
    }
}

// 导出函数供全局使用
if (typeof window !== 'undefined') {
    window.showRandomPromptModal = showRandomPromptModal;
}





// 摄影提示词生成器：根据摄影参数生成提示词
async function generatePhotoPrompt(params, photoOptionsMap) {
    try {
        // 获取当前语言设置
        const currentLang = getCurrentLanguage();
        const isZh = currentLang === 'zh';
        
        let systemPrompt, userPrompt;
        
        // 获取选项标签的辅助函数
        const getOptionLabel = (key, value) => {
            if (!photoOptionsMap || !photoOptionsMap[key]) {
                return value;
            }
            const option = photoOptionsMap[key].find(opt => opt.value === value);
            if (option) {
                return isZh ? option.label.zh : option.label.en;
            }
            return value;
        };
        
        // 构建参数描述
        const paramDescriptions = [];
        if (params.location && params.location !== 'none') {
            paramDescriptions.push(isZh ? `地点：${getOptionLabel('location', params.location)}` : `Location: ${getOptionLabel('location', params.location)}`);
        }
        if (params.person && params.person !== 'none') {
            paramDescriptions.push(isZh ? `人物：${getOptionLabel('person', params.person)}` : `Person: ${getOptionLabel('person', params.person)}`);
        }
        if (params.age && params.age !== 'none') {
            paramDescriptions.push(isZh ? `年龄：${getOptionLabel('age', params.age)}` : `Age: ${getOptionLabel('age', params.age)}`);
        }
        if (params.gender && params.gender !== 'none') {
            paramDescriptions.push(isZh ? `性别：${getOptionLabel('gender', params.gender)}` : `Gender: ${getOptionLabel('gender', params.gender)}`);
        }
        if (params.ethnicity && params.ethnicity !== 'none') {
            paramDescriptions.push(isZh ? `人种/地区：${getOptionLabel('ethnicity', params.ethnicity)}` : `Ethnicity/Region: ${getOptionLabel('ethnicity', params.ethnicity)}`);
        }
        if (params.hairStyle && params.hairStyle !== 'none') {
            paramDescriptions.push(isZh ? `发型：${getOptionLabel('hairStyle', params.hairStyle)}` : `Hair Style: ${getOptionLabel('hairStyle', params.hairStyle)}`);
        }
        if (params.makeup && params.makeup !== 'none') {
            paramDescriptions.push(isZh ? `妆容：${getOptionLabel('makeup', params.makeup)}` : `Makeup: ${getOptionLabel('makeup', params.makeup)}`);
        }
        if (params.clothing && params.clothing !== 'none') {
            paramDescriptions.push(isZh ? `服装：${getOptionLabel('clothing', params.clothing)}` : `Clothing: ${getOptionLabel('clothing', params.clothing)}`);
        }
        if (params.accessories && params.accessories !== 'none') {
            paramDescriptions.push(isZh ? `配饰：${getOptionLabel('accessories', params.accessories)}` : `Accessories: ${getOptionLabel('accessories', params.accessories)}`);
        }
        if (params.pose && params.pose !== 'none') {
            paramDescriptions.push(isZh ? `姿势：${getOptionLabel('pose', params.pose)}` : `Pose: ${getOptionLabel('pose', params.pose)}`);
        }
        if (params.orientation && params.orientation !== 'none') {
            paramDescriptions.push(isZh ? `朝向：${getOptionLabel('orientation', params.orientation)}` : `Orientation: ${getOptionLabel('orientation', params.orientation)}`);
        }
        if (params.lighting && params.lighting !== 'none') {
            paramDescriptions.push(isZh ? `灯光：${getOptionLabel('lighting', params.lighting)}` : `Lighting: ${getOptionLabel('lighting', params.lighting)}`);
        }
        if (params.lens && params.lens !== 'none') {
            paramDescriptions.push(isZh ? `镜头：${getOptionLabel('lens', params.lens)}` : `Lens: ${getOptionLabel('lens', params.lens)}`);
        }
        if (params.camera && params.camera !== 'none') {
            paramDescriptions.push(isZh ? `相机：${getOptionLabel('camera', params.camera)}` : `Camera: ${getOptionLabel('camera', params.camera)}`);
        }
        if (params.style && params.style !== 'none') {
            paramDescriptions.push(isZh ? `风格：${getOptionLabel('style', params.style)}` : `Style: ${getOptionLabel('style', params.style)}`);
        }
        if (params.timeOfDay && params.timeOfDay !== 'none') {
            paramDescriptions.push(isZh ? `时间：${getOptionLabel('timeOfDay', params.timeOfDay)}` : `Time of Day: ${getOptionLabel('timeOfDay', params.timeOfDay)}`);
        }
        if (params.weather && params.weather !== 'none') {
            paramDescriptions.push(isZh ? `天气：${getOptionLabel('weather', params.weather)}` : `Weather: ${getOptionLabel('weather', params.weather)}`);
        }
        if (params.depthOfField && params.depthOfField !== 'none') {
            paramDescriptions.push(isZh ? `景深：${getOptionLabel('depthOfField', params.depthOfField)}` : `Depth of Field: ${getOptionLabel('depthOfField', params.depthOfField)}`);
        }
        if (params.aperture && params.aperture !== 'none') {
            paramDescriptions.push(isZh ? `光圈：${getOptionLabel('aperture', params.aperture)}` : `Aperture: ${getOptionLabel('aperture', params.aperture)}`);
        }
        if (params.iso && params.iso !== 'none') {
            paramDescriptions.push(isZh ? `ISO：${getOptionLabel('iso', params.iso)}` : `ISO: ${getOptionLabel('iso', params.iso)}`);
        }
        if (params.colorTemperature && params.colorTemperature !== 'none') {
            paramDescriptions.push(isZh ? `色温：${getOptionLabel('colorTemperature', params.colorTemperature)}` : `Color Temperature: ${getOptionLabel('colorTemperature', params.colorTemperature)}`);
        }
        if (params.whiteBalance && params.whiteBalance !== 'none') {
            paramDescriptions.push(isZh ? `白平衡：${getOptionLabel('whiteBalance', params.whiteBalance)}` : `White Balance: ${getOptionLabel('whiteBalance', params.whiteBalance)}`);
        }
        if (params.shutterSpeed && params.shutterSpeed !== 'none') {
            paramDescriptions.push(isZh ? `快门：${getOptionLabel('shutterSpeed', params.shutterSpeed)}` : `Shutter Speed: ${getOptionLabel('shutterSpeed', params.shutterSpeed)}`);
        }
        
        if (isZh) {
            systemPrompt = `你是专业的AI图像生成提示词工程师，擅长摄影风格的提示词生成。根据用户提供的摄影参数，生成详细、专业、符合摄影术语的图像生成提示词，同时提供英文和中文版本。

重要说明：
- 相机类型（如单反、无反、胶片等）、ISO、光圈、快门、色温、白平衡等参数是摄影技术参数，用于描述照片的拍摄风格、画质特征和技术效果
- 这些参数描述的是照片本身的视觉特征和技术属性，而不是人物手中拿着的相机设备
- 不要生成人物拿着相机的场景，而是描述照片应该呈现的视觉效果和技术特征

要求：
- 英文提示词：150-250个单词，详细描述摄影参数对应的视觉效果（构图、光线、镜头特性、照片风格、时间氛围、天气效果等），使用专业摄影术语，适合Stable Diffusion等AI图像生成模型
- 中文提示词：与英文对应，保持相同的专业性和细节
- 必须准确反映所有提供的摄影参数
- 使用专业摄影术语（如景深、光圈、快门、ISO、色温、白平衡等）来描述照片的视觉效果
- 专注于摄影美学和视觉质量
- 相机相关参数应转换为照片风格描述（如"单反风格"、"胶片质感"、"高ISO噪点效果"等），而不是人物手持相机

严格按JSON格式返回，不要有任何其他文字、解释或推理过程：
{
"english": "英文提示词",
"chinese": "中文提示词"
}

只返回JSON对象，不要有任何前缀、后缀或其他文本。`;
            
            userPrompt = `根据以下摄影参数生成专业的摄影风格提示词：\n${paramDescriptions.join('\n')}\n\n重要：相机类型、ISO、光圈、快门等是摄影技术参数，用于描述照片的视觉效果和技术特征，不是人物手中的相机。请将这些参数转换为照片风格描述（如"单反风格"、"胶片质感"、"高ISO效果"等）。只返回JSON对象，不要有任何其他文字。`;
        } else {
            systemPrompt = `You are a professional prompt engineer for AI image generation, specializing in photography-style prompts. Generate detailed, professional, photography-term-compliant prompts based on user-provided photography parameters.

Important Notes:
- Camera types (DSLR, mirrorless, film, etc.), ISO, aperture, shutter speed, color temperature, white balance, etc. are photography technical parameters used to describe the photo's shooting style, image quality characteristics, and technical effects
- These parameters describe the visual characteristics and technical attributes of the photo itself, NOT a camera device held by a person
- Do NOT generate scenes of people holding cameras. Instead, describe the visual effects and technical characteristics the photo should present

Requirements:
- 150-250 words long
- Rich in visual details based on photography parameters (composition, lighting, lens characteristics, photo style, time atmosphere, weather effects, etc.)
- Use professional photography terminology (depth of field, aperture, shutter, ISO, color temperature, white balance, etc.) to describe the photo's visual effects
- Suitable for AI image generation models like Stable Diffusion
- Professional and well-structured
- Focus on photography aesthetics and visual quality
- Camera-related parameters should be converted to photo style descriptions (e.g., "DSLR-style", "film grain texture", "high ISO noise effect", etc.), NOT a person holding a camera

Generate only the prompt text, without any explanations or additional text.`;
            
            userPrompt = `Generate a professional photography-style prompt based on the following photography parameters:\n${paramDescriptions.join('\n')}\n\nImportant: Camera types, ISO, aperture, shutter speed, etc. are photography technical parameters used to describe the photo's visual effects and technical characteristics, NOT a camera held by a person. Please convert these parameters to photo style descriptions (e.g., "DSLR-style", "film grain texture", "high ISO effect", etc.).`;
        }

        // 获取API配置
        let apiKey = localStorage.getItem('hive_llm_api_key') || '';
        let apiUrl = localStorage.getItem('hive_llm_api_url') || '';
        let model = localStorage.getItem('hive_llm_model') || '';
        const provider = localStorage.getItem('hive_llm_provider') || '';

        if (!apiKey || !apiUrl || !model) {
            const errorMsg = getText('settings.pleaseConfigureLLM');
            throw new Error(errorMsg);
        }

        // 如果使用新配置方式，根据provider设置apiUrl
        if (provider && !apiUrl) {
            const providers = {
                siliconflow: 'https://api.siliconflow.cn/v1/chat/completions',
                zhipu: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
                ai302: 'https://api.302.ai/v1/chat/completions',
                openrouter: 'https://openrouter.ai/api/v1/chat/completions'
            };
            if (providers[provider]) {
                apiUrl = providers[provider];
            }
        }

        // 构建请求
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        };

        let requestBody = {
            model: model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.7,
            max_tokens: 2500,
            top_p: 0.9
        };
        
        // 智谱AI特殊处理
        if (provider === 'zhipu' || apiUrl.includes('bigmodel.cn')) {
            requestBody.thinking = {
                type: "disabled"
            };
        }

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            try {
                const errorText = await response.clone().text();
                if (errorText) {
                    try {
                        const errorData = JSON.parse(errorText);
                        if (errorData.error) {
                            if (typeof errorData.error === 'string') {
                                errorMessage = errorData.error;
                            } else if (errorData.error.message) {
                                errorMessage = errorData.error.message;
                            }
                        }
                    } catch (e) {
                        errorMessage = errorText.substring(0, 200);
                    }
                }
            } catch (e) {}
            throw new Error(errorMessage);
        }

        const data = await response.json();
        let content = data.choices?.[0]?.message?.content?.trim();
        const reasoningContent = data.choices?.[0]?.message?.reasoning_content?.trim();
        
        if (!content && reasoningContent) {
            content = reasoningContent;
        }
        
        if (!content) {
            throw new Error('No prompt generated from API response');
        }

        // 解析返回的内容
        if (isZh) {
            try {
                const parsed = JSON.parse(content);
                if (parsed.english && parsed.chinese) {
                    return {
                        english: parsed.english,
                        chinese: parsed.chinese
                    };
                }
            } catch (e) {
                // 尝试从文本中提取JSON
                const jsonMatch = content.match(/\{[\s\S]*?"english"\s*:\s*"([^"]+)"[\s\S]*?"chinese"\s*:\s*"([^"]+)"[\s\S]*?\}/);
                if (jsonMatch) {
                    try {
                        const parsed = JSON.parse(jsonMatch[0]);
                        if (parsed.english && parsed.chinese) {
                            return {
                                english: parsed.english,
                                chinese: parsed.chinese
                            };
                        }
                    } catch (e2) {
                        const englishMatch = jsonMatch[0].match(/"english"\s*:\s*"([^"]+)"/);
                        const chineseMatch = jsonMatch[0].match(/"chinese"\s*:\s*"([^"]+)"/);
                        if (englishMatch && chineseMatch) {
                            return {
                                english: englishMatch[1],
                                chinese: chineseMatch[1]
                            };
                        }
                    }
                }
            }
        }
        
        // 英文用户或解析失败：返回纯文本（英文提示词）
        return {
            english: content,
            chinese: null
        };
    } catch (error) {
        console.error('🐝 Hive: Error generating photo prompt:', error);
        throw error;
    }
}

// 显示摄影提示词生成器弹窗
async function showPhotoPromptModal() {
    // 移除现有的弹窗
    const existingModal = document.getElementById('hive-photo-prompt-modal');
    if (existingModal) {
        existingModal.remove();
    }

    // 检查 大语言模型 API 密钥
    if (!(await checkLLMAPiKey())) return;

    // 先获取语言设置
    const currentLang = getCurrentLanguage();
    const isZh = currentLang === 'zh';
    
    const photoPromptText = getText('photoPrompt.photoPromptGenerator', '摄影提示词生成器');
    const generatingText = getText('photoPrompt.photoPromptGenerating', '正在生成摄影提示词...');
    const copyPromptText = getText('photoPrompt.copyPrompt', '复制提示词');
    const promptCopiedText = getText('photoPrompt.promptCopied', '提示词已复制到剪贴板');
    const generatePromptFailedText = getText('photoPrompt.photoPromptFailed', '生成摄影提示词失败：');
    const closeText = getText('common.close', '关闭');
    const generatePromptText = getText('photoPrompt.generatePrompt', '生成提示词');
    const savePresetText = getText('photoPrompt.savePreset', '保存预设');
    const loadPresetText = getText('photoPrompt.loadPreset', '加载预设');
    const resetSettingsText = getText('photoPrompt.resetSettings', '重置设定');
    const recommendedSettingsText = getText('photoPrompt.recommendedSettings', '推荐设定');
    const randomSettingsText = getText('photoPrompt.randomSettings', '随机设定');
    const deletePresetText = getText('photoPrompt.deletePreset', '删除预设');
    const confirmDeletePresetText = getText('photoPrompt.confirmDeletePreset', '确定要删除预设"{name}"吗？');
    const presetDeletedText = getText('photoPrompt.presetDeleted', '预设已删除');
    const pleaseSelectParamsText = getText('photoPrompt.leastOneParameter', '请至少选择一个参数');
    const presetNameText = getText('photoPrompt.presetName', '预设名称');
    const enterPresetNameText = getText('photoPrompt.enterPresetName', '请输入预设名称');
    const presetSavedText = getText('photoPrompt.presetSaved', '预设已保存');
    const presetLoadedText = getText('photoPrompt.presetLoaded', '预设已加载');
    const noPresetsText = getText('photoPrompt.noPresets', '暂无预设');

    // 摄影参数选项（丰富选项）
    const photoOptions = {
        location: [
            { value: 'none', label: { zh: '不指定', en: 'None' } },
            { value: 'indoor', label: { zh: '室内', en: 'Indoor' } },
            { value: 'outdoor', label: { zh: '室外', en: 'Outdoor' } },
            { value: 'studio', label: { zh: '影棚', en: 'Studio' } },
            { value: 'street', label: { zh: '街头', en: 'Street' } },
            { value: 'nature', label: { zh: '自然', en: 'Nature' } },
            { value: 'urban', label: { zh: '城市', en: 'Urban' } },
            { value: 'beach', label: { zh: '海滩', en: 'Beach' } },
            { value: 'mountain', label: { zh: '山区', en: 'Mountain' } },
            { value: 'forest', label: { zh: '森林', en: 'Forest' } },
            { value: 'desert', label: { zh: '沙漠', en: 'Desert' } },
            { value: 'ocean', label: { zh: '海洋', en: 'Ocean' } },
            { value: 'park', label: { zh: '公园', en: 'Park' } },
            { value: 'cafe', label: { zh: '咖啡厅', en: 'Cafe' } },
            { value: 'library', label: { zh: '图书馆', en: 'Library' } },
            { value: 'museum', label: { zh: '博物馆', en: 'Museum' } },
            { value: 'garden', label: { zh: '花园', en: 'Garden' } },
            { value: 'rooftop', label: { zh: '屋顶', en: 'Rooftop' } }
        ],
        person: [
            { value: 'none', label: { zh: '不指定', en: 'None' } },
            { value: 'portrait', label: { zh: '肖像', en: 'Portrait' } },
            { value: 'fullBody', label: { zh: '全身', en: 'Full Body' } },
            { value: 'halfBody', label: { zh: '半身', en: 'Half Body' } },
            { value: 'closeUp', label: { zh: '特写', en: 'Close Up' } },
            { value: 'group', label: { zh: '群体', en: 'Group' } },
            { value: 'couple', label: { zh: '情侣', en: 'Couple' } },
            { value: 'solo', label: { zh: '单人', en: 'Solo' } }
        ],
        gender: [
            { value: 'none', label: { zh: '不指定', en: 'None' } },
            { value: 'male', label: { zh: '男性', en: 'Male' } },
            { value: 'female', label: { zh: '女性', en: 'Female' } },
            { value: 'neutral', label: { zh: '中性', en: 'Neutral' } }
        ],
        ethnicity: [
            { value: 'none', label: { zh: '不指定', en: 'None' } },
            { value: 'asia', label: { zh: '亚洲', en: 'Asia' } },
            { value: 'europe', label: { zh: '欧洲', en: 'Europe' } },
            { value: 'northAmerica', label: { zh: '北美洲', en: 'North America' } },
            { value: 'southAmerica', label: { zh: '南美洲', en: 'South America' } },
            { value: 'africa', label: { zh: '非洲', en: 'Africa' } },
            { value: 'oceania', label: { zh: '大洋洲', en: 'Oceania' } },
            { value: 'chinese', label: { zh: '中国人', en: 'Chinese' } },
            { value: 'japanese', label: { zh: '日本人', en: 'Japanese' } },
            { value: 'korean', label: { zh: '韩国人', en: 'Korean' } },
            { value: 'indian', label: { zh: '印度人', en: 'Indian' } },
            { value: 'thai', label: { zh: '泰国人', en: 'Thai' } },
            { value: 'vietnamese', label: { zh: '越南人', en: 'Vietnamese' } },
            { value: 'british', label: { zh: '英国人', en: 'British' } },
            { value: 'french', label: { zh: '法国人', en: 'French' } },
            { value: 'german', label: { zh: '德国人', en: 'German' } },
            { value: 'italian', label: { zh: '意大利人', en: 'Italian' } },
            { value: 'spanish', label: { zh: '西班牙人', en: 'Spanish' } },
            { value: 'russian', label: { zh: '俄罗斯人', en: 'Russian' } },
            { value: 'american', label: { zh: '美国人', en: 'American' } },
            { value: 'canadian', label: { zh: '加拿大人', en: 'Canadian' } },
            { value: 'mexican', label: { zh: '墨西哥人', en: 'Mexican' } },
            { value: 'brazilian', label: { zh: '巴西人', en: 'Brazilian' } },
            { value: 'australian', label: { zh: '澳大利亚人', en: 'Australian' } },
            { value: 'newZealander', label: { zh: '新西兰人', en: 'New Zealander' } }
        ],
        age: [
            { value: 'none', label: { zh: '不指定', en: 'None' } },
            { value: 'child', label: { zh: '小孩', en: 'Child' } },
            { value: 'teenager', label: { zh: '青少年', en: 'Teenager' } },
            { value: 'young', label: { zh: '青年', en: 'Young' } },
            { value: 'middleAged', label: { zh: '中年', en: 'Middle Aged' } },
            { value: 'elderly', label: { zh: '老人', en: 'Elderly' } }
        ],
        hairStyle: [
            { value: 'none', label: { zh: '不指定', en: 'None' } },
            { value: 'short', label: { zh: '短发', en: 'Short' } },
            { value: 'long', label: { zh: '长发', en: 'Long' } },
            { value: 'curly', label: { zh: '卷发', en: 'Curly' } },
            { value: 'straight', label: { zh: '直发', en: 'Straight' } },
            { value: 'wavy', label: { zh: '波浪', en: 'Wavy' } },
            { value: 'ponytail', label: { zh: '马尾', en: 'Ponytail' } },
            { value: 'bun', label: { zh: '发髻', en: 'Bun' } },
            { value: 'braid', label: { zh: '辫子', en: 'Braid' } },
            { value: 'bangs', label: { zh: '刘海', en: 'Bangs' } },
            { value: 'bob', label: { zh: '波波头', en: 'Bob' } },
            { value: 'shaved', label: { zh: '光头', en: 'Shaved' } },
            { value: 'mohawk', label: { zh: '莫霍克', en: 'Mohawk' } }
        ],
        makeup: [
            { value: 'none', label: { zh: '不指定', en: 'None' } },
            { value: 'noMakeup', label: { zh: '素颜', en: 'No Makeup' } },
            { value: 'natural', label: { zh: '自然', en: 'Natural' } },
            { value: 'light', label: { zh: '淡妆', en: 'Light' } },
            { value: 'heavy', label: { zh: '浓妆', en: 'Heavy' } },
            { value: 'professional', label: { zh: '专业', en: 'Professional' } },
            { value: 'artistic', label: { zh: '艺术', en: 'Artistic' } }
        ],
        clothing: [
            { value: 'none', label: { zh: '不指定', en: 'None' } },
            { value: 'top', label: { zh: '上装', en: 'Top' } },
            { value: 'bottom', label: { zh: '下装', en: 'Bottom' } },
            { value: 'dress', label: { zh: '连衣裙', en: 'Dress' } },
            { value: 'suit', label: { zh: '套装', en: 'Suit' } },
            { value: 'casual', label: { zh: '休闲装', en: 'Casual' } },
            { value: 'formal', label: { zh: '正装', en: 'Formal' } },
            { value: 'sportswear', label: { zh: '运动装', en: 'Sportswear' } },
            { value: 'swimwear', label: { zh: '泳装', en: 'Swimwear' } },
            { value: 'underwear', label: { zh: '内衣', en: 'Underwear' } },
            { value: 'traditional', label: { zh: '传统服装', en: 'Traditional' } },
            { value: 'uniform', label: { zh: '制服', en: 'Uniform' } }
        ],
        accessories: [
            { value: 'none', label: { zh: '不指定', en: 'None' } },
            { value: 'hat', label: { zh: '帽子', en: 'Hat' } },
            { value: 'glasses', label: { zh: '眼镜', en: 'Glasses' } },
            { value: 'jewelry', label: { zh: '首饰', en: 'Jewelry' } },
            { value: 'watch', label: { zh: '手表', en: 'Watch' } },
            { value: 'bag', label: { zh: '包', en: 'Bag' } },
            { value: 'shoes', label: { zh: '鞋子', en: 'Shoes' } },
            { value: 'scarf', label: { zh: '围巾', en: 'Scarf' } },
            { value: 'gloves', label: { zh: '手套', en: 'Gloves' } },
            { value: 'belt', label: { zh: '腰带', en: 'Belt' } },
            { value: 'earrings', label: { zh: '耳环', en: 'Earrings' } },
            { value: 'necklace', label: { zh: '项链', en: 'Necklace' } },
            { value: 'ring', label: { zh: '戒指', en: 'Ring' } },
            { value: 'bracelet', label: { zh: '手镯', en: 'Bracelet' } }
        ],
        pose: [
            { value: 'none', label: { zh: '不指定', en: 'None' } },
            { value: 'standing', label: { zh: '站立', en: 'Standing' } },
            { value: 'sitting', label: { zh: '坐着', en: 'Sitting' } },
            { value: 'lying', label: { zh: '躺着', en: 'Lying' } },
            { value: 'walking', label: { zh: '行走', en: 'Walking' } },
            { value: 'running', label: { zh: '奔跑', en: 'Running' } },
            { value: 'jumping', label: { zh: '跳跃', en: 'Jumping' } },
            { value: 'dancing', label: { zh: '舞蹈', en: 'Dancing' } },
            { value: 'leaning', label: { zh: '倚靠', en: 'Leaning' } },
            { value: 'crouching', label: { zh: '蹲下', en: 'Crouching' } },
            { value: 'reaching', label: { zh: '伸手', en: 'Reaching' } },
            { value: 'pointing', label: { zh: '指向', en: 'Pointing' } }
        ],
        orientation: [
            { value: 'none', label: { zh: '不指定', en: 'None' } },
            { value: 'front', label: { zh: '正面', en: 'Front' } },
            { value: 'side', label: { zh: '侧面', en: 'Side' } },
            { value: 'back', label: { zh: '背面', en: 'Back' } },
            { value: 'threeQuarter', label: { zh: '3/4侧面', en: '3/4' } },
            { value: 'profile', label: { zh: '侧脸', en: 'Profile' } },
            { value: 'lookingAway', label: { zh: '看向别处', en: 'Looking Away' } }
        ],
        lighting: [
            { value: 'none', label: { zh: '不指定', en: 'None' } },
            { value: 'natural', label: { zh: '自然光', en: 'Natural Light' } },
            { value: 'studio', label: { zh: '影棚光', en: 'Studio Light' } },
            { value: 'goldenHour', label: { zh: '黄金时刻', en: 'Golden Hour' } },
            { value: 'blueHour', label: { zh: '蓝色时刻', en: 'Blue Hour' } },
            { value: 'sunset', label: { zh: '日落', en: 'Sunset' } },
            { value: 'sunrise', label: { zh: '日出', en: 'Sunrise' } },
            { value: 'soft', label: { zh: '柔和', en: 'Soft' } },
            { value: 'harsh', label: { zh: '硬光', en: 'Harsh' } },
            { value: 'rim', label: { zh: '轮廓光', en: 'Rim Light' } },
            { value: 'backlight', label: { zh: '逆光', en: 'Backlight' } },
            { value: 'sideLight', label: { zh: '侧光', en: 'Side Light' } },
            { value: 'dramatic', label: { zh: '戏剧性', en: 'Dramatic' } },
            { value: 'ambient', label: { zh: '环境光', en: 'Ambient' } },
            { value: 'neon', label: { zh: '霓虹', en: 'Neon' } }
        ],
        lens: [
            { value: 'none', label: { zh: '不指定', en: 'None' } },
            { value: 'wideAngle', label: { zh: '广角', en: 'Wide Angle' } },
            { value: 'standard', label: { zh: '标准', en: 'Standard' } },
            { value: 'telephoto', label: { zh: '长焦', en: 'Telephoto' } },
            { value: 'macro', label: { zh: '微距', en: 'Macro' } },
            { value: 'fisheye', label: { zh: '鱼眼', en: 'Fisheye' } },
            { value: 'portrait', label: { zh: '人像', en: 'Portrait' } },
            { value: 'prime', label: { zh: '定焦', en: 'Prime' } },
            { value: 'zoom', label: { zh: '变焦', en: 'Zoom' } }
        ],
        camera: [
            { value: 'none', label: { zh: '不指定', en: 'None' } },
            { value: 'dslr', label: { zh: '单反', en: 'DSLR' } },
            { value: 'mirrorless', label: { zh: '无反', en: 'Mirrorless' } },
            { value: 'film', label: { zh: '胶片', en: 'Film' } },
            { value: 'instant', label: { zh: '拍立得', en: 'Instant' } },
            { value: 'mediumFormat', label: { zh: '中画幅', en: 'Medium Format' } },
            { value: 'largeFormat', label: { zh: '大画幅', en: 'Large Format' } },
            { value: 'vintage', label: { zh: '复古相机', en: 'Vintage' } }
        ],
        style: [
            { value: 'none', label: { zh: '不指定', en: 'None' } },
            { value: 'vintage', label: { zh: '复古', en: 'Vintage' } },
            { value: 'modern', label: { zh: '现代', en: 'Modern' } },
            { value: 'cinematic', label: { zh: '电影感', en: 'Cinematic' } },
            { value: 'documentary', label: { zh: '纪实', en: 'Documentary' } },
            { value: 'street', label: { zh: '街头', en: 'Street' } },
            { value: 'fashion', label: { zh: '时尚', en: 'Fashion' } },
            { value: 'editorial', label: { zh: '编辑', en: 'Editorial' } },
            { value: 'fineArt', label: { zh: '艺术', en: 'Fine Art' } },
            { value: 'minimalist', label: { zh: '极简', en: 'Minimalist' } },
            { value: 'dramatic', label: { zh: '戏剧性', en: 'Dramatic' } },
            { value: 'romantic', label: { zh: '浪漫', en: 'Romantic' } }
        ],
        timeOfDay: [
            { value: 'none', label: { zh: '不指定', en: 'None' } },
            { value: 'morning', label: { zh: '早晨', en: 'Morning' } },
            { value: 'noon', label: { zh: '正午', en: 'Noon' } },
            { value: 'afternoon', label: { zh: '下午', en: 'Afternoon' } },
            { value: 'evening', label: { zh: '傍晚', en: 'Evening' } },
            { value: 'night', label: { zh: '夜晚', en: 'Night' } },
            { value: 'dawn', label: { zh: '黎明', en: 'Dawn' } },
            { value: 'dusk', label: { zh: '黄昏', en: 'Dusk' } }
        ],
        weather: [
            { value: 'none', label: { zh: '不指定', en: 'None' } },
            { value: 'sunny', label: { zh: '晴天', en: 'Sunny' } },
            { value: 'cloudy', label: { zh: '多云', en: 'Cloudy' } },
            { value: 'rainy', label: { zh: '雨天', en: 'Rainy' } },
            { value: 'foggy', label: { zh: '雾天', en: 'Foggy' } },
            { value: 'snowy', label: { zh: '雪天', en: 'Snowy' } },
            { value: 'stormy', label: { zh: '暴风雨', en: 'Stormy' } },
            { value: 'windy', label: { zh: '大风', en: 'Windy' } },
            { value: 'overcast', label: { zh: '阴天', en: 'Overcast' } }
        ],
        depthOfField: [
            { value: 'none', label: { zh: '不指定', en: 'None' } },
            { value: 'shallow', label: { zh: '浅景深', en: 'Shallow' } },
            { value: 'deep', label: { zh: '深景深', en: 'Deep' } },
            { value: 'bokeh', label: { zh: '背景虚化', en: 'Bokeh' } }
        ],
        aperture: [
            { value: 'none', label: { zh: '不指定', en: 'None' } },
            { value: 'f1.2', label: { zh: 'f/1.2', en: 'f/1.2' } },
            { value: 'f1.4', label: { zh: 'f/1.4', en: 'f/1.4' } },
            { value: 'f1.8', label: { zh: 'f/1.8', en: 'f/1.8' } },
            { value: 'f2.0', label: { zh: 'f/2.0', en: 'f/2.0' } },
            { value: 'f2.8', label: { zh: 'f/2.8', en: 'f/2.8' } },
            { value: 'f4.0', label: { zh: 'f/4.0', en: 'f/4.0' } },
            { value: 'f5.6', label: { zh: 'f/5.6', en: 'f/5.6' } },
            { value: 'f8.0', label: { zh: 'f/8.0', en: 'f/8.0' } },
            { value: 'f11', label: { zh: 'f/11', en: 'f/11' } },
            { value: 'f16', label: { zh: 'f/16', en: 'f/16' } },
            { value: 'f22', label: { zh: 'f/22', en: 'f/22' } }
        ],
        iso: [
            { value: 'none', label: { zh: '不指定', en: 'None' } },
            { value: 'iso100', label: { zh: 'ISO 100', en: 'ISO 100' } },
            { value: 'iso200', label: { zh: 'ISO 200', en: 'ISO 200' } },
            { value: 'iso400', label: { zh: 'ISO 400', en: 'ISO 400' } },
            { value: 'iso800', label: { zh: 'ISO 800', en: 'ISO 800' } },
            { value: 'iso1600', label: { zh: 'ISO 1600', en: 'ISO 1600' } },
            { value: 'iso3200', label: { zh: 'ISO 3200', en: 'ISO 3200' } },
            { value: 'iso6400', label: { zh: 'ISO 6400', en: 'ISO 6400' } }
        ],
        colorTemperature: [
            { value: 'none', label: { zh: '不指定', en: 'None' } },
            { value: 'warm', label: { zh: '暖色', en: 'Warm' } },
            { value: 'cool', label: { zh: '冷色', en: 'Cool' } },
            { value: 'daylight', label: { zh: '日光', en: 'Daylight' } },
            { value: 'tungsten', label: { zh: '钨丝灯', en: 'Tungsten' } },
            { value: 'fluorescent', label: { zh: '荧光灯', en: 'Fluorescent' } }
        ],
        whiteBalance: [
            { value: 'none', label: { zh: '不指定', en: 'None' } },
            { value: 'auto', label: { zh: '自动', en: 'Auto' } },
            { value: 'daylight', label: { zh: '日光', en: 'Daylight' } },
            { value: 'tungsten', label: { zh: '钨丝灯', en: 'Tungsten' } },
            { value: 'fluorescent', label: { zh: '荧光灯', en: 'Fluorescent' } },
            { value: 'flash', label: { zh: '闪光灯', en: 'Flash' } },
            { value: 'cloudy', label: { zh: '阴天', en: 'Cloudy' } },
            { value: 'shade', label: { zh: '阴影', en: 'Shade' } }
        ],
        shutterSpeed: [
            { value: 'none', label: { zh: '不指定', en: 'None' } },
            { value: 'slow', label: { zh: '慢速', en: 'Slow' } },
            { value: 'fast', label: { zh: '快速', en: 'Fast' } },
            { value: 'freezing', label: { zh: '凝固', en: 'Freezing' } },
            { value: 'panning', label: { zh: '追焦', en: 'Panning' } }
        ]
    };

    // 加载上一次的设定
    const loadLastSettings = () => {
        try {
            const lastSettings = localStorage.getItem('hive_photo_prompt_last_settings');
            if (lastSettings) {
                return JSON.parse(lastSettings);
            }
        } catch (e) {
            console.warn('🐝 Hive: Failed to load last settings:', e);
        }
        return {
            location: 'none',
            person: 'none',
            age: 'none',
            gender: 'none',
            ethnicity: 'none',
            hairStyle: 'none',
            makeup: 'none',
            clothing: 'none',
            accessories: 'none',
            pose: 'none',
            orientation: 'none',
            lighting: 'none',
            lens: 'none',
            camera: 'none',
            style: 'none',
            timeOfDay: 'none',
            weather: 'none',
            depthOfField: 'none',
            aperture: 'none',
            iso: 'none',
            colorTemperature: 'none',
            whiteBalance: 'none',
            shutterSpeed: 'none'
        };
    };

    // 随机设定
    const getRandomSettings = () => {
        const getRandomValue = (options) => {
            const nonNoneOptions = options.filter(opt => opt.value !== 'none');
            if (nonNoneOptions.length === 0) return 'none';
            return nonNoneOptions[Math.floor(Math.random() * nonNoneOptions.length)].value;
        };
        
        return {
            location: getRandomValue(photoOptions.location),
            person: getRandomValue(photoOptions.person),
            age: getRandomValue(photoOptions.age),
            gender: getRandomValue(photoOptions.gender),
            ethnicity: getRandomValue(photoOptions.ethnicity),
            hairStyle: getRandomValue(photoOptions.hairStyle),
            makeup: getRandomValue(photoOptions.makeup),
            clothing: getRandomValue(photoOptions.clothing),
            accessories: getRandomValue(photoOptions.accessories),
            pose: getRandomValue(photoOptions.pose),
            orientation: getRandomValue(photoOptions.orientation),
            lighting: getRandomValue(photoOptions.lighting),
            lens: getRandomValue(photoOptions.lens),
            camera: getRandomValue(photoOptions.camera),
            style: getRandomValue(photoOptions.style),
            timeOfDay: getRandomValue(photoOptions.timeOfDay),
            weather: getRandomValue(photoOptions.weather),
            depthOfField: getRandomValue(photoOptions.depthOfField),
            aperture: getRandomValue(photoOptions.aperture),
            iso: getRandomValue(photoOptions.iso),
            colorTemperature: getRandomValue(photoOptions.colorTemperature),
            whiteBalance: getRandomValue(photoOptions.whiteBalance),
            shutterSpeed: getRandomValue(photoOptions.shutterSpeed)
        };
    };

    // 当前设定
    let currentSettings = loadLastSettings();

    // 创建弹窗
    const modal = document.createElement('div');
    modal.id = 'hive-photo-prompt-modal';
    
    // 生成参数选择UI（标题和选项在同一行）
    const generateParamSelect = (key, labelKey, options) => {
        const label = getText(`photoPrompt.${labelKey}`, labelKey);
        const currentValue = currentSettings[key] || 'none';
        
        let optionsHtml = '';
        options.forEach(opt => {
            const optLabel = isZh ? opt.label.zh : opt.label.en;
            optionsHtml += `<option value="${opt.value}" ${opt.value === currentValue ? 'selected' : ''}>${optLabel}</option>`;
        });
        
        return `
            <div style="
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 12px;
            ">
                <label style="
                    color: var(--input-text);
                    font-size: 14px;
                    font-weight: 500;
                    white-space: nowrap;
                    min-width: 60px;
                ">${label}:</label>
                <select class="hive-photo-param-${key}" style="
                    flex: 1;
                    padding: 6px 10px;
                    background-color: var(--comfy-input-bg);
                    border: 1px solid var(--border-color);
                    border-radius: 4px;
                    color: var(--input-text);
                    font-size: 14px;
                    cursor: pointer;
                    max-width: 200px;
                ">
                    ${optionsHtml}
                </select>
            </div>
        `;
    };

    modal.innerHTML = `
        <div class="hive-confirm-overlay" style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        ">
            <div class="hive-confirm-content" style="
                background-color: var(--comfy-menu-bg);
                border-radius: 8px;
                padding: 24px;
                max-width: 1200px;
                width: 90%;
                max-height: 90vh;
                overflow-y: auto;
                overflow-x: hidden;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            ">
                <div style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                    padding-bottom: 12px;
                    border-bottom: 1px solid var(--border-color);
                ">
                    <h3 style="
                        margin: 0;
                        color: var(--input-text);
                        font-size: 18px;
                    ">🐝 ${photoPromptText}</h3>
                    <button class="hive-photo-prompt-close" style="
                        background: none;
                        border: none;
                        color: var(--input-text);
                        font-size: 24px;
                        cursor: pointer;
                        padding: 0;
                        width: 30px;
                        height: 30px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    ">×</button>
                </div>
                
                <div style="
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 16px 20px;
                    margin-bottom: 20px;
                ">
                    ${generateParamSelect('location', 'location', photoOptions.location)}
                    ${generateParamSelect('person', 'person', photoOptions.person)}
                    ${generateParamSelect('age', 'age', photoOptions.age)}
                    ${generateParamSelect('gender', 'gender', photoOptions.gender)}
                    ${generateParamSelect('ethnicity', 'ethnicity', photoOptions.ethnicity)}
                    ${generateParamSelect('hairStyle', 'hairStyle', photoOptions.hairStyle)}
                    ${generateParamSelect('makeup', 'makeup', photoOptions.makeup)}
                    ${generateParamSelect('clothing', 'clothing', photoOptions.clothing)}
                    ${generateParamSelect('accessories', 'accessories', photoOptions.accessories)}
                    ${generateParamSelect('pose', 'pose', photoOptions.pose)}
                    ${generateParamSelect('orientation', 'orientation', photoOptions.orientation)}
                    ${generateParamSelect('lighting', 'lighting', photoOptions.lighting)}
                    ${generateParamSelect('lens', 'lens', photoOptions.lens)}
                    ${generateParamSelect('camera', 'camera', photoOptions.camera)}
                    ${generateParamSelect('style', 'style', photoOptions.style)}
                    ${generateParamSelect('timeOfDay', 'timeOfDay', photoOptions.timeOfDay)}
                    ${generateParamSelect('weather', 'weather', photoOptions.weather)}
                    ${generateParamSelect('depthOfField', 'depthOfField', photoOptions.depthOfField)}
                    ${generateParamSelect('aperture', 'aperture', photoOptions.aperture)}
                    ${generateParamSelect('iso', 'iso', photoOptions.iso)}
                    ${generateParamSelect('colorTemperature', 'colorTemperature', photoOptions.colorTemperature)}
                    ${generateParamSelect('whiteBalance', 'whiteBalance', photoOptions.whiteBalance)}
                    ${generateParamSelect('shutterSpeed', 'shutterSpeed', photoOptions.shutterSpeed)}
                </div>
                
                <div style="
                    display: flex;
                    gap: 8px;
                    margin-bottom: 20px;
                    flex-wrap: wrap;
                ">
                    <button class="hive-photo-prompt-generate" style="
                        padding: 10px 20px;
                        border-radius: 4px;
                        border: none;
                        background-color: #ffe066;
                        color: #000;
                        cursor: pointer;
                        font-weight: 500;
                        font-size: 14px;
                    ">${generatePromptText}</button>
                    <button class="hive-photo-prompt-reset" style="
                        padding: 10px 20px;
                        border-radius: 4px;
                        border: none;
                        background-color: var(--comfy-input-bg);
                        color: var(--input-text);
                        cursor: pointer;
                        font-weight: 500;
                        font-size: 14px;
                    ">${resetSettingsText}</button>
                    <button class="hive-photo-prompt-random" style="
                        padding: 10px 20px;
                        border-radius: 4px;
                        border: none;
                        background-color: var(--comfy-input-bg);
                        color: var(--input-text);
                        cursor: pointer;
                        font-weight: 500;
                        font-size: 14px;
                    ">${randomSettingsText}</button>
                    <button class="hive-photo-prompt-save-preset" style="
                        padding: 10px 20px;
                        border-radius: 4px;
                        border: none;
                        background-color: var(--comfy-input-bg);
                        color: var(--input-text);
                        cursor: pointer;
                        font-weight: 500;
                        font-size: 14px;
                    ">${savePresetText}</button>
                    <div style="
                        position: relative;
                        display: inline-block;
                    ">
                        <select class="hive-photo-prompt-load-preset" style="
                            padding: 10px 35px 10px 20px;
                            border-radius: 4px;
                            border: 1px solid var(--border-color);
                            background-color: var(--comfy-input-bg);
                            color: var(--input-text);
                            cursor: pointer;
                            font-weight: 500;
                            font-size: 14px;
                            appearance: none;
                            -webkit-appearance: none;
                            -moz-appearance: none;
                        ">
                            <option value="">${loadPresetText}</option>
                        </select>
                        <button class="hive-photo-prompt-delete-preset" style="
                            position: absolute;
                            right: 5px;
                            top: 50%;
                            transform: translateY(-50%);
                            background: none;
                            border: none;
                            color: var(--input-text);
                            cursor: pointer;
                            font-size: 16px;
                            font-weight: bold;
                            padding: 4px 8px;
                            display: none;
                            opacity: 0.7;
                            transition: opacity 0.2s;
                        " title="${deletePresetText}" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.7'">×</button>
                    </div>
                </div>
                
                <div class="hive-photo-prompt-content" style="
                    margin-bottom: 20px;
                    min-height: 0;
                ">
                    <div class="hive-photo-prompt-loading" style="
                        text-align: center;
                        padding: 40px;
                        color: var(--descrip-text);
                        display: none;
                    ">
                        ${generatingText}
                    </div>
                </div>
                
                <div style="
                    display: flex;
                    justify-content: flex-end;
                    gap: 12px;
                ">
                    <button class="hive-photo-prompt-close-btn" style="
                        padding: 8px 16px;
                        border-radius: 4px;
                        border: none;
                        background-color: var(--comfy-input-bg);
                        color: var(--input-text);
                        cursor: pointer;
                        font-weight: 500;
                        font-size: 14px;
                    ">${closeText}</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // 获取元素
    const closeBtn = modal.querySelector('.hive-photo-prompt-close');
    const closeBtn2 = modal.querySelector('.hive-photo-prompt-close-btn');
    const generateBtn = modal.querySelector('.hive-photo-prompt-generate');
    const resetBtn = modal.querySelector('.hive-photo-prompt-reset');
    const randomBtn = modal.querySelector('.hive-photo-prompt-random');
    const savePresetBtn = modal.querySelector('.hive-photo-prompt-save-preset');
    const deletePresetBtn = modal.querySelector('.hive-photo-prompt-delete-preset');
    const loadPresetSelect = modal.querySelector('.hive-photo-prompt-load-preset');
    const contentDiv = modal.querySelector('.hive-photo-prompt-content');
    const loadingDiv = modal.querySelector('.hive-photo-prompt-loading');
    const buttonContainer = modal.querySelector('.hive-photo-prompt-close-btn').parentElement;

    // 获取所有参数选择器
    const getCurrentParams = () => {
        const params = {};
        Object.keys(photoOptions).forEach(key => {
            const select = modal.querySelector(`.hive-photo-param-${key}`);
            if (select) {
                params[key] = select.value;
            }
        });
        return params;
    };

    // 更新参数选择器
    const updateParams = (settings) => {
        Object.keys(settings).forEach(key => {
            const select = modal.querySelector(`.hive-photo-param-${key}`);
            if (select) {
                select.value = settings[key] || 'none';
            }
        });
        currentSettings = { ...settings };
    };

    // 加载预设列表
    const loadPresetList = () => {
        try {
            const presets = JSON.parse(localStorage.getItem('hive_photo_prompt_presets') || '{}');
            loadPresetSelect.innerHTML = `<option value="">${loadPresetText}</option>`;
            Object.keys(presets).forEach(name => {
                const option = document.createElement('option');
                option.value = name;
                option.textContent = name;
                loadPresetSelect.appendChild(option);
            });
            // 更新删除按钮的显示状态
            deletePresetBtn.style.display = loadPresetSelect.value ? 'block' : 'none';
        } catch (e) {
            console.warn('🐝 Hive: Failed to load preset list:', e);
        }
    };

    // 保存预设（自定义弹窗）
    savePresetBtn.onclick = () => {
        const savePresetModal = document.createElement('div');
        savePresetModal.id = 'hive-save-preset-modal';
        savePresetModal.innerHTML = `
            <div class="hive-confirm-overlay" style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.7);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10001;
            ">
                <div class="hive-confirm-content" style="
                    background-color: var(--comfy-menu-bg);
                    border-radius: 8px;
                    padding: 24px;
                    max-width: 400px;
                    width: 90%;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                ">
                    <div style="
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 20px;
                        padding-bottom: 12px;
                        border-bottom: 1px solid var(--border-color);
                    ">
                        <h3 style="
                            margin: 0;
                            color: var(--input-text);
                            font-size: 18px;
                        ">${savePresetText}</h3>
                        <button class="hive-save-preset-close" style="
                            background: none;
                            border: none;
                            color: var(--input-text);
                            font-size: 24px;
                            cursor: pointer;
                            padding: 0;
                            width: 30px;
                            height: 30px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                        ">×</button>
                    </div>
                    <div style="margin-bottom: 20px;">
                        <label style="
                            display: block;
                            margin-bottom: 8px;
                            color: var(--input-text);
                            font-size: 14px;
                            font-weight: 500;
                        ">${presetNameText}</label>
                        <input type="text" class="hive-save-preset-input" style="
                            width: 100%;
                            padding: 8px 12px;
                            background-color: var(--comfy-input-bg);
                            border: 1px solid var(--border-color);
                            border-radius: 4px;
                            color: var(--input-text);
                            font-size: 14px;
                            box-sizing: border-box;
                        " placeholder="${enterPresetNameText}">
                    </div>
                    <div style="
                        display: flex;
                        justify-content: flex-end;
                        gap: 12px;
                    ">
                        <button class="hive-save-preset-cancel" style="
                            padding: 8px 16px;
                            border-radius: 4px;
                            border: none;
                            background-color: var(--comfy-input-bg);
                            color: var(--input-text);
                            cursor: pointer;
                            font-weight: 500;
                            font-size: 14px;
                        ">${getText('common.cancel', '取消')}</button>
                        <button class="hive-save-preset-confirm" style="
                            padding: 8px 16px;
                            border-radius: 4px;
                            border: none;
                            background-color: #ffe066;
                            color: #000;
                            cursor: pointer;
                            font-weight: 500;
                            font-size: 14px;
                        ">${getText('common.save', '保存')}</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(savePresetModal);
        
        const input = savePresetModal.querySelector('.hive-save-preset-input');
        const confirmBtn = savePresetModal.querySelector('.hive-save-preset-confirm');
        const cancelBtn = savePresetModal.querySelector('.hive-save-preset-cancel');
        const closeBtn = savePresetModal.querySelector('.hive-save-preset-close');
        
        const cleanup = () => {
            savePresetModal.remove();
        };
        
        confirmBtn.onclick = () => {
            const name = input.value.trim();
            if (name) {
                try {
                    const presets = JSON.parse(localStorage.getItem('hive_photo_prompt_presets') || '{}');
                    presets[name] = getCurrentParams();
                    localStorage.setItem('hive_photo_prompt_presets', JSON.stringify(presets));
                    window.showToast(presetSavedText, 'success');
                    loadPresetList();
                    cleanup();
                } catch (e) {
                    console.error('🐝 Hive: Failed to save preset:', e);
                    window.showToast('保存预设失败', 'error');
                }
            }
        };
        
        cancelBtn.onclick = cleanup;
        closeBtn.onclick = cleanup;
        
        // Enter键保存
        input.onkeydown = (e) => {
            if (e.key === 'Enter') {
                confirmBtn.click();
            }
        };
        
        // 聚焦输入框
        setTimeout(() => input.focus(), 100);
    };
    
    // 删除预设（自定义弹窗）
    deletePresetBtn.onclick = (e) => {
        e.stopPropagation(); // 阻止事件冒泡，避免触发select的change事件
        const presetName = loadPresetSelect.value;
        if (!presetName) {
            window.showToast(isZh ? '请先选择要删除的预设' : 'Please select a preset to delete', 'warning');
            return;
        }
        
        const deletePresetModal = document.createElement('div');
        deletePresetModal.id = 'hive-delete-preset-modal';
        deletePresetModal.innerHTML = `
            <div class="hive-confirm-overlay" style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.7);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10001;
            ">
                <div class="hive-confirm-content" style="
                    background-color: var(--comfy-menu-bg);
                    border-radius: 8px;
                    padding: 24px;
                    max-width: 400px;
                    width: 90%;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                ">
                    <div style="
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 20px;
                        padding-bottom: 12px;
                        border-bottom: 1px solid var(--border-color);
                    ">
                        <h3 style="
                            margin: 0;
                            color: var(--input-text);
                            font-size: 18px;
                        ">${deletePresetText}</h3>
                        <button class="hive-delete-preset-close" style="
                            background: none;
                            border: none;
                            color: var(--input-text);
                            font-size: 24px;
                            cursor: pointer;
                            padding: 0;
                            width: 30px;
                            height: 30px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                        ">×</button>
                    </div>
                    <div style="
                        margin-bottom: 20px;
                        color: var(--input-text);
                        font-size: 14px;
                        line-height: 1.6;
                    ">
                        ${confirmDeletePresetText.replace('{name}', presetName)}
                    </div>
                    <div style="
                        display: flex;
                        justify-content: flex-end;
                        gap: 12px;
                    ">
                        <button class="hive-delete-preset-cancel" style="
                            padding: 8px 16px;
                            border-radius: 4px;
                            border: none;
                            background-color: var(--comfy-input-bg);
                            color: var(--input-text);
                            cursor: pointer;
                            font-weight: 500;
                            font-size: 14px;
                        ">${getText('common.cancel', '取消')}</button>
                        <button class="hive-delete-preset-confirm" style="
                            padding: 8px 16px;
                            border-radius: 4px;
                            border: none;
                            background-color: #ff4444;
                            color: #fff;
                            cursor: pointer;
                            font-weight: 500;
                            font-size: 14px;
                        ">${getText('common.confirm', '确认')}</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(deletePresetModal);
        
        const confirmBtn = deletePresetModal.querySelector('.hive-delete-preset-confirm');
        const cancelBtn = deletePresetModal.querySelector('.hive-delete-preset-cancel');
        const closeBtn = deletePresetModal.querySelector('.hive-delete-preset-close');
        
        const cleanup = () => {
            deletePresetModal.remove();
        };
        
        confirmBtn.onclick = () => {
            try {
                const presets = JSON.parse(localStorage.getItem('hive_photo_prompt_presets') || '{}');
                delete presets[presetName];
                localStorage.setItem('hive_photo_prompt_presets', JSON.stringify(presets));
                window.showToast(presetDeletedText, 'success');
                loadPresetList();
                loadPresetSelect.value = '';
                deletePresetBtn.style.display = 'none';
                cleanup();
            } catch (e) {
                console.error('🐝 Hive: Failed to delete preset:', e);
                window.showToast('删除预设失败', 'error');
            }
        };
        
        cancelBtn.onclick = cleanup;
        closeBtn.onclick = cleanup;
    };

    // 加载预设
    loadPresetSelect.onchange = () => {
        const presetName = loadPresetSelect.value;
        // 更新删除按钮的显示状态
        deletePresetBtn.style.display = presetName ? 'block' : 'none';
        if (presetName) {
            try {
                const presets = JSON.parse(localStorage.getItem('hive_photo_prompt_presets') || '{}');
                if (presets[presetName]) {
                    updateParams(presets[presetName]);
                    window.showToast(presetLoadedText, 'success');
                }
            } catch (e) {
                console.error('🐝 Hive: Failed to load preset:', e);
                window.showToast('加载预设失败', 'error');
            }
        }
    };

    // 重置设定
    resetBtn.onclick = () => {
        updateParams({
            location: 'none',
            person: 'none',
            age: 'none',
            gender: 'none',
            ethnicity: 'none',
            hairStyle: 'none',
            makeup: 'none',
            clothing: 'none',
            accessories: 'none',
            pose: 'none',
            orientation: 'none',
            lighting: 'none',
            lens: 'none',
            camera: 'none',
            style: 'none',
            timeOfDay: 'none',
            weather: 'none',
            depthOfField: 'none',
            aperture: 'none',
            iso: 'none',
            colorTemperature: 'none',
            whiteBalance: 'none',
            shutterSpeed: 'none'
        });
    };

    // 随机设定
    randomBtn.onclick = () => {
        updateParams(getRandomSettings());
    };

    // 生成提示词
    generateBtn.onclick = async () => {
        const params = getCurrentParams();
        
        // 验证：至少选择一个参数
        const hasSelectedParam = Object.values(params).some(val => val !== 'none');
        if (!hasSelectedParam) {
            window.showToast(pleaseSelectParamsText, 'warning');
            return;
        }
        
        // 保存当前设定
        try {
            localStorage.setItem('hive_photo_prompt_last_settings', JSON.stringify(params));
        } catch (e) {
            console.warn('🐝 Hive: Failed to save last settings:', e);
        }
        
        // 清除之前的复制按钮（再次点击生成时清除）
        buttonContainer.innerHTML = '';
        const closeBtnTemp = document.createElement('button');
        closeBtnTemp.className = 'hive-photo-prompt-close-btn';
        closeBtnTemp.textContent = closeText;
        closeBtnTemp.style.cssText = `
            padding: 8px 16px;
            border-radius: 4px;
            border: none;
            background-color: var(--comfy-input-bg);
            color: var(--input-text);
            cursor: pointer;
            font-weight: 500;
            font-size: 14px;
        `;
        closeBtnTemp.onclick = cleanup;
        buttonContainer.appendChild(closeBtnTemp);
        
        // 显示加载状态
        loadingDiv.style.display = 'block';
        contentDiv.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--descrip-text);">${generatingText}</div>`;
        generateBtn.disabled = true;
        generateBtn.textContent = generatingText;
        
        try {
            const promptData = await generatePhotoPrompt(params, photoOptions);
            
            // 隐藏加载状态
            loadingDiv.style.display = 'none';
            
            // 显示生成的提示词
            const currentLang = getCurrentLanguage();
            const isZh = currentLang === 'zh';
            
            if (isZh && promptData.chinese) {
                contentDiv.innerHTML = `
                    <div style="margin-bottom: 16px;">
                        <div style="
                            margin-bottom: 8px;
                            color: var(--input-text);
                            font-weight: 500;
                            font-size: 14px;
                        ">${getText('contextMenu.englishPrompt', '英文提示词')}</div>
                        <div style="
                            padding: 16px;
                            background-color: var(--comfy-input-bg);
                            border-radius: 4px;
                            border: 1px solid var(--border-color);
                            color: var(--input-text);
                            font-size: 14px;
                            line-height: 1.6;
                            white-space: pre-wrap;
                            word-wrap: break-word;
                        ">${promptData.english}</div>
                    </div>
                    <div>
                        <div style="
                            margin-bottom: 8px;
                            color: var(--input-text);
                            font-weight: 500;
                            font-size: 14px;
                        ">${getText('contextMenu.chinesePrompt', '中文提示词')}</div>
                        <div style="
                            padding: 16px;
                            background-color: var(--comfy-input-bg);
                            border-radius: 4px;
                            border: 1px solid var(--border-color);
                            color: var(--input-text);
                            font-size: 14px;
                            line-height: 1.6;
                            white-space: pre-wrap;
                            word-wrap: break-word;
                        ">${promptData.chinese}</div>
                    </div>
                `;
            } else {
                contentDiv.innerHTML = `
                    <div style="
                        padding: 16px;
                        background-color: var(--comfy-input-bg);
                        border-radius: 4px;
                        border: 1px solid var(--border-color);
                        color: var(--input-text);
                        font-size: 14px;
                        line-height: 1.6;
                        white-space: pre-wrap;
                        word-wrap: break-word;
                    ">${promptData.english}</div>
                `;
            }
            
            // 设置复制按钮（参考随机提示词的方式）
            // 清空现有的复制按钮区域
            buttonContainer.innerHTML = '';
            
            if (isZh && promptData.chinese) {
                const copyEnglishBtn = document.createElement('button');
                copyEnglishBtn.className = 'hive-photo-prompt-copy';
                copyEnglishBtn.textContent = getText('contextMenu.copyEnglishPrompt', '复制英文提示词');
                copyEnglishBtn.style.cssText = `
                    padding: 8px 16px;
                    border-radius: 4px;
                    border: none;
                    background-color: #ffe066;
                    color: #000;
                    cursor: pointer;
                    font-weight: 500;
                    font-size: 14px;
                    margin-right: 8px;
                `;
                copyEnglishBtn.onclick = async () => {
                    try {
                        await navigator.clipboard.writeText(promptData.english);
                        window.showToast(promptCopiedText, 'success');
                    } catch (err) {
                        window.showToast(getText('common.copyFailed', '复制失败，请手动复制'), 'error');
                    }
                };
                
                const copyChineseBtn = document.createElement('button');
                copyChineseBtn.className = 'hive-photo-prompt-copy';
                copyChineseBtn.textContent = getText('contextMenu.copyChinesePrompt', '复制中文提示词');
                copyChineseBtn.style.cssText = `
                    padding: 8px 16px;
                    border-radius: 4px;
                    border: none;
                    background-color: #ffe066;
                    color: #000;
                    cursor: pointer;
                    font-weight: 500;
                    font-size: 14px;
                    margin-right: 8px;
                `;
                copyChineseBtn.onclick = async () => {
                    try {
                        await navigator.clipboard.writeText(promptData.chinese);
                        window.showToast(promptCopiedText, 'success');
                    } catch (err) {
                        window.showToast(getText('common.copyFailed', '复制失败，请手动复制'), 'error');
                    }
                };
                
                buttonContainer.appendChild(copyEnglishBtn);
                buttonContainer.appendChild(copyChineseBtn);
            } else {
                const copyBtn = document.createElement('button');
                copyBtn.className = 'hive-photo-prompt-copy';
                copyBtn.textContent = copyPromptText;
                copyBtn.style.cssText = `
                    padding: 8px 16px;
                    border-radius: 4px;
                    border: none;
                    background-color: #ffe066;
                    color: #000;
                    cursor: pointer;
                    font-weight: 500;
                    font-size: 14px;
                    margin-right: 8px;
                `;
                copyBtn.onclick = async () => {
                    try {
                        await navigator.clipboard.writeText(promptData.english);
                        window.showToast(promptCopiedText, 'success');
                    } catch (err) {
                        window.showToast(getText('common.copyFailed', '复制失败，请手动复制'), 'error');
                    }
                };
                buttonContainer.appendChild(copyBtn);
            }
            
            // 添加关闭按钮
            const closeBtn = document.createElement('button');
            closeBtn.className = 'hive-photo-prompt-close-btn';
            closeBtn.textContent = closeText;
            closeBtn.style.cssText = `
                padding: 8px 16px;
                border-radius: 4px;
                border: none;
                background-color: var(--comfy-input-bg);
                color: var(--input-text);
                cursor: pointer;
                font-weight: 500;
                font-size: 14px;
            `;
            closeBtn.onclick = cleanup;
            buttonContainer.appendChild(closeBtn);
        } catch (error) {
            console.error('🐝 Hive: Error generating photo prompt:', error);
            loadingDiv.style.display = 'none';
            const errorMessage = error.message || '未知错误';
            contentDiv.innerHTML = `
                <div style="
                    color: var(--descrip-text);
                    text-align: center;
                    padding: 20px;
                ">
                    <div style="margin-bottom: 12px; color: var(--input-text); font-weight: 500;">${generatePromptFailedText}</div>
                    <div style="font-size: 14px; line-height: 1.6; white-space: pre-wrap; word-wrap: break-word; color: var(--descrip-text); padding: 12px; background-color: var(--comfy-input-bg); border-radius: 4px; border: 1px solid var(--border-color);">${errorMessage}</div>
                </div>
            `;
        } finally {
            generateBtn.disabled = false;
            generateBtn.textContent = generatePromptText;
        }
    };

    // 关闭按钮
    const cleanup = () => {
        modal.remove();
    };
    closeBtn.onclick = cleanup;
    closeBtn2.onclick = cleanup;

    // Esc键关闭
    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            cleanup();
            document.removeEventListener('keydown', handleKeyDown);
        }
    };
    document.addEventListener('keydown', handleKeyDown);

    // 加载预设列表
    loadPresetList();
    
    // 初始化参数（加载上一次的设定）
    updateParams(currentSettings);
}

// 导出函数供全局使用
if (typeof window !== 'undefined') {
    window.showPhotoPromptModal = showPhotoPromptModal;
}





// 与AI对话功能（支持上下文关联）
async function sendAIChatMessage(message, conversationHistory = []) {
    try {
        // 获取大语言模型配置
        const provider = localStorage.getItem('hive_llm_provider') || '';
        const apiKey = localStorage.getItem('hive_llm_api_key') || '';
        const apiUrl = localStorage.getItem('hive_llm_api_url') || '';
        const model = localStorage.getItem('hive_llm_model') || '';

        if (!apiKey || !apiUrl || !model) {
            const errorMsg = getText('settings.pleaseConfigureLLM');
            throw new Error(errorMsg);
        }

        // 构建请求头
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        };

        // 限制历史记录最多10条（最新的10条）
        const limitedHistory = conversationHistory.slice(-10);
        
        // 构建消息列表（包含历史对话和当前消息）
        const messages = [...limitedHistory, { role: 'user', content: message }];

        // 构建请求体
        const requestBody = {
            model: model,
            messages: messages,
            temperature: 0.7,
            max_tokens: 2000,
            top_p: 0.9
        };

        // 智谱AI特殊处理
        if (provider === 'zhipu' || apiUrl.includes('bigmodel.cn')) {
            requestBody.thinking = { type: "disabled" };
        }

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            try {
                const errorText = await response.clone().text();
                if (errorText) {
                    try {
                        const errorData = JSON.parse(errorText);
                        if (errorData.error) {
                            if (typeof errorData.error === 'string') {
                                errorMessage = errorData.error;
                            } else if (errorData.error.message) {
                                errorMessage = errorData.error.message;
                            }
                        } else {
                            errorMessage = errorText.substring(0, 200);
                        }
                    } catch (e) {
                        errorMessage = errorText.substring(0, 200);
                    }
                }
            } catch (e) {
                // 忽略
            }
            throw new Error(errorMessage);
        }

        const data = await response.json();
        let content = data.choices?.[0]?.message?.content?.trim();
        const reasoningContent = data.choices?.[0]?.message?.reasoning_content?.trim();
        
        if (!content && reasoningContent) {
            content = reasoningContent;
        }
        
        if (!content) {
            throw new Error('No response from API');
        }

        return content;
    } catch (error) {
        console.error('🐝 Hive: Error sending AI chat message:', error);
        throw error;
    }
}

// 显示与AI对话弹窗
async function showAIChatModal() {
    // 移除现有的弹窗
    const existingModal = document.getElementById('hive-ai-chat-modal');
    if (existingModal) {
        existingModal.remove();
    }

    // 检查 大语言模型 API 密钥
    if (!(await checkLLMAPiKey())) return;

    const chatText = getText('contextMenu.aiChat', 'Hive 与AI对话');
    const placeholderText = getText('contextMenu.aiChatPlaceholder', '请输入您的问题...');
    const sendingText = getText('contextMenu.aiChatSending', '正在发送...');
    const failedText = getText('contextMenu.aiChatFailed', '对话失败：');
    const sendText = getText('contextMenu.aiChatSend', '发送');
    const closeText = getText('common.close', '关闭');

    // 创建弹窗
    const modal = document.createElement('div');
    modal.id = 'hive-ai-chat-modal';
    modal.innerHTML = `
        <div class="hive-confirm-overlay" style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        ">
            <div class="hive-confirm-content" style="
                background-color: var(--comfy-menu-bg);
                border-radius: 8px;
                padding: 24px;
                max-width: 700px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            ">
                <div style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                    padding-bottom: 12px;
                    border-bottom: 1px solid var(--border-color);
                ">
                    <h3 style="
                        margin: 0;
                        color: var(--input-text);
                        font-size: 18px;
                    ">🐝 ${chatText}</h3>
                    <button class="hive-ai-chat-close" style="
                        background: none;
                        border: none;
                        color: var(--input-text);
                        font-size: 24px;
                        cursor: pointer;
                        padding: 0;
                        width: 30px;
                        height: 30px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    ">×</button>
                </div>
                <div class="hive-ai-chat-content" style="
                    margin-bottom: 20px;
                    min-height: 200px;
                    max-height: 400px;
                    overflow-y: auto;
                    padding: 16px;
                    background-color: var(--comfy-input-bg);
                    border-radius: 4px;
                    border: 1px solid var(--border-color);
                    color: var(--input-text);
                    font-size: 14px;
                    line-height: 1.6;
                    white-space: pre-wrap;
                    word-wrap: break-word;
                "></div>
                <div style="
                    display: flex;
                    gap: 12px;
                    margin-bottom: 12px;
                ">
                    <input type="text" class="hive-ai-chat-input" placeholder="${placeholderText}" style="
                        flex: 1;
                        padding: 8px 12px;
                        border-radius: 4px;
                        border: 1px solid var(--border-color);
                        background-color: var(--comfy-input-bg);
                        color: var(--input-text);
                        font-size: 14px;
                    ">
                    <button class="hive-ai-chat-send" style="
                        padding: 8px 16px;
                        border-radius: 4px;
                        border: none;
                        background-color: #ffe066;
                        color: #000;
                        cursor: pointer;
                        font-weight: 500;
                        font-size: 14px;
                    ">${sendText}</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const closeBtn = modal.querySelector('.hive-ai-chat-close');
    const sendBtn = modal.querySelector('.hive-ai-chat-send');
    const inputEl = modal.querySelector('.hive-ai-chat-input');
    const contentDiv = modal.querySelector('.hive-ai-chat-content');
    const overlay = modal.querySelector('.hive-confirm-overlay');

    const cleanup = () => {
        modal.remove();
    };

    closeBtn.onclick = cleanup;
    // 移除底部关闭按钮，点击弹窗外的空白区域不关闭
    // closeBtn2.onclick = cleanup;
    // overlay.onclick = (e) => {
    //     if (e.target === overlay) {
    //         cleanup();
    //     }
    // };

    // Esc键关闭
    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            cleanup();
            document.removeEventListener('keydown', handleKeyDown);
        }
    };
    document.addEventListener('keydown', handleKeyDown);

    // 对话历史记录（只在本次对话中有效，不保存）
    let conversationHistory = [];

    // 获取当前语言
    const currentLang = getCurrentLanguage();
    const isZh = currentLang === 'zh';
    const userLabel = isZh ? '你' : 'You';
    const aiLabel = 'AI';

    // 发送消息
    const sendMessage = async () => {
        const message = inputEl.value.trim();
        if (!message) {
            return;
        }

        // 显示用户消息
        const userMsg = document.createElement('div');
        userMsg.style.cssText = `
            margin-bottom: 12px;
            padding: 8px 12px;
            background-color: var(--comfy-menu-bg);
            border-radius: 4px;
            color: var(--input-text);
        `;
        userMsg.textContent = `${userLabel}: ${message}`;
        contentDiv.appendChild(userMsg);
        contentDiv.scrollTop = contentDiv.scrollHeight;

        // 清空输入框
        inputEl.value = '';
        inputEl.disabled = true;
        sendBtn.disabled = true;
        sendBtn.textContent = sendingText;

        try {
            // 发送消息，传入对话历史以支持上下文关联（函数内部会添加当前消息）
            const response = await sendAIChatMessage(message, conversationHistory);
            
            // 添加到对话历史（用户消息和AI回复）
            conversationHistory.push({ role: 'user', content: message });
            conversationHistory.push({ role: 'assistant', content: response });
            
            // 限制历史记录最多10条（最新的10条）
            if (conversationHistory.length > 10) {
                conversationHistory = conversationHistory.slice(-10);
            }
            
            // 显示AI回复
            const aiMsg = document.createElement('div');
            aiMsg.style.cssText = `
                margin-bottom: 12px;
                padding: 8px 12px;
                background-color: var(--comfy-input-bg);
                border-radius: 4px;
                color: var(--input-text);
            `;
            aiMsg.textContent = `${aiLabel}: ${response}`;
            contentDiv.appendChild(aiMsg);
            contentDiv.scrollTop = contentDiv.scrollHeight;
        } catch (error) {
            const tryChangeModelText = getText('settings.tryChangeModel', '如果问题持续，您可以尝试更换模型后再试');
            const errorMsg = document.createElement('div');
            errorMsg.style.cssText = `
                margin-bottom: 12px;
                padding: 12px;
                background-color: rgba(255, 0, 0, 0.1);
                border-radius: 4px;
                color: var(--input-text);
            `;
            errorMsg.innerHTML = `
                <div style="margin-bottom: 8px;">${failedText}${error.message}</div>
                <div style="font-size: 12px; color: var(--descrip-text); padding-top: 8px; border-top: 1px solid rgba(255, 255, 255, 0.1);">💡 ${tryChangeModelText}</div>
            `;
            contentDiv.appendChild(errorMsg);
            contentDiv.scrollTop = contentDiv.scrollHeight;
        } finally {
            inputEl.disabled = false;
            sendBtn.disabled = false;
            sendBtn.textContent = sendText;
            inputEl.focus();
        }
    };

    sendBtn.onclick = sendMessage;
    inputEl.onkeydown = (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    };

    inputEl.focus();
};

// 导出函数供全局使用
if (typeof window !== 'undefined') {
    window.showAIChatModal = showAIChatModal;
}





// 翻译功能
async function translateText(text, sourceLang, targetLang) {
    try {
        // 获取大语言模型配置
        const provider = localStorage.getItem('hive_llm_provider') || '';
        const apiKey = localStorage.getItem('hive_llm_api_key') || '';
        const apiUrl = localStorage.getItem('hive_llm_api_url') || '';
        const model = localStorage.getItem('hive_llm_model') || '';

        if (!apiKey || !apiUrl || !model) {
            const errorMsg = getText('settings.pleaseConfigureLLM');
            throw new Error(errorMsg);
        }

        // 获取当前语言设置
        const currentLang = getCurrentLanguage();
        const isZh = currentLang === 'zh';

        // 构建提示词
        let systemPrompt, userPrompt;
        if (sourceLang === 'zh' && targetLang === 'en') {
            // 中文翻译成英文
            systemPrompt = `You are a professional translator. Please translate the user's Chinese text into English accurately and naturally.

Requirements:
- Maintain the original meaning and tone
- Use natural and fluent English
- Preserve any technical terms or proper nouns appropriately
- Return only the translated text, without any explanations or additional text`;
            userPrompt = `请将以下中文翻译成英文：\n\n${text}`;
        } else if (sourceLang === 'en' && targetLang === 'zh') {
            // 英文翻译成中文
            systemPrompt = `你是一位专业的翻译。请将用户的英文文本准确、自然地翻译成中文。

要求：
- 保持原文的意思和语气
- 使用自然流畅的中文
- 适当保留技术术语或专有名词
- 只返回翻译后的文本，不要有任何解释或额外文字`;
            userPrompt = `Please translate the following English text into Chinese:\n\n${text}`;
        } else {
            throw new Error('Invalid language combination');
        }

        // 构建请求头
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        };

        // 构建请求体
        const requestBody = {
            model: model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.7,
            max_tokens: 2000,
            top_p: 0.9
        };

        // 智谱AI特殊处理
        if (provider === 'zhipu' || apiUrl.includes('bigmodel.cn')) {
            requestBody.thinking = { type: "disabled" };
        }

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            try {
                const errorText = await response.clone().text();
                if (errorText) {
                    try {
                        const errorData = JSON.parse(errorText);
                        if (errorData.error) {
                            if (typeof errorData.error === 'string') {
                                errorMessage = errorData.error;
                            } else if (errorData.error.message) {
                                errorMessage = errorData.error.message;
                            }
                        } else {
                            errorMessage = errorText.substring(0, 200);
                        }
                    } catch (e) {
                        errorMessage = errorText.substring(0, 200);
                    }
                }
            } catch (e) {
                // 忽略
            }
            throw new Error(errorMessage);
        }

        const data = await response.json();
        let content = data.choices?.[0]?.message?.content?.trim();
        const reasoningContent = data.choices?.[0]?.message?.reasoning_content?.trim();
        
        if (!content && reasoningContent) {
            content = reasoningContent;
        }
        
        if (!content) {
            throw new Error('No response from API');
        }

        return content;
    } catch (error) {
        console.error('🐝 Hive: Error translating text:', error);
        throw error;
    }
}

// 显示翻译弹窗
async function showTranslateModal() {
    // 移除现有的弹窗
    const existingModal = document.getElementById('hive-translate-modal');
    if (existingModal) {
        existingModal.remove();
    }

    // 检查 大语言模型 API 密钥
    if (!(await checkLLMAPiKey())) return;

    // 获取当前语言，设置默认源语言和目标语言
    const currentLang = getCurrentLanguage();
    const defaultSourceLang = currentLang === 'zh' ? 'zh' : 'en';
    const defaultTargetLang = currentLang === 'zh' ? 'en' : 'zh';

    const translateTitle = getText('contextMenu.translate', 'Hive 翻译');
    const placeholderText = getText('contextMenu.translatePlaceholder', '请输入要翻译的文本...');
    const translatingText = getText('contextMenu.translating', '正在翻译...');
    const failedText = getText('contextMenu.translateFailed', '翻译失败：');
    const sendText = getText('contextMenu.translateSend', '翻译');
    const sourceLangText = getText('contextMenu.sourceLanguage', '源语言');
    const targetLangText = getText('contextMenu.targetLanguage', '目标语言');
    const chineseText = getText('contextMenu.chinese', '中文');
    const englishText = getText('contextMenu.english', '英文');

    // 创建弹窗
    const modal = document.createElement('div');
    modal.id = 'hive-translate-modal';
    modal.innerHTML = `
        <div class="hive-confirm-overlay" style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        ">
            <div class="hive-confirm-content" style="
                background-color: var(--comfy-menu-bg);
                border-radius: 8px;
                padding: 24px;
                max-width: 700px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            ">
                <div style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                    padding-bottom: 12px;
                    border-bottom: 1px solid var(--border-color);
                ">
                    <h3 style="
                        margin: 0;
                        color: var(--input-text);
                        font-size: 18px;
                    ">🐝 ${translateTitle}</h3>
                    <button class="hive-translate-close" style="
                        background: none;
                        border: none;
                        color: var(--input-text);
                        font-size: 24px;
                        cursor: pointer;
                        padding: 0;
                        width: 30px;
                        height: 30px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    ">×</button>
                </div>
                <div style="
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 16px;
                ">
                    <div style="
                        display: flex;
                        flex-direction: column;
                        gap: 4px;
                        flex: 1;
                    ">
                        <label style="
                            color: var(--input-text);
                            font-size: 12px;
                            font-weight: 500;
                        ">${sourceLangText}</label>
                        <select class="hive-translate-source-lang" style="
                            padding: 8px 12px;
                            border-radius: 4px;
                            border: 1px solid var(--border-color);
                            background-color: var(--comfy-input-bg);
                            color: var(--input-text);
                            font-size: 14px;
                        ">
                            <option value="zh" ${defaultSourceLang === 'zh' ? 'selected' : ''}>${chineseText}</option>
                            <option value="en" ${defaultSourceLang === 'en' ? 'selected' : ''}>${englishText}</option>
                        </select>
                    </div>
                    <button class="hive-translate-swap" style="
                        margin-top: 24px;
                        padding: 8px;
                        border-radius: 4px;
                        border: 1px solid var(--border-color);
                        background-color: var(--comfy-input-bg);
                        color: var(--input-text);
                        cursor: pointer;
                        font-size: 18px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        width: 36px;
                        height: 36px;
                    " title="交换语言">⇄</button>
                    <div style="
                        display: flex;
                        flex-direction: column;
                        gap: 4px;
                        flex: 1;
                    ">
                        <label style="
                            color: var(--input-text);
                            font-size: 12px;
                            font-weight: 500;
                        ">${targetLangText}</label>
                        <select class="hive-translate-target-lang" style="
                            padding: 8px 12px;
                            border-radius: 4px;
                            border: 1px solid var(--border-color);
                            background-color: var(--comfy-input-bg);
                            color: var(--input-text);
                            font-size: 14px;
                        ">
                            <option value="zh" ${defaultTargetLang === 'zh' ? 'selected' : ''}>${chineseText}</option>
                            <option value="en" ${defaultTargetLang === 'en' ? 'selected' : ''}>${englishText}</option>
                        </select>
                    </div>
                </div>
                <div class="hive-translate-content" style="
                    margin-bottom: 20px;
                    min-height: 200px;
                    max-height: 400px;
                    overflow-y: auto;
                    padding: 16px;
                    background-color: var(--comfy-input-bg);
                    border-radius: 4px;
                    border: 1px solid var(--border-color);
                    color: var(--input-text);
                    font-size: 14px;
                    line-height: 1.6;
                    white-space: pre-wrap;
                    word-wrap: break-word;
                "></div>
                <div class="hive-translate-buttons" style="
                    display: flex;
                    gap: 12px;
                    margin-bottom: 12px;
                    align-items: flex-end;
                ">
                    <textarea class="hive-translate-input" placeholder="${placeholderText}" style="
                        flex: 1;
                        padding: 8px 12px;
                        border-radius: 4px;
                        border: 1px solid var(--border-color);
                        background-color: var(--comfy-input-bg);
                        color: var(--input-text);
                        font-size: 14px;
                        resize: vertical;
                        min-height: 80px;
                        font-family: inherit;
                    "></textarea>
                    <button class="hive-translate-send" style="
                        padding: 8px 16px;
                        border-radius: 4px;
                        border: none;
                        background-color: #ffe066;
                        color: #000;
                        cursor: pointer;
                        font-weight: 500;
                        font-size: 14px;
                    ">${sendText}</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const closeBtn = modal.querySelector('.hive-translate-close');
    const sendBtn = modal.querySelector('.hive-translate-send');
    const inputEl = modal.querySelector('.hive-translate-input');
    const contentDiv = modal.querySelector('.hive-translate-content');
    const sourceLangSelect = modal.querySelector('.hive-translate-source-lang');
    const targetLangSelect = modal.querySelector('.hive-translate-target-lang');
    const swapBtn = modal.querySelector('.hive-translate-swap');
    const overlay = modal.querySelector('.hive-confirm-overlay');

    const cleanup = () => {
        modal.remove();
    };

    closeBtn.onclick = cleanup;
    // 移除底部关闭按钮，点击弹窗外的空白区域不关闭
    // overlay.onclick = (e) => {
    //     if (e.target === overlay) {
    //         cleanup();
    //     }
    // };

    // Esc键关闭
    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            cleanup();
            document.removeEventListener('keydown', handleKeyDown);
        }
    };
    document.addEventListener('keydown', handleKeyDown);

    // 交换语言
    swapBtn.onclick = () => {
        const temp = sourceLangSelect.value;
        sourceLangSelect.value = targetLangSelect.value;
        targetLangSelect.value = temp;
    };

    // 翻译文本
    const doTranslate = async () => {
        const text = inputEl.value.trim();
        if (!text) {
            return;
        }

        const sourceLang = sourceLangSelect.value;
        const targetLang = targetLangSelect.value;

        // 如果源语言和目标语言相同，提示用户
        if (sourceLang === targetLang) {
            window.showToast(getText('contextMenu.translateFailed', '翻译失败：') + '源语言和目标语言不能相同', 'warning');
            return;
        }

        // 移除之前的复制按钮（如果存在）
        const buttonsContainer = modal.querySelector('.hive-translate-buttons');
        const existingCopyBtn = buttonsContainer.querySelector('.hive-translate-copy');
        if (existingCopyBtn) {
            existingCopyBtn.remove();
        }

        // 显示加载状态
        contentDiv.textContent = translatingText;
        contentDiv.style.cssText = `
            margin-bottom: 20px;
            min-height: 200px;
            max-height: 400px;
            overflow-y: auto;
            padding: 16px;
            background-color: var(--comfy-input-bg);
            border-radius: 4px;
            border: 1px solid var(--border-color);
            color: var(--descrip-text);
            font-size: 14px;
            text-align: center;
        `;

        inputEl.disabled = true;
        sendBtn.disabled = true;
        sourceLangSelect.disabled = true;
        targetLangSelect.disabled = true;
        swapBtn.disabled = true;
        sendBtn.textContent = translatingText;

        try {
            const translatedText = await translateText(text, sourceLang, targetLang);
            
            // 显示翻译结果
            contentDiv.textContent = translatedText;
            contentDiv.style.cssText = `
                margin-bottom: 20px;
                min-height: 200px;
                max-height: 400px;
                overflow-y: auto;
                padding: 16px;
                background-color: var(--comfy-input-bg);
                border-radius: 4px;
                border: 1px solid var(--border-color);
                color: var(--input-text);
                font-size: 14px;
                line-height: 1.6;
                white-space: pre-wrap;
                word-wrap: break-word;
            `;
            
            // 添加复制按钮
            const copyBtn = document.createElement('button');
            copyBtn.className = 'hive-translate-copy';
            copyBtn.textContent = getText('contextMenu.copyResult', '复制结果');
            copyBtn.style.cssText = `
                padding: 8px 16px;
                border-radius: 4px;
                border: none;
                background-color: #ffe066;
                color: #000;
                cursor: pointer;
                font-weight: 500;
                font-size: 14px;
                margin-left: auto;
            `;
            copyBtn.onclick = async () => {
                try {
                    await navigator.clipboard.writeText(translatedText);
                    window.showToast(getText('contextMenu.promptCopied', '提示词已复制到剪贴板'), 'success');
                } catch (err) {
                    console.error('🐝 Hive: Failed to copy translation:', err);
                    window.showToast(getText('common.copyFailed', '复制失败，请手动复制'), 'error');
                }
            };
            
            // 将复制按钮添加到按钮容器中
            buttonsContainer.appendChild(copyBtn);
        } catch (error) {
            contentDiv.textContent = `${failedText}${error.message}`;
            contentDiv.style.cssText = `
                margin-bottom: 20px;
                min-height: 200px;
                max-height: 400px;
                overflow-y: auto;
                padding: 16px;
                background-color: var(--comfy-input-bg);
                border-radius: 4px;
                border: 1px solid var(--border-color);
                color: var(--input-text);
                font-size: 14px;
                text-align: center;
            `;
        } finally {
            inputEl.disabled = false;
            sendBtn.disabled = false;
            sourceLangSelect.disabled = false;
            targetLangSelect.disabled = false;
            swapBtn.disabled = false;
            sendBtn.textContent = sendText;
            inputEl.focus();
        }
    };

    sendBtn.onclick = doTranslate;
    inputEl.onkeydown = (e) => {
        // Ctrl+Enter 或 Cmd+Enter 发送
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            doTranslate();
        }
    };

    inputEl.focus();
};

// 导出函数供全局使用
if (typeof window !== 'undefined') {
    window.showTranslateModal = showTranslateModal;
}






// 提示词反推功能：使用视觉模型分析图片并生成提示词
async function generateReversePrompt(imageUrl) {
    try {
        // 获取视觉模型配置
        const visionProvider = localStorage.getItem('hive_vision_provider') || '';
        const visionApiKey = localStorage.getItem('hive_vision_api_key') || '';
        const visionApiUrl = localStorage.getItem('hive_vision_api_url') || '';
        const visionModel = localStorage.getItem('hive_vision_model') || '';

        // 如果没有配置，提示用户去设置界面配置
        if (!visionApiKey || !visionApiUrl || !visionModel) {
            const errorMsg = getText('settings.pleaseConfigureVision');
            throw new Error(errorMsg);
        }

        // 获取当前语言设置
        const currentLang = getCurrentLanguage();
        const isZh = currentLang === 'zh';

        // 构建提示词（参考随机提示词的规则）
        let systemPrompt, userPrompt;
        if (isZh) {
            // 中文用户：生成中英文提示词（JSON格式）
            systemPrompt = `你是专业的AI图像分析专家。请仔细分析用户提供的图片，只描述图片内容，生成一个详细、准确、专业的图像生成提示词。需要同时提供英文和中文两个版本。

要求：
- 英文提示词：100-200个单词，详细描述图片中的所有视觉元素（人物、物体、场景、构图、光线、风格、情绪、艺术元素等），适合Stable Diffusion等AI图像生成模型
- 中文提示词：与英文版本对应，保持相同的详细描述
- 必须准确反映图片的实际内容
- 专业且结构良好
- 专注于视觉细节和艺术质量
- 只描述图片内容，不要有任何解释、分析或推理过程

严格按JSON格式返回，不要有任何其他文字、解释或推理过程：
{
"english": "英文提示词",
"chinese": "中文提示词"
}

只返回JSON对象，不要有任何前缀、后缀或其他文本。必须包含"english"和"chinese"两个字段。`;
            userPrompt = `请分析这张图片，生成详细的图像生成提示词。必须同时提供英文和中文两个版本，严格按照以下JSON格式返回：
{
"english": "英文提示词内容",
"chinese": "中文提示词内容"
}

只返回JSON对象，不要有任何其他文字、解释或分析。`;
        } else {
            // 英文用户：只生成英文提示词（纯文本）
            systemPrompt = `You are a professional AI image analysis expert. Please carefully analyze the user-provided image and generate a detailed, accurate, and professional image generation prompt in English. Only describe the image content, do not provide any explanations or analysis.

Requirements:
- 100-200 words long
- Detailed description of all visual elements in the image (characters, objects, scenes, composition, lighting, style, mood, artistic elements, etc.)
- Suitable for AI image generation models like Stable Diffusion
- Must accurately reflect the actual content of the image
- Professional and well-structured
- Focus on visual details and artistic quality
- Only describe the image content, do not provide any explanations, analysis, or reasoning

Generate only the prompt text in English, without any explanations, additional text, or JSON format. Return the prompt as plain text.`;
            userPrompt = `Please only describe the content of this image and generate a detailed image generation prompt in English. Do not provide any explanations or analysis. Return only the prompt text.`;
        }

        // 将图片URL转换为base64（如果需要）
        let imageData = imageUrl;
        if (!imageUrl.startsWith('data:')) {
            // 如果不是base64，尝试获取图片并转换为base64
            try {
                const response = await fetch(imageUrl);
                const blob = await response.blob();
                const reader = new FileReader();
                imageData = await new Promise((resolve, reject) => {
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
            } catch (e) {
                console.warn('🐝 Hive: Failed to convert image to base64, using URL directly:', e);
            }
        }

        // 构建请求头
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${visionApiKey}`
        };

        // 根据不同的提供商构建请求体
        let requestBody = {
            model: visionModel,
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: userPrompt },
                        {
                            type: 'image_url',
                            image_url: {
                                url: imageData
                            }
                        }
                    ]
                }
            ]
        };

        // 所有提供商统一使用相同的参数（提示词反推不加thinking参数）
        requestBody = {
            model: visionModel,
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: userPrompt },
                        {
                            type: 'image_url',
                            image_url: {
                                url: imageData
                            }
                        }
                    ]
                }
            ],
            temperature: 0.7,
            max_tokens: 2000,
            top_p: 0.9
        };

        const response = await fetch(visionApiUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            // 获取详细的错误信息
            let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            try {
                const errorText = await response.clone().text();
                if (errorText) {
                    try {
                        const errorData = JSON.parse(errorText);
                        if (errorData.error) {
                            if (typeof errorData.error === 'string') {
                                errorMessage = errorData.error;
                            } else if (errorData.error.message) {
                                errorMessage = errorData.error.message;
                            } else if (errorData.error.code) {
                                errorMessage = `错误代码: ${errorData.error.code}${errorData.error.message ? ', ' + errorData.error.message : ''}`;
                            }
                        } else {
                            errorMessage = errorText.substring(0, 200);
                        }
                    } catch (e) {
                        errorMessage = errorText.substring(0, 200);
                    }
                }
            } catch (e) {
                // 如果无法读取错误响应，使用默认错误信息
            }
            
            // 根据状态码提供更详细的错误信息
            let detailedError = '';
            if (response.status === 401) {
                detailedError = 'API密钥无效或已过期。请检查API Key是否正确。';
            } else if (response.status === 403) {
                detailedError = 'API访问被拒绝。请检查API Key是否有权限访问该模型。';
            } else if (response.status === 429) {
                detailedError = 'API调用频率过高，已达到速率限制。请稍后再试。';
            } else if (response.status === 400) {
                detailedError = `请求参数错误: ${errorMessage}`;
            } else if (response.status >= 500) {
                detailedError = `服务器错误 (${response.status}): ${errorMessage}`;
            } else {
                detailedError = `API调用失败: ${errorMessage}`;
            }
            
            throw new Error(detailedError);
        }

        const data = await response.json();
        // 优先使用 content 字段
        let content = data.choices?.[0]?.message?.content?.trim();
        const reasoningContent = data.choices?.[0]?.message?.reasoning_content?.trim();
        const finishReason = data.choices?.[0]?.finish_reason;
        
        // 如果 content 为空，才尝试使用 reasoning_content
        if (!content && reasoningContent) {
            content = reasoningContent;
        }
        
        // 如果 finish_reason 是 "length"，说明内容被截断了
        if (finishReason === 'length' && content) {
            console.warn('🐝 Hive: Response was truncated due to max_tokens limit. Content may be incomplete.');
        }
        
        if (!content) {
            throw new Error('No prompt generated from API response');
        }

        // 解析返回的内容
        if (isZh) {
            // 中文用户：尝试解析JSON格式（中英文）
            try {
                const parsed = JSON.parse(content);
                if (parsed.english && parsed.chinese) {
                    return {
                        english: parsed.english,
                        chinese: parsed.chinese
                    };
                }
            } catch (e) {
                // 如果不是纯JSON，尝试从文本中提取JSON部分
                const jsonMatch = content.match(/\{[\s\S]*?"english"\s*:\s*"([^"]+)"[\s\S]*?"chinese"\s*:\s*"([^"]+)"[\s\S]*?\}/);
                if (jsonMatch) {
                    try {
                        let jsonStr = jsonMatch[0];
                        if (!jsonStr.endsWith('}')) {
                            const lastQuote = jsonStr.lastIndexOf('"');
                            if (lastQuote > 0) {
                                jsonStr = jsonStr.substring(0, lastQuote + 1) + '}';
                            }
                        }
                        const parsed = JSON.parse(jsonStr);
                        if (parsed.english && parsed.chinese) {
                            return {
                                english: parsed.english,
                                chinese: parsed.chinese
                            };
                        }
                    } catch (e2) {
                        const englishMatch = jsonMatch[0].match(/"english"\s*:\s*"([^"]+)"/);
                        const chineseMatch = jsonMatch[0].match(/"chinese"\s*:\s*"([^"]+)"/);
                        if (englishMatch && chineseMatch) {
                            return {
                                english: englishMatch[1],
                                chinese: chineseMatch[1]
                            };
                        }
                        console.warn('🐝 Hive: Failed to parse extracted JSON:', e2);
                    }
                }
                
                // 如果还是无法解析JSON，尝试从文本中提取英文和中文提示词
                let englishMatch = content.match(/"english"\s*:\s*"([^"]+)"/);
                let chineseMatch = content.match(/"chinese"\s*:\s*"([^"]+)"/);
                
                if (!englishMatch) {
                    const englishStart = content.search(/(?:英文提示词|English Prompt)[:：]\s*/);
                    if (englishStart >= 0) {
                        const afterColon = content.substring(englishStart);
                        const nextMarker = afterColon.search(/(?:中文提示词|Chinese Prompt)[:：]|$/);
                        if (nextMarker > 0) {
                            let englishText = afterColon.substring(afterColon.indexOf(':') + 1, nextMarker).trim();
                            englishText = englishText.replace(/^["""]|["""]$/g, '').trim();
                            if (englishText.length > 50) {
                                englishMatch = [null, englishText];
                            }
                        }
                    }
                }
                
                if (!chineseMatch) {
                    const chineseStart = content.search(/(?:中文提示词|Chinese Prompt)[:：]\s*/);
                    if (chineseStart >= 0) {
                        const afterColon = content.substring(chineseStart);
                        let chineseText = afterColon.substring(afterColon.indexOf(':') + 1).trim();
                        chineseText = chineseText.replace(/^["""]|["""]$/g, '').trim();
                        if (chineseText.length > 20) {
                            chineseMatch = [null, chineseText];
                        }
                    }
                }
                
                if (englishMatch && chineseMatch) {
                    const english = (englishMatch[1] || '').trim();
                    const chinese = (chineseMatch[1] || '').trim();
                    if (english && english.length > 50) {
                        return {
                            english: english,
                            chinese: chinese && chinese.length > 20 ? chinese : null
                        };
                    }
                }
                
                console.warn('🐝 Hive: Failed to parse JSON response, using content as English prompt');
            }
        }
        
        // 英文用户或解析失败：返回纯文本（英文提示词）
        return {
            english: content,
            chinese: null
        };
    } catch (error) {
        console.error('🐝 Hive: Error generating reverse prompt:', error);
        throw error;
    }
}

// 显示提示词反推弹层
// 将函数暴露到全局，以便在 beforeRegisterNodeDef 中访问
async function showReversePromptModal(imageUrl) {
    // 移除现有的弹层
    const existingModal = document.getElementById('hive-reverse-prompt-modal');
    if (existingModal) {
        existingModal.remove();
    }

    // 检查 大语言模型 API 密钥
    if (!(await checkVLMAPiKey())) return;

    const reversePromptText = getText('contextMenu.reversePrompt', 'Hive 提示词反推');
    const generatingText = getText('contextMenu.generatingReversePrompt', '正在分析图片并生成提示词...');
    const copyPromptText = getText('contextMenu.copyPrompt', '复制提示词');
    const promptCopiedText = getText('contextMenu.promptCopied', '提示词已复制到剪贴板');
    const reversePromptFailedText = getText('contextMenu.reversePromptFailed', '提示词反推失败：');
    const closeText = getText('common.close', '关闭');

    // 创建弹层
    const modal = document.createElement('div');
    modal.id = 'hive-reverse-prompt-modal';
    modal.innerHTML = `
        <div class="hive-confirm-overlay" style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        ">
            <div class="hive-confirm-content" style="
                background-color: var(--comfy-menu-bg);
                border-radius: 8px;
                padding: 24px;
                max-width: 700px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            ">
                <div style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                    padding-bottom: 12px;
                    border-bottom: 1px solid var(--border-color);
                ">
                    <h3 style="
                        margin: 0;
                        color: var(--input-text);
                        font-size: 18px;
                    ">🐝 ${reversePromptText}</h3>
                    <button class="hive-reverse-prompt-close" style="
                        background: none;
                        border: none;
                        color: var(--input-text);
                        font-size: 24px;
                        cursor: pointer;
                        padding: 0;
                        width: 30px;
                        height: 30px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    ">×</button>
                </div>
                <div class="hive-reverse-prompt-content" style="
                    margin-bottom: 20px;
                    min-height: 200px;
                ">
                    <div class="hive-reverse-prompt-loading" style="
                        text-align: center;
                        padding: 40px;
                        color: var(--descrip-text);
                    ">
                        ${generatingText}
                    </div>
                </div>
                <div style="
                    display: flex;
                    justify-content: flex-end;
                    gap: 12px;
                ">
                    <button class="hive-reverse-prompt-copy" style="
                        padding: 8px 16px;
                        border-radius: 4px;
                        border: none;
                        background-color: #ffe066;
                        color: #000;
                        cursor: pointer;
                        font-weight: 500;
                        font-size: 14px;
                        display: none;
                    ">${copyPromptText}</button>
                    <button class="hive-reverse-prompt-close-btn" style="
                        padding: 8px 16px;
                        border-radius: 4px;
                        border: none;
                        background-color: var(--comfy-input-bg);
                        color: var(--input-text);
                        cursor: pointer;
                        font-weight: 500;
                        font-size: 14px;
                    ">${closeText}</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const closeBtn = modal.querySelector('.hive-reverse-prompt-close');
    const closeBtn2 = modal.querySelector('.hive-reverse-prompt-close-btn');
    const copyBtn = modal.querySelector('.hive-reverse-prompt-copy');
    const overlay = modal.querySelector('.hive-confirm-overlay');
    const contentDiv = modal.querySelector('.hive-reverse-prompt-content');
    const loadingDiv = modal.querySelector('.hive-reverse-prompt-loading');

    let generatedPrompt = null;

    const cleanup = () => {
        modal.remove();
    };

    // 关闭按钮
    closeBtn.onclick = cleanup;
    closeBtn2.onclick = cleanup;

    // 移除底部关闭按钮，点击弹窗外的空白区域不关闭
    // overlay.onclick = (e) => {
    //     if (e.target === overlay) {
    //         cleanup();
    //     }
    // };

    // 设置复制按钮（根据语言显示不同的复制按钮）
    const setupCopyButtons = (promptData) => {
        const currentLang = getCurrentLanguage();
        const isZh = currentLang === 'zh';
        
        // 清空现有的复制按钮区域
        const buttonContainer = modal.querySelector('.hive-reverse-prompt-close-btn').parentElement;
        buttonContainer.innerHTML = '';
        
        if (isZh && promptData.chinese) {
            // 中文用户且有中文提示词：显示两个复制按钮
            const copyEnglishBtn = document.createElement('button');
            copyEnglishBtn.className = 'hive-reverse-prompt-copy-english';
            copyEnglishBtn.textContent = getText('contextMenu.copyEnglishPrompt', '复制英文提示词');
            copyEnglishBtn.style.cssText = `
                padding: 8px 16px;
                border-radius: 4px;
                border: none;
                background-color: #ffe066;
                color: #000;
                cursor: pointer;
                font-weight: 500;
                font-size: 14px;
                margin-right: 8px;
            `;
            copyEnglishBtn.onclick = async () => {
                try {
                    await navigator.clipboard.writeText(promptData.english);
                    window.showToast(promptCopiedText, 'success');
                } catch (err) {
                    console.error('🐝 Hive: Failed to copy English prompt:', err);
                    window.showToast(getText('common.copyFailed', '复制失败，请手动复制'), 'error');
                }
            };
            
            const copyChineseBtn = document.createElement('button');
            copyChineseBtn.className = 'hive-reverse-prompt-copy-chinese';
            copyChineseBtn.textContent = getText('contextMenu.copyChinesePrompt', '复制中文提示词');
            copyChineseBtn.style.cssText = `
                padding: 8px 16px;
                border-radius: 4px;
                border: none;
                background-color: #ffe066;
                color: #000;
                cursor: pointer;
                font-weight: 500;
                font-size: 14px;
                margin-right: 8px;
            `;
            copyChineseBtn.onclick = async () => {
                try {
                    await navigator.clipboard.writeText(promptData.chinese);
                    window.showToast(promptCopiedText, 'success');
                } catch (err) {
                    console.error('🐝 Hive: Failed to copy Chinese prompt:', err);
                    window.showToast(getText('common.copyFailed', '复制失败，请手动复制'), 'error');
                }
            };
            
            buttonContainer.appendChild(copyEnglishBtn);
            buttonContainer.appendChild(copyChineseBtn);
        } else {
            // 英文用户或只有英文提示词：显示一个复制按钮
            const singleCopyBtn = document.createElement('button');
            singleCopyBtn.className = 'hive-reverse-prompt-copy';
            singleCopyBtn.textContent = copyPromptText;
            singleCopyBtn.style.cssText = `
                padding: 8px 16px;
                border-radius: 4px;
                border: none;
                background-color: #ffe066;
                color: #000;
                cursor: pointer;
                font-weight: 500;
                font-size: 14px;
                margin-right: 8px;
            `;
            singleCopyBtn.onclick = async () => {
                try {
                    await navigator.clipboard.writeText(promptData.english);
                    window.showToast(promptCopiedText, 'success');
                } catch (err) {
                    console.error('🐝 Hive: Failed to copy prompt:', err);
                    window.showToast(getText('common.copyFailed', '复制失败，请手动复制'), 'error');
                }
            };
            
            buttonContainer.appendChild(singleCopyBtn);
        }
        
        // 添加关闭按钮
        const closeBtn = document.createElement('button');
        closeBtn.className = 'hive-reverse-prompt-close-btn';
        closeBtn.textContent = closeText;
        closeBtn.style.cssText = `
            padding: 8px 16px;
            border-radius: 4px;
            border: none;
            background-color: var(--comfy-input-bg);
            color: var(--input-text);
            cursor: pointer;
            font-weight: 500;
            font-size: 14px;
        `;
        closeBtn.onclick = cleanup;
        buttonContainer.appendChild(closeBtn);
    };

    // Esc键关闭
    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            cleanup();
            document.removeEventListener('keydown', handleKeyDown);
        }
    };
    document.addEventListener('keydown', handleKeyDown);

    // 生成提示词
    try {
        generatedPrompt = await generateReversePrompt(imageUrl);
        
        // 隐藏加载提示，显示生成的提示词
        loadingDiv.style.display = 'none';
        
        const currentLang = getCurrentLanguage();
        const isZh = currentLang === 'zh';
        
        if (isZh && generatedPrompt.chinese) {
            // 中文用户且有中文提示词：显示两个提示词框
            contentDiv.innerHTML = `
                <div style="margin-bottom: 16px;">
                    <div style="
                        margin-bottom: 8px;
                        color: var(--input-text);
                        font-weight: 500;
                        font-size: 14px;
                    ">${getText('contextMenu.englishPrompt', '英文提示词')}</div>
                    <div style="
                        padding: 16px;
                        background-color: var(--comfy-input-bg);
                        border-radius: 4px;
                        border: 1px solid var(--border-color);
                        color: var(--input-text);
                        font-size: 14px;
                        line-height: 1.6;
                        white-space: pre-wrap;
                        word-wrap: break-word;
                    ">${generatedPrompt.english}</div>
                </div>
                <div>
                    <div style="
                        margin-bottom: 8px;
                        color: var(--input-text);
                        font-weight: 500;
                        font-size: 14px;
                    ">${getText('contextMenu.chinesePrompt', '中文提示词')}</div>
                    <div style="
                        padding: 16px;
                        background-color: var(--comfy-input-bg);
                        border-radius: 4px;
                        border: 1px solid var(--border-color);
                        color: var(--input-text);
                        font-size: 14px;
                        line-height: 1.6;
                        white-space: pre-wrap;
                        word-wrap: break-word;
                    ">${generatedPrompt.chinese}</div>
                </div>
            `;
        } else {
            // 英文用户或只有英文提示词：只显示英文提示词
            contentDiv.innerHTML = `
                <div style="
                    padding: 16px;
                    background-color: var(--comfy-input-bg);
                    border-radius: 4px;
                    border: 1px solid var(--border-color);
                    color: var(--input-text);
                    font-size: 14px;
                    line-height: 1.6;
                    white-space: pre-wrap;
                    word-wrap: break-word;
                ">${generatedPrompt.english}</div>
            `;
        }
        
        // 设置复制按钮
        setupCopyButtons(generatedPrompt);
    } catch (error) {
        console.error('🐝 Hive: Error generating reverse prompt:', error);
        // 显示详细的错误信息
        let errorMessage = error.message || '未知错误';
        // 如果是API未配置的错误，显示配置提示
        if (errorMessage.includes('请先在设置界面配置') || errorMessage.includes('API未配置')) {
            const pleaseConfigureText = getText('settings.pleaseConfigureLLM', 
                '请先在设置界面配置视觉模型API。\n\n操作步骤：\n1. 点击侧边栏的设置按钮\n2. 点击"配置大模型API"按钮\n3. 在"视觉模型API配置"中选择提供商并填写API Key\n4. 选择模型后保存配置');
            loadingDiv.innerHTML = `
                <div style="
                    color: var(--descrip-text);
                    text-align: center;
                ">
                    <div style="margin-bottom: 12px; color: var(--input-text); font-weight: 500;">${reversePromptFailedText}</div>
                    <div style="font-size: 14px; line-height: 1.6; white-space: pre-line; color: var(--descrip-text);">${pleaseConfigureText}</div>
                </div>
            `;
        } else {
            // 显示详细的错误信息
            const tryChangeModelText = getText('settings.tryChangeModel', '如果问题持续，您可以尝试更换模型后再试');
            loadingDiv.innerHTML = `
                <div style="
                    color: var(--descrip-text);
                    text-align: center;
                ">
                    <div style="margin-bottom: 12px; color: var(--input-text); font-weight: 500;">${reversePromptFailedText}</div>
                    <div style="font-size: 14px; line-height: 1.6; white-space: pre-wrap; word-wrap: break-word; color: var(--descrip-text); padding: 12px; background-color: var(--comfy-input-bg); border-radius: 4px; border: 1px solid var(--border-color); margin-bottom: 12px;">${errorMessage}</div>
                    <div style="font-size: 13px; line-height: 1.6; color: var(--descrip-text); padding: 8px 12px; background-color: var(--comfy-menu-bg); border-radius: 4px; border: 1px solid var(--border-color);">💡 ${tryChangeModelText}</div>
                </div>
            `;
        }
    }
}

// 导出函数供全局使用
if (typeof window !== 'undefined') {
    window.showReversePromptModal = showReversePromptModal;
}




// 修复节点的函数
async function fixNodeWithHive(node) {
    try {
        const nodeType = node.type || node.comfyClass;
        if (!nodeType) {
            if (typeof window.showToast === 'function') {
                window.showToast(getText('toast.nodeExecuteFailed', 'Failed to execute node'), 'error');
            }
            return;
        }

        // 打印节点名称到控制台
        console.log('🐝 Hive: 要修复的节点名称:', nodeType);

        // 使用 searchNodeByClassMapping 搜索节点
        const searchNodeByClassMapping = window.hiveSearchNodeByClassMapping;
        if (!searchNodeByClassMapping) {
            if (typeof window.showToast === 'function') {
                window.showToast(getText('toast.nodeExecuteFailed', 'Failed to execute node'), 'error');
            }
            return;
        }

        // 搜索节点
        const libraryItem = await searchNodeByClassMapping(nodeType);
        if (!libraryItem) {
            const notFoundText = getText('toast.nodeUrlNotFound', 'Node installation URL not found');
            if (typeof window.showToast === 'function') {
                window.showToast(notFoundText, 'warning');
            }
            return;
        }

        // 获取节点安装URL
        const nodeLinks = libraryItem.extra?.node_links || [];
        if (!nodeLinks || nodeLinks.length === 0) {
            const notFoundText = getText('toast.nodeUrlNotFound', 'Node installation URL not found');
            if (typeof window.showToast === 'function') {
                window.showToast(notFoundText, 'error');
            }
            return;
        }

        // 显示选择弹层，让用户选择 node_link
        const selectedLink = await showNodeLinkSelector(nodeType, nodeLinks);
        
        // 如果用户取消了选择或没有选择，直接返回
        if (!selectedLink || !selectedLink.url) {
            return;
        }

        // 创建包含特定 node_link 的库项对象
        const itemWithLink = { 
            ...libraryItem,
            extra: {
                ...(libraryItem.extra || {}),
                node_links: [selectedLink] // 只包含用户选择的链接
            }
        };

        // 调用安装函数
        if (typeof window.handleInspirationInstallNode === 'function') {
            await window.handleInspirationInstallNode(itemWithLink, selectedLink.url);
        } else {
            console.error('🐝 Hive: handleInspirationInstallNode function not found');
        }
    } catch (error) {
        console.error('🐝 Hive: Error fixing node with Hive:', error);
        const errorText = getText('toast.nodeInstallFailed', 'Failed to install node: ');
        if (typeof window.showToast === 'function') {
            window.showToast(errorText + error.message, 'error');
        }
    }
};

// 显示节点链接选择弹层
async function showNodeLinkSelector(nodeName, nodeLinks) {
    return new Promise((resolve) => {
        // 移除现有的选择弹层
        const existingModal = document.getElementById('hive-node-link-selector-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // 获取翻译文本
        const selectNodeLinkText = getText('contextMenu.selectNodeLink');
        const nodeNameText = getText('contextMenu.nodeName');
        const installAddressText = getText('contextMenu.installAddress');
        const noNodeLinksText = getText('contextMenu.noNodeLinks');
        const closeText = getText('common.close', 'Close');
        const installText = getText('missingItems.install', 'Install');

        // 创建弹层
        const modal = document.createElement('div');
        modal.id = 'hive-node-link-selector-modal';
        
        // 构建节点链接列表HTML
        let nodeLinksHTML = '';
        if (!nodeLinks || nodeLinks.length === 0) {
            nodeLinksHTML = `<div style="padding: 20px; text-align: center; color: var(--descrip-text);">${noNodeLinksText}</div>`;
        } else {
            nodeLinksHTML = nodeLinks.map((link, index) => {
                const label = link.label || installText;
                const url = link.url || '';
                return `
                    <div class="hive-node-link-item" data-index="${index}" style="
                        padding: 12px;
                        margin: 8px 0;
                        border: 1px solid var(--border-color);
                        border-radius: 4px;
                        cursor: pointer;
                        background-color: var(--comfy-input-bg);
                        transition: background-color 0.2s;
                    ">
                        <div style="font-weight: 500; margin-bottom: 4px; color: var(--input-text);">${label}</div>
                        <div style="font-size: 12px; color: var(--descrip-text); word-break: break-all;">${url}</div>
                    </div>
                `;
            }).join('');
        }

        modal.innerHTML = `
            <div class="hive-confirm-overlay" style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.7);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
            ">
                <div class="hive-confirm-content" style="
                    background-color: var(--comfy-menu-bg);
                    border-radius: 8px;
                    padding: 24px;
                    max-width: 600px;
                    width: 90%;
                    max-height: 80vh;
                    overflow-y: auto;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                ">
                    <div style="
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 20px;
                        padding-bottom: 12px;
                        border-bottom: 1px solid var(--border-color);
                    ">
                        <h3 style="
                            margin: 0;
                            color: var(--input-text);
                            font-size: 18px;
                        ">${selectNodeLinkText}</h3>
                        <button class="hive-node-link-close" style="
                            background: none;
                            border: none;
                            color: var(--input-text);
                            font-size: 24px;
                            cursor: pointer;
                            padding: 0;
                            width: 30px;
                            height: 30px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                        ">×</button>
                    </div>
                    <div style="margin-bottom: 16px;">
                        <div style="
                            font-size: 14px;
                            color: var(--descrip-text);
                            margin-bottom: 8px;
                        ">${nodeNameText}: <span style="color: var(--input-text); font-weight: 500;">${nodeName}</span></div>
                    </div>
                    <div style="margin-bottom: 20px;">
                        <div style="
                            font-size: 14px;
                            color: var(--descrip-text);
                            margin-bottom: 12px;
                        ">${installAddressText}:</div>
                        <div class="hive-node-links-list">
                            ${nodeLinksHTML}
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // 绑定事件
        const closeBtn = modal.querySelector('.hive-node-link-close');
        const overlay = modal.querySelector('.hive-confirm-overlay');
        const linkItems = modal.querySelectorAll('.hive-node-link-item');

        const cleanup = () => {
            modal.remove();
        };

        // 关闭按钮
        closeBtn.onclick = () => {
            cleanup();
            resolve(null);
        };

        // 点击遮罩层关闭
        overlay.onclick = (e) => {
            if (e.target === overlay) {
                cleanup();
                resolve(null);
            }
        };

        // 点击节点链接项
        linkItems.forEach((item) => {
            item.onmouseenter = () => {
                item.style.backgroundColor = 'var(--comfy-input-bg)';
                item.style.borderColor = 'var(--input-text)';
            };
            item.onmouseleave = () => {
                item.style.backgroundColor = 'var(--comfy-input-bg)';
                item.style.borderColor = 'var(--border-color)';
            };
            item.onclick = () => {
                const index = parseInt(item.dataset.index);
                cleanup();
                resolve(nodeLinks[index]);
            };
        });

        // Esc键关闭
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                cleanup();
                resolve(null);
                document.removeEventListener('keydown', handleKeyDown);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
    });
};


// 导出函数供全局使用
if (typeof window !== 'undefined') {
    window.fixNodeWithHive = fixNodeWithHive;
}