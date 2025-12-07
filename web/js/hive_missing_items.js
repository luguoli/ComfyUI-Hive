// web/js/hive_missing_items.js - 检测ComfyUI缺少模型/节点提示并增强

import { searchInspiration, getSupabase } from './hive_data.js';
import { showToast } from './hive_ui.js';

/**
 * 确保 Supabase 已初始化（如果未初始化，尝试初始化）
 */
async function ensureSupabaseInitialized() {
    try {
        // 先尝试一个简单的搜索来检查 Supabase 是否已初始化
        try {
            await searchInspiration({
                category: 'model',
                keyword: '__test_init_check__',
                page: 1,
                pageSize: 1,
                sort: 'latest'
            });
            // 如果没有抛出错误，说明已初始化
            return true;
        } catch (error) {
            // 检查错误是否是"尚未初始化"
            const errorMsg = error.message || '';
            const isNotInitialized = errorMsg.includes('尚未初始化') || 
                                     errorMsg.includes('not initialized') || 
                                     errorMsg.includes('Supabase 尚未初始化');
            
            if (isNotInitialized) {
                // 尝试调用 window.initializeHive() 来初始化
                if (typeof window !== 'undefined' && typeof window.initializeHive === 'function') {
                    try {
                        await window.initializeHive();
                        return true;
                    } catch (initError) {
                        console.error('🐝 Hive: Failed to initialize Supabase via initializeHive():', initError);
                        return false;
                    }
                } else {
                    console.warn('🐝 Hive: window.initializeHive() is not available');
                    return false;
                }
            } else {
                // 其他错误，可能是查询错误，但不一定是未初始化
                // 如果错误不是"未初始化"，我们认为 Supabase 可能已经初始化了
                console.warn('🐝 Hive: Search error (may be already initialized):', errorMsg);
                return true;
            }
        }
    } catch (error) {
        console.error('🐝 Hive: Error ensuring Supabase initialization:', error);
        return false;
    }
}

/**
 * 通过 class_name 搜索节点（备用方案：直接查询）
 * 当 RPC 函数不可用时使用
 * @param {string} className - 节点类名
 * @returns {Promise<Object|null>} 找到的项，如果未找到返回null
 */
async function searchNodeByClassMappingFallback(className) {
    try {
        const supabase = getSupabase();
        if (!supabase) {
            console.warn('🐝 Hive: Supabase not available for node search');
            return null;
        }


        // 步骤1: 在 node_class_mappings 表中搜索 class_name（忽略大小写完全匹配）
        // 注意：Supabase JS 客户端不支持 lower() 函数，所以使用 ilike 进行精确匹配（不包含通配符）
        const trimmedClassName = className.trim();
        const { data: mappings, error: mappingError } = await supabase
            .from('node_class_mappings')
            .select('node_name, class_name')
            .ilike('class_name', trimmedClassName);

        if (mappingError) {
            console.error('🐝 Hive: Error querying node_class_mappings:', mappingError);
            return null;
        }

        if (!mappings || mappings.length === 0) {
            return null;
        }

        // 步骤2: 对于每个找到的 node_name，在 inspiration_items 表中搜索
        // category固定为'node'，keyword_text字段对应 node_name（忽略大小写完全匹配）
        // 注意：这里应该使用 node_name，而不是 class_name！
        for (const mapping of mappings) {
            const nodeName = mapping.node_name;
            const classNameFromMapping = mapping.class_name;


            // 在 inspiration_items 表中搜索
            // category固定为'node'，keyword_text字段对应 node_name（忽略大小写完全匹配）
            // 注意：使用 ilike 进行精确匹配（不包含通配符），ilike 会自动忽略大小写
            const trimmedNodeName = nodeName.trim();
            const { data: inspirationItems, error: itemsError } = await supabase
                .from('inspiration_items')
                .select('*')
                .eq('category', 'node')
                .ilike('keyword_text', trimmedNodeName);

            if (itemsError) {
                console.warn(`🐝 Hive: Error querying inspiration_items for node_name "${nodeName}":`, itemsError);
                continue;
            }

            if (!inspirationItems || inspirationItems.length === 0) {
                continue;
            }

            // 步骤3: 获取对应的 inspiration_node_links 表的数据
            for (const item of inspirationItems) {
                const itemId = item.id;

                // 查询 inspiration_node_links 表
                const { data: nodeLinks, error: linksError } = await supabase
                    .from('inspiration_node_links')
                    .select('*')
                    .eq('inspiration_item_id', itemId);

                if (linksError) {
                    console.warn(`🐝 Hive: Error querying inspiration_node_links for item_id "${itemId}":`, linksError);
                    continue;
                }

                // 构建返回对象，包含节点链接信息
                const result = {
                    ...item,
                    extra: {
                        ...(item.extra || {}),
                        node_links: nodeLinks || []
                    }
                };


                // 返回第一个匹配的项
                return result;
            }
        }

        return null;
    } catch (error) {
        console.error('🐝 Hive: Error in searchNodeByClassMappingFallback:', error);
        return null;
    }
}

/**
 * 通过 class_name 搜索节点（新逻辑，使用 RPC 函数）
 * 
 * 需要在数据库中创建 RPC 函数：rpc_search_node_by_class_name
 * SQL 定义文件：rpc_search_node_by_class_name.sql
 * 
 * RPC 函数会在一条请求中完成：
 * 1. 在 node_class_mappings 表中搜索 class_name（忽略大小写完全匹配）
 * 2. 在 inspiration_items 表中搜索（category='node', keyword_text=class_name，忽略大小写完全匹配）
 * 3. 获取对应的 inspiration_node_links 表的数据
 * 
 * 如果 RPC 函数不可用，会自动回退到直接查询方式
 * 
 * @param {string} className - 节点类名
 * @returns {Promise<Object|null>} 找到的项，如果未找到返回null
 */
async function searchNodeByClassMapping(className) {
    try {
        const supabase = getSupabase();
        if (!supabase) {
            console.warn('🐝 Hive: Supabase not available for node search');
            return null;
        }


        // 使用 RPC 函数在一条请求中完成所有匹配
        // RPC 函数会完成：
        // 1. 在 node_class_mappings 表中搜索 class_name（忽略大小写完全匹配）
        // 2. 在 inspiration_items 表中搜索（category='node', keyword_text=class_name，忽略大小写完全匹配）
        // 3. 获取对应的 inspiration_node_links 表的数据
        const trimmedClassName = className.trim();
        
        try {
            const { data, error } = await supabase.rpc('rpc_search_node_by_class_name', {
                p_class_name: trimmedClassName
            });

            if (error) {
                // 如果 RPC 函数不存在，回退到原来的查询方式
                if (error.code === 'PGRST202' || error.message?.includes('Could not find the function')) {
                    console.warn('🐝 Hive: RPC function not found, falling back to direct queries:', error.message);
                    return await searchNodeByClassMappingFallback(className);
                }
                console.error('🐝 Hive: Error calling rpc_search_node_by_class_name:', error);
                return null;
            }

            // RPC 函数返回的数据结构应该包含 inspiration_item 和 node_links
            // 如果没有找到，返回 null
            if (!data || data.length === 0) {
                return null;
            }

            // 取第一个匹配的项
            const result = data[0];

            // 确保返回的数据结构包含 node_links
            if (!result.extra) {
                result.extra = {};
            }
            if (!result.extra.node_links && result.node_links) {
                result.extra.node_links = result.node_links;
            }


            return result;
        } catch (rpcError) {
            // 如果 RPC 调用失败，回退到原来的查询方式
            console.warn('🐝 Hive: RPC call failed, falling back to direct queries:', rpcError);
            return await searchNodeByClassMappingFallback(className);
        }
    } catch (error) {
        console.error('🐝 Hive: Error in searchNodeByClassMapping:', error);
        return null;
    }
}

/**
 * 在数据库中搜索模型或节点
 * @param {string} name - 模型或节点名称
 * @param {'model'|'node'} category - 分类
 * @returns {Promise<Object|null>} 找到的项，如果未找到返回null
 */
async function searchItemInLibrary(name, category) {
    try {
        // 确保 Supabase 已初始化
        const isInitialized = await ensureSupabaseInitialized();
        if (!isInitialized) {
            console.warn('🐝 Hive: Supabase initialization failed or not available, skipping search');
            return null;
        }
        
        
        // 清理名称：去除路径分隔符前后的空格
        const cleanName = name.trim().replace(/\s*\/\s*/g, '/');
        
        // 提取文件名（不含扩展名）用于精确匹配
        const fileNameWithExt = cleanName.split('/').pop(); // 文件名（含扩展名）
        const fileNameWithoutExt = fileNameWithExt.replace(/\.(safetensors|pt|pth|ckpt|bin)$/i, ''); // 文件名（不含扩展名）
        
        
        // 对于节点，使用新的搜索逻辑
        if (category === 'node') {
            return await searchNodeByClassMapping(cleanName);
        }
        
        // 对于模型，优先使用文件名（不含扩展名）进行精确匹配
        const searchTerms = [
            fileNameWithoutExt, // 文件名（不含扩展名）- 最优先
            fileNameWithExt, // 文件名（含扩展名）
            cleanName.split('/').slice(-2).join('/'), // 最后两级路径
            cleanName, // 完整名称
        ].filter(Boolean);

        // 去重
        const uniqueTerms = [...new Set(searchTerms)];

        let bestMatch = null;
        let bestMatchScore = 0;

        for (const term of uniqueTerms) {
            if (!term || term.length < 2) continue;
            
            try {
                const { items } = await searchInspiration({
                    category,
                    keyword: term,
                    page: 1,
                    pageSize: 20,
                    sort: 'latest'
                });


                // 尝试匹配模型名称
                for (const item of items) {
                    const itemTitle = (item.title || '').toLowerCase();
                    const itemDesc = (item.description || '').toLowerCase();
                    const searchText = term.toLowerCase();
                    let matchScore = 0;
                    
                    // 对于模型：优先匹配文件名（不含扩展名）
                    // 检查标题中是否包含文件名（不含扩展名）- 完全匹配得分最高
                    const titleFileName = itemTitle.match(/([^\/\s]+)\.(?:safetensors|pt|pth|ckpt|bin)?$/i);
                    if (titleFileName) {
                        const titleFileNameWithoutExt = titleFileName[1].toLowerCase();
                        if (titleFileNameWithoutExt === fileNameWithoutExt.toLowerCase()) {
                            // 完全匹配文件名（不含扩展名）- 得分100
                            matchScore = 100;
                            bestMatch = item;
                            bestMatchScore = matchScore;
                            break; // 找到最佳匹配，立即返回
                        }
                    }
                    
                    // 检查模型URL中是否包含文件名
                    const modelUrl = (item.model_hf_url || item.model_mirror_url || '').toLowerCase();
                    if (modelUrl && modelUrl.includes(fileNameWithoutExt.toLowerCase())) {
                        matchScore = Math.max(matchScore, 80);
                    }
                    
                    // 标题包含搜索词
                    if (itemTitle.includes(searchText)) {
                        matchScore = Math.max(matchScore, 60);
                    }
                    
                    // 更新最佳匹配
                    if (matchScore > bestMatchScore) {
                        bestMatch = item;
                        bestMatchScore = matchScore;
                    }
                }
                
                // 如果找到完全匹配（得分100），立即返回
                if (bestMatchScore >= 100) {
                    return bestMatch;
                }
            } catch (searchError) {
                console.warn(`🐝 Hive: Search error for term "${term}":`, searchError);
                // 继续尝试下一个搜索词
            }
        }
        
        // 返回最佳匹配（如果有）
        if (bestMatch && bestMatchScore >= 60) {
            return bestMatch;
        }
        
        return null;
    } catch (error) {
        console.error('🐝 Hive: Error searching item in library:', error);
        return null;
    }
}

/**
 * 提取模型路径信息（用于确定保存目录）
 * @param {string} modelPath - 模型路径，如 "text_encoders / qwen_2.5_vl_7b_fp8_scaled.safetensors"
 * @returns {Object} {directory: string, filename: string}
 */
function parseModelPath(modelPath) {
    const parts = modelPath.split('/').map(p => p.trim());
    if (parts.length >= 2) {
        return {
            directory: parts[0].replace(/\s+/g, '_').toLowerCase(), // 目录名，转换空格为下划线
            filename: parts[parts.length - 1]
        };
    }
    // 如果格式不符合预期，尝试从文件名推断
    const filename = parts[parts.length - 1];
    if (filename.includes('controlnet')) {
        return { directory: 'controlnet', filename };
    } else if (filename.includes('vae')) {
        return { directory: 'vae', filename };
    } else if (filename.includes('lora')) {
        return { directory: 'loras', filename };
    }
    return { directory: 'checkpoints', filename };
}

/**
 * 检测并增强ComfyUI的缺少模型/节点对话框
 */
// 导出函数供调试使用
let missingItemsEnhancerInstance = null;

export async function initMissingItemsEnhancer() {
    // 尝试预先初始化 Supabase（如果未初始化）
    // 这样在对话框出现时就可以立即搜索，而不需要等待用户打开侧边栏
    try {
        await ensureSupabaseInitialized();
    } catch (error) {
        console.warn('🐝 Hive: Failed to pre-initialize Supabase in missing items enhancer:', error);
        // 继续执行，即使初始化失败，搜索时也会再次尝试
    }
    if (missingItemsEnhancerInstance) {
        return missingItemsEnhancerInstance;
    }
    
    let processedDialogs = new WeakSet();
    const processingDialogs = new WeakSet(); // 正在处理的对话框，防止重复处理
    const pendingSearches = new Set(); // 正在进行的搜索请求，防止重复请求（全局）
    const completedSearches = new WeakMap(); // 已完成的搜索，key是element，value是搜索结果（用于防止重复搜索同一元素）
    
    // 使用MutationObserver监听DOM变化
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    // 检查是否是ComfyUI的对话框
                    checkAndEnhanceDialog(node);
                    
                    // 也检查子节点（但限制深度，避免性能问题）
                    if (node.querySelectorAll) {
                        // 查找可能的对话框容器
                        const possibleDialogs = node.querySelectorAll('div[class*="modal"], dialog, [role="dialog"]');
                        possibleDialogs.forEach((dialog) => {
                            if (dialog.nodeType === Node.ELEMENT_NODE) {
                                checkAndEnhanceDialog(dialog);
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

    // 定期检查已存在的对话框（因为对话框可能在插件加载前就存在）
    const checkInterval = setInterval(() => {
        // 查找所有可能的对话框
        const allDialogs = document.querySelectorAll('div[class*="modal"], dialog, [role="dialog"], body > div[style*="position"]');
        allDialogs.forEach((dialog) => {
            checkAndEnhanceDialog(dialog);
        });
    }, 2000); // 每2秒检查一次

    // 立即检查已存在的对话框
    setTimeout(() => {
        checkAndEnhanceDialog(document.body);
        // 也检查所有可能的对话框元素
        const allDialogs = document.querySelectorAll('div[class*="modal"], dialog, [role="dialog"], body > div[style*="position"]');
        allDialogs.forEach((dialog) => {
            checkAndEnhanceDialog(dialog);
        });
    }, 1000);

    /**
     * 检查并增强对话框
     */
    async function checkAndEnhanceDialog(element) {
        if (!element || !element.textContent) {
            return;
        }

        // 检查是否包含ComfyUI对话框的特征文本
        const text = element.textContent || '';
        const hasMissingModelText = 
            text.includes('缺少模型') || 
            text.includes('Missing Models') ||
            text.includes('未找到以下模型') ||
            text.includes('the following models were not found') ||
            text.includes('加载工作流时,未找到以下模型');

        const hasMissingNodeText =
            text.includes('缺少以下节点') ||
            text.includes('缺少节点') ||
            text.includes('Missing Nodes') ||
            text.includes('未找到以下节点') ||
            text.includes('the following nodes were not found') ||
            text.includes('加载工作流时,未找到以下节点') ||
            text.includes('加载工作流时未找到以下节点');

        if (!hasMissingModelText && !hasMissingNodeText) {
            return;
        }

        // 向上查找对话框容器
        let dialogContainer = element;
        let parent = element.parentElement;
        let depth = 0;
        while (parent && depth < 10) {
            // 检查是否是对话框容器
            const computedStyle = window.getComputedStyle(parent);
            const isDialogContainer = 
                parent.classList && (
                    parent.classList.contains('comfy-modal') ||
                    parent.classList.contains('modal') ||
                    parent.classList.contains('dialog') ||
                    parent.tagName === 'DIALOG' ||
                    parent.getAttribute('role') === 'dialog'
                ) ||
                computedStyle.position === 'fixed' ||
                computedStyle.position === 'absolute' ||
                computedStyle.zIndex > 1000; // 对话框通常有很高的z-index

            if (isDialogContainer) {
                dialogContainer = parent;
                break;
            }
            parent = parent.parentElement;
            depth++;
        }

        // 如果找不到对话框容器，使用body或当前元素
        if (dialogContainer === element && element !== document.body) {
            // 继续向上查找
            let current = element;
            while (current && current !== document.body) {
                const style = window.getComputedStyle(current);
                if (style.position === 'fixed' || style.position === 'absolute') {
                    dialogContainer = current;
                    break;
                }
                current = current.parentElement;
            }
        }

        // 检查对话框容器是否已处理
        if (processedDialogs.has(dialogContainer)) {
            return;
        }

        // 标记为已处理
        processedDialogs.add(dialogContainer);

        const category = hasMissingModelText ? 'model' : 'node';

        // 延迟处理，确保对话框内容已完全渲染
        setTimeout(async () => {
            await enhanceMissingItemsDialog(dialogContainer, category);
        }, 1000);
    }

    /**
     * 增强缺少项对话框
     */
    async function enhanceMissingItemsDialog(dialogElement, category) {
        // 检查是否正在处理中，防止重复处理
        if (processingDialogs.has(dialogElement)) {
            return;
        }
        
        // 标记为正在处理
        processingDialogs.add(dialogElement);
        
        try {
            // 查找所有列表项（可能包含模型/节点名称）
            // ComfyUI的对话框通常使用特定的类名或结构
            const items = findMissingItems(dialogElement, category);
            
            if (items.length === 0) {
                return;
            }


            // 用于记录已经处理过的元素和模型名称，避免重复添加按钮
            const processedElements = new Set();
            const processedNames = new Set(); // 记录已处理的模型名称（不含扩展名）
            const processedFileNames = new Set(); // 记录已处理的完整文件名（不含扩展名）
            const processedNodeNames = new Set(); // 记录已处理的节点名称（用于节点去重）

            // 为每个项搜索库
            for (const item of items) {
                // 对于节点，使用节点名称去重（因为同一个节点可能被找到多次）
                if (category === 'node') {
                    const nodeNameLower = item.name.toLowerCase().trim();
                    
                    // 检查是否已经处理过相同名称的节点
                    if (processedNodeNames.has(nodeNameLower)) {
                        continue;
                    }
                    
                    // 立即标记为已处理，防止重复处理
                    processedNodeNames.add(nodeNameLower);
                    processedElements.add(item.element);
                    
                    // 检查该元素是否已经有按钮（向上查找 <li> 元素）
                    let hasExistingButton = false;
                    let checkElement = item.element;
                    if (checkElement.tagName === 'A') {
                        // 检查父元素（可能是 <li>）
                        let parent = checkElement.parentElement;
                        let depth = 0;
                        while (parent && depth < 5) {
                            if (parent.tagName === 'LI') {
                                const existingButtonContainer = parent.querySelector('.hive-library-button-container');
                                if (existingButtonContainer) {
                                    hasExistingButton = true;
                                    break;
                                }
                            }
                            parent = parent.parentElement;
                            depth++;
                        }
                        
                        // 也检查下一个兄弟元素
                        if (!hasExistingButton && checkElement.nextElementSibling) {
                            if (checkElement.nextElementSibling.classList.contains('hive-library-button-container')) {
                                hasExistingButton = true;
                            }
                        }
                    }
                    
                    if (hasExistingButton) {
                        continue;
                    }
                } else {
                    // 对于模型，跳过已处理的元素
                    if (processedElements.has(item.element)) {
                        continue;
                    }
                    
                    const fileName = item.name.split('/').pop();
                    const fileNameWithoutExt = fileName.replace(/\.(safetensors|pt|pth|ckpt|bin)$/i, '').toLowerCase();
                    
                    // 检查是否已经处理过相同的文件名（不含扩展名）
                    if (processedFileNames.has(fileNameWithoutExt)) {
                        continue;
                    }
                    
                    // 检查对话框中是否已经有该模型的按钮
                    const existingButton = dialogElement.querySelector(`.hive-library-button:not(.hive-library-button-container *)`);
                    if (existingButton) {
                        const btnText = existingButton.textContent || '';
                        if (btnText.toLowerCase().includes(fileNameWithoutExt)) {
                            processedFileNames.add(fileNameWithoutExt);
                            continue;
                        }
                    }
                    
                    // 标记为已处理
                    processedElements.add(item.element);
                    processedFileNames.add(fileNameWithoutExt);
                }
                
                // 创建搜索的唯一标识（用于防止重复请求）
                const searchKey = `${category}:${item.name.toLowerCase().trim()}`;
                
                // 检查是否已经有相同的搜索正在进行
                if (pendingSearches.has(searchKey)) {
                    continue;
                }
                
                // 检查该元素是否已经搜索过（防止重复搜索同一元素）
                if (completedSearches.has(item.element)) {
                    const previousResult = completedSearches.get(item.element);
                    if (previousResult) {
                        // 如果之前找到了结果，直接使用
                        addLibraryButton(item.element, previousResult, category, item.name);
                    }
                    continue;
                }
                
                // 标记搜索为进行中
                pendingSearches.add(searchKey);
                
                
                try {
                    const libraryItem = await searchItemInLibrary(item.name, category);
                    
                    // 记录搜索结果（无论是否找到）
                    completedSearches.set(item.element, libraryItem);
                
                    if (libraryItem) {
                        
                        // 搜索后再次检查是否已经添加了按钮（在搜索期间可能已经被添加）
                        if (category === 'node') {
                            // 对于节点，检查父元素（li）是否已经有按钮容器
                            let hasExistingButton = false;
                            let checkElement = item.element;
                            if (checkElement.tagName === 'A') {
                                let parent = checkElement.parentElement;
                                let depth = 0;
                                while (parent && depth < 5) {
                                    if (parent.tagName === 'LI') {
                                        const existingButtonContainer = parent.querySelector('.hive-library-button-container');
                                        if (existingButtonContainer) {
                                            hasExistingButton = true;
                                            break;
                                        }
                                    }
                                    parent = parent.parentElement;
                                    depth++;
                                }
                                
                                // 也检查下一个兄弟元素
                                if (!hasExistingButton && checkElement.nextElementSibling) {
                                    if (checkElement.nextElementSibling.classList.contains('hive-library-button-container')) {
                                        hasExistingButton = true;
                                    }
                                }
                            }
                            
                            if (hasExistingButton) {
                                continue;
                            }
                        } else if (category === 'model') {
                            const fileName = item.name.split('/').pop();
                            const fileNameWithoutExt = fileName.replace(/\.(safetensors|pt|pth|ckpt|bin)$/i, '').toLowerCase();
                            const existingButton = dialogElement.querySelector(`.hive-library-button:not(.hive-library-button-container *)`);
                            if (existingButton) {
                                const btnText = existingButton.textContent || '';
                                if (btnText.toLowerCase().includes(fileNameWithoutExt)) {
                                    continue;
                                }
                            }
                        }
                        
                        addLibraryButton(item.element, libraryItem, category, item.name);
                        
                        // 记录已处理的模型名称
                        if (category === 'model') {
                            const fileName = item.name.split('/').pop();
                            const fileNameWithoutExt = fileName.replace(/\.(safetensors|pt|pth|ckpt|bin)$/i, '').toLowerCase();
                            processedNames.add(fileNameWithoutExt);
                        }
                    } else {
                        // 如果没有找到库项，也要标记为已处理，避免重复搜索
                        if (category === 'node') {
                            // 已经在搜索前标记了
                        } else {
                            // 对于模型，如果没有找到，也要标记为已处理
                            processedElements.add(item.element);
                        }
                    }
                } catch (searchError) {
                    console.error(`🐝 Hive: Error searching ${category} item "${item.name}":`, searchError);
                    // 即使出错，也记录为已搜索（避免重复尝试）
                    completedSearches.set(item.element, null);
                } finally {
                    // 无论成功还是失败，都要从 pendingSearches 中移除
                    pendingSearches.delete(searchKey);
                }
            }
        } catch (error) {
            console.error('🐝 Hive: Error enhancing missing items dialog:', error);
        } finally {
            // 处理完成后，从正在处理的集合中移除
            // 注意：WeakSet 不支持 delete，但我们可以通过检查 processedDialogs 来判断
            // 实际上 WeakSet 会在对象被垃圾回收时自动清理，所以这里不需要手动删除
        }
    }

    /**
     * 查找缺少的项（模型或节点）
     */
    function findMissingItems(dialogElement, category) {
        const items = [];
        const seenNames = new Set(); // 用于去重，记录已看到的名称（不含扩展名）
        
        console.log(`🐝 Hive: Finding missing ${category} items in dialog:`, dialogElement);
        
        // 对于模型，优先查找 <div class="comfy-missing-models"> 或 <ul class="comfy-missing-models">
        if (category === 'model') {
            const missingModelsContainer = dialogElement.querySelector('div.comfy-missing-models, ul.comfy-missing-models');
            if (missingModelsContainer) {
                // 查找所有可能的模型项（可能是 li、div、span 等）
                const modelElements = missingModelsContainer.querySelectorAll('li, div, span, a');
                modelElements.forEach(modelEl => {
                    const text = (modelEl.textContent || '').trim();
                    // 模型通常有文件路径，如 "text_encoders / qwen_2.5_vl_7b_fp8_scaled.safetensors"
                    const modelPattern = /[\w\s\/\-\.]+\.(safetensors|pt|pth|ckpt|bin)/i;
                    
                    if (modelPattern.test(text)) {
                        // 提取模型路径
                        const lines = text.split('\n').map(l => l.trim()).filter(l => l);
                        for (const line of lines) {
                            if (modelPattern.test(line) && 
                                !line.includes('下载') && 
                                !line.includes('Download') &&
                                !line.includes('复制链接') &&
                                !line.includes('Copy Link') &&
                                !line.includes('GB') &&
                                !line.includes('MB') &&
                                !line.includes('使用Hive下载') &&
                                !line.includes('Download with Hive')) {
                                const match = line.match(/([\w\s\/\-\.]+\.(?:safetensors|pt|pth|ckpt|bin))/i);
                                if (match) {
                                    const modelPath = match[1].trim();
                                    const fileNameWithoutExt = modelPath.split('/').pop().replace(/\.(safetensors|pt|pth|ckpt|bin)$/i, '').toLowerCase();
                                    
                                    if (!seenNames.has(fileNameWithoutExt)) {
                                        items.push({
                                            element: modelEl,
                                            name: modelPath
                                        });
                                        seenNames.add(fileNameWithoutExt);
                                        console.log(`🐝 Hive: Found model item in comfy-missing-models:`, modelPath);
                                        break;
                                    }
                                }
                            }
                        }
                    }
                });
                if (items.length > 0) {
                    console.log(`🐝 Hive: Found ${items.length} unique model items from comfy-missing-models`);
                    return items;
                }
                // 如果没有找到，继续使用通用方法查找
                console.log(`🐝 Hive: No items found in comfy-missing-models, trying generic method...`);
            }
        }
        
        // 对于节点，优先查找 <ul class="comfy-missing-nodes">
        if (category === 'node') {
            const missingNodesList = dialogElement.querySelector('ul.comfy-missing-nodes');
            if (missingNodesList) {
                const nodeLinks = missingNodesList.querySelectorAll('a');
                nodeLinks.forEach(aTag => {
                    // 只提取直接的文本节点，排除子元素的文本
                    // 克隆节点，移除所有子元素，然后获取文本
                    const clone = aTag.cloneNode(true);
                    // 移除所有子元素
                    const children = Array.from(clone.children);
                    children.forEach(child => child.remove());
                    // 获取纯文本内容并去除前后空格
                    const nodeName = (clone.textContent || '').trim();
                    
                    if (nodeName && nodeName.length > 0) {
                        const nodeNameLower = nodeName.toLowerCase();
                        // 检查是否已经存在相同名称的项（使用小写比较）
                        if (!seenNames.has(nodeNameLower)) {
                            items.push({
                                element: aTag,
                                name: nodeName
                            });
                            seenNames.add(nodeNameLower);
                            console.log(`🐝 Hive: Found node item in comfy-missing-nodes:`, nodeName);
                        } else {
                            console.log(`🐝 Hive: Duplicate node name skipped:`, nodeName);
                        }
                    }
                });
                if (items.length > 0) {
                    console.log(`🐝 Hive: Found ${items.length} unique node items from comfy-missing-nodes`);
                    return items;
                }
                // 如果没有找到，继续使用通用方法查找
                console.log(`🐝 Hive: No items found in ul.comfy-missing-nodes, trying generic method...`);
            }
        }
        
        // 先尝试找到列表容器（避免匹配到对话框的其他部分，如标题、关闭按钮等）
        // 只有在找不到特定DOM结构（comfy-missing-models 或 comfy-missing-nodes）时才使用通用方法
        // 这是一个fallback机制，只在特定DOM结构不存在时使用
        
        // 进一步限制搜索范围：只在对话框内容区域搜索，排除标题、按钮等
        // 确保只在缺失项提示对话框中使用文本模式匹配
        // 检查对话框是否确实包含缺失项提示（双重验证）
        const dialogText = dialogElement.textContent || '';
        const isMissingDialog = 
            (category === 'model' && (
                dialogText.includes('缺少模型') || 
                dialogText.includes('Missing Models') ||
                dialogText.includes('未找到以下模型') ||
                dialogText.includes('the following models were not found')
            )) ||
            (category === 'node' && (
                dialogText.includes('缺少以下节点') ||
                dialogText.includes('缺少节点') ||
                dialogText.includes('Missing Nodes') ||
                dialogText.includes('未找到以下节点') ||
                dialogText.includes('the following nodes were not found') ||
                dialogText.includes('加载工作流时,未找到以下节点') ||
                dialogText.includes('加载工作流时未找到以下节点')
            ));
        
        // 如果不是缺失项提示对话框，直接返回，不进行文本模式匹配
        if (!isMissingDialog) {
            console.log(`🐝 Hive: Dialog does not appear to be a missing items dialog, skipping text pattern matching`);
            return items;
        }
        
        // ComfyUI的对话框通常有一个列表容器
        let listContainer = dialogElement.querySelector('[class*="list"]') ||
                           dialogElement.querySelector('[class*="content"]') ||
                           dialogElement.querySelector('[class*="body"]') ||
                           dialogElement.querySelector('ul') ||
                           dialogElement.querySelector('.p-dialog-content') ||
                           dialogElement;
        
        // 限制搜索范围，只搜索列表容器内的元素
        // 排除对话框头部、底部、关闭按钮等区域
        const excludedSelectors = [
            '.p-dialog-header',
            '.p-dialog-header-icon',
            '.p-dialog-close-button',
            '[class*="header"]',
            '[class*="footer"]',
            '[class*="close"]',
            'button[aria-label*="close" i]',
            'button[aria-label*="关闭" i]'
        ];
        
        const excludedElements = [];
        excludedSelectors.forEach(selector => {
            try {
                const excluded = dialogElement.querySelectorAll(selector);
                excluded.forEach(el => excludedElements.push(el));
            } catch (e) {
                // 忽略选择器错误
            }
        });
        
        // 查找所有可能的容器元素，但限制在列表容器内
        const allElements = listContainer.querySelectorAll('*');
        
        for (const el of allElements) {
            // 跳过排除的元素及其子元素
            if (excludedElements.some(excluded => excluded.contains(el) || excluded === el)) {
                continue;
            }
            
            // 跳过已经处理过的项（已经有我们的按钮）
            if (el.querySelector && el.querySelector('.hive-library-button')) {
                continue;
            }

            // 跳过按钮容器本身
            if (el.classList && el.classList.contains('hive-library-button-container')) {
                continue;
            }
            
            // 跳过对话框头部和关闭按钮区域
            const rect = el.getBoundingClientRect();
            const dialogRect = dialogElement.getBoundingClientRect();
            // 如果元素在对话框顶部20%区域内，很可能是头部，跳过
            if (rect.top < dialogRect.top + (dialogRect.height * 0.2)) {
                continue;
            }
            // 如果元素在对话框右上角小区域内，很可能是关闭按钮，跳过
            if (rect.top < dialogRect.top + 50 && rect.left > dialogRect.right - 100) {
                continue;
            }

            const text = el.textContent || '';
            const innerHTML = el.innerHTML || '';
            
            // 检查是否包含模型/节点名称的特征
            if (category === 'model') {
                // 模型通常有文件路径，如 "text_encoders / qwen_2.5_vl_7b_fp8_scaled.safetensors"
                // 或者 "text_encoders / clip_l.safetensors"
                const modelPattern = /[\w\s\/\-\.]+\.(safetensors|pt|pth|ckpt|bin)/i;
                
                // 检查元素本身或其父元素是否包含模型路径
                let modelText = text;
                let targetElement = el;
                
                if (!modelPattern.test(modelText)) {
                    // 尝试查找父元素中的模型路径
                    let parent = el.parentElement;
                    let depth = 0;
                    while (parent && depth < 3) {
                        const parentText = parent.textContent || '';
                        if (modelPattern.test(parentText)) {
                            modelText = parentText;
                            targetElement = parent;
                            break;
                        }
                        parent = parent.parentElement;
                        depth++;
                    }
                }
                
                if (modelPattern.test(modelText)) {
                    // 提取模型路径（去除按钮文本、大小等）
                    // 模型路径通常在文本的开头，格式如 "text_encoders / clip_l.safetensors"
                    const lines = modelText.split('\n').map(l => l.trim()).filter(l => l);
                    for (const line of lines) {
                        if (modelPattern.test(line) && 
                            !line.includes('下载') && 
                            !line.includes('Download') &&
                            !line.includes('复制链接') &&
                            !line.includes('Copy Link') &&
                            !line.includes('GB') &&
                            !line.includes('MB') &&
                            !line.includes('使用Hive下载') &&
                            !line.includes('Download with Hive') &&
                            !line.includes('(') &&
                            !line.includes(')')) {
                            // 提取模型路径（去除可能的额外文本）
                            const match = line.match(/([\w\s\/\-\.]+\.(?:safetensors|pt|pth|ckpt|bin))/i);
                            if (match) {
                                const modelPath = match[1].trim();
                                // 提取文件名（不含扩展名）用于去重
                                const fileNameWithoutExt = modelPath.split('/').pop().replace(/\.(safetensors|pt|pth|ckpt|bin)$/i, '').toLowerCase();
                                
                                // 检查是否已经存在相同文件名（不含扩展名）的项
                                if (!seenNames.has(fileNameWithoutExt)) {
                                    // 检查是否已经存在相同完整路径的项
                                    const existing = items.find(item => item.name === modelPath);
                                    if (!existing) {
                                        items.push({
                                            element: targetElement,
                                            name: modelPath
                                        });
                                        seenNames.add(fileNameWithoutExt);
                                        console.log(`🐝 Hive: Found model item:`, modelPath, `(filename: ${fileNameWithoutExt})`);
                                        break; // 每个元素只添加一次
                                    }
                                } else {
                                    console.log(`🐝 Hive: Duplicate model name (without ext) skipped: ${fileNameWithoutExt}`);
                                }
                            }
                        }
                    }
                }
            } else if (category === 'node') {
                // 节点名称通常是类名，如 "QwenImageIntegratedKSampler"
                // 节点名称特征：通常是大驼峰命名（PascalCase）或包含大写字母，不包含文件扩展名
                // 排除常见的按钮文本、链接文本等
                const nodeNamePattern = /^[A-Z][a-zA-Z0-9_]+$/; // 大驼峰命名模式
                const nodeNamePattern2 = /[A-Z][a-zA-Z0-9_]{3,}/; // 至少4个字符，首字母大写
                
                // 检查元素本身或其父元素是否包含节点名称
                let nodeText = text.trim();
                let targetElement = el;
                
                // 如果当前元素文本不匹配，尝试查找父元素
                if (!nodeNamePattern.test(nodeText) && !nodeNamePattern2.test(nodeText)) {
                    let parent = el.parentElement;
                    let depth = 0;
                    while (parent && depth < 3) {
                        const parentText = (parent.textContent || '').trim();
                        // 检查父元素文本是否包含节点名称模式
                        if (nodeNamePattern.test(parentText) || nodeNamePattern2.test(parentText)) {
                            // 提取可能的节点名称（排除按钮文本、链接文本等）
                            const lines = parentText.split('\n').map(l => l.trim()).filter(l => l);
                            for (const line of lines) {
                                // 排除包含常见按钮文本的行
                                if (line.includes('下载') || 
                                    line.includes('Download') ||
                                    line.includes('安装') ||
                                    line.includes('Install') ||
                                    line.includes('复制') ||
                                    line.includes('Copy') ||
                                    line.includes('使用Hive') ||
                                    line.includes('with Hive') ||
                                    line.includes('http://') ||
                                    line.includes('https://') ||
                                    line.includes('github.com') ||
                                    line.includes('🔍') ||
                                    line.length < 3) {
                                    continue;
                                }
                                
                                // 尝试匹配节点名称
                                const nodeMatch = line.match(/^([A-Z][a-zA-Z0-9_]+)$/);
                                if (nodeMatch) {
                                    const nodeName = nodeMatch[1];
                                    const nodeNameLower = nodeName.toLowerCase();
                                    
                                    // 检查是否已经存在相同名称的项
                                    if (!seenNames.has(nodeNameLower)) {
                                        // 查找包含该节点名称的元素
                                        const nodeElement = Array.from(parent.querySelectorAll('*')).find(e => {
                                            const eText = (e.textContent || '').trim();
                                            return eText === nodeName || eText.includes(nodeName);
                                        }) || parent;
                                        
                                        items.push({
                                            element: nodeElement,
                                            name: nodeName
                                        });
                                        seenNames.add(nodeNameLower);
                                        console.log(`🐝 Hive: Found node item by pattern matching:`, nodeName);
                                        break;
                                    }
                                }
                            }
                            if (items.length > 0) {
                                break;
                            }
                        }
                        parent = parent.parentElement;
                        depth++;
                    }
                } else {
                    // 当前元素文本匹配节点名称模式
                    // 排除常见按钮文本
                    if (!nodeText.includes('下载') && 
                        !nodeText.includes('Download') &&
                        !nodeText.includes('安装') &&
                        !nodeText.includes('Install') &&
                        !nodeText.includes('复制') &&
                        !nodeText.includes('Copy') &&
                        !nodeText.includes('使用Hive') &&
                        !nodeText.includes('with Hive') &&
                        !nodeText.includes('http://') &&
                        !nodeText.includes('https://') &&
                        nodeText.length >= 3) {
                        
                        // 尝试提取节点名称
                        const nodeMatch = nodeText.match(/^([A-Z][a-zA-Z0-9_]+)$/);
                        if (nodeMatch) {
                            const nodeName = nodeMatch[1];
                            const nodeNameLower = nodeName.toLowerCase();
                            
                            // 检查是否已经存在相同名称的项
                            if (!seenNames.has(nodeNameLower)) {
                                items.push({
                                    element: targetElement,
                                    name: nodeName
                                });
                                seenNames.add(nodeNameLower);
                                console.log(`🐝 Hive: Found node item by pattern matching:`, nodeName);
                            }
                        }
                    }
                }
            }
        }

        console.log(`🐝 Hive: Found ${items.length} ${category} items:`, items.map(i => i.name));
        return items;
    }

    /**
     * 添加库按钮到对话框项
     */
    function addLibraryButton(itemElement, libraryItem, category, originalName) {
        // 检查是否已经添加过按钮（在itemElement及其父元素中）
        if (itemElement.querySelector('.hive-library-button') || 
            itemElement.closest('.hive-library-button-container')) {
            console.log(`🐝 Hive: Button already exists in itemElement for ${category}, skipping`);
            return;
        }
        
        // 对于节点，检查父元素（li）是否已经有按钮容器
        if (category === 'node') {
            // 检查 <a> 标签的父元素（可能是 <li>）
            let checkElement = itemElement;
            if (itemElement.tagName === 'A') {
                checkElement = itemElement.parentElement;
            }
            
            // 向上查找 <li> 元素
            let liElement = null;
            let current = checkElement;
            let depth = 0;
            while (current && depth < 5) {
                if (current.tagName === 'LI') {
                    liElement = current;
                    break;
                }
                current = current.parentElement;
                depth++;
            }
            
            if (liElement) {
                const existingButtonContainer = liElement.querySelector('.hive-library-button-container');
                if (existingButtonContainer) {
                    console.log(`🐝 Hive: Button container already exists in parent <li> for node, skipping`);
                    return;
                }
            }
            
            // 也检查 <a> 标签本身是否已经有按钮
            if (itemElement.tagName === 'A') {
                const nextSibling = itemElement.nextElementSibling;
                if (nextSibling && nextSibling.classList.contains('hive-library-button-container')) {
                    console.log(`🐝 Hive: Button container already exists as next sibling for node, skipping`);
                    return;
                }
            }
        }
        
        // 检查整个对话框中是否已经有该模型的按钮（通过模型名称匹配）
        if (category === 'model' && originalName) {
            const fileName = originalName.split('/').pop().replace(/\.(safetensors|pt|pth|ckpt|bin)$/i, '').toLowerCase();
            const dialogElement = findDialogElement(itemElement);
            if (dialogElement) {
                // 查找对话框中是否已经有包含该模型名称的按钮容器
                const existingContainers = dialogElement.querySelectorAll('.hive-library-button-container');
                for (const container of existingContainers) {
                    const containerText = container.textContent || '';
                    // 检查按钮容器文本是否包含该模型名称
                    if (containerText.toLowerCase().includes(fileName)) {
                        console.log(`🐝 Hive: Button container already exists for model "${fileName}" in dialog, skipping`);
                        return;
                    }
                }
            }
        }
        
        // 检查itemElement是否在对话框的头部或关闭按钮区域
        const dialogElement = findDialogElement(itemElement);
        if (dialogElement) {
            const dialogRect = dialogElement.getBoundingClientRect();
            const itemRect = itemElement.getBoundingClientRect();
            
            // 如果元素在对话框顶部20%区域内，很可能是头部，跳过
            if (itemRect.top < dialogRect.top + (dialogRect.height * 0.2)) {
                console.log(`🐝 Hive: Item element is in dialog header area, skipping`);
                return;
            }
            
            // 如果元素在对话框右上角小区域内，很可能是关闭按钮，跳过
            if (itemRect.top < dialogRect.top + 50 && itemRect.left > dialogRect.right - 100) {
                console.log(`🐝 Hive: Item element is in dialog close button area, skipping`);
                return;
            }
        }

        // 获取当前语言
        const getText = (key, params = {}) => {
            if (typeof window !== 'undefined' && typeof window.t === 'function') {
                try {
                    return window.t(key, params);
                } catch (e) {
                    // 如果翻译失败，使用回退
                }
            }
            // 回退文本
            const fallbacks = {
                'missingItems.fromLibrary': category === 'model' ? '使用Hive下载' : '从库中安装',
                'missingItems.fromLibraryMirror': category === 'model' ? '使用Hive下载（镜像）' : '从库中安装（镜像）',
                'missingItems.fromLibraryNode': '使用Hive安装',
                'missingItems.download': '下载',
                'missingItems.install': '安装',
                'missingItems.installWithHive': '使用Hive安装',
                'toast.modelUrlNotFound': '未找到模型下载地址',
                'toast.nodeUrlNotFound': '未找到节点安装地址',
                'toast.modelDownloadStarted': '模型下载已开始',
                'toast.nodeInstallStarted': '节点安装已开始',
                'toast.modelDownloadFailed': '模型下载失败：',
                'toast.nodeInstallFailed': '节点安装失败：',
                'common.success': '成功',
                'common.error': '错误'
            };
            return fallbacks[key] || key;
        };
        
        // 获取要显示的模型名称
        // 优先使用原始名称，如果没有则使用库中的标题
        let displayName = originalName || libraryItem.title || '';
        // 如果是模型，提取文件名（不含路径）
        if (category === 'model' && displayName.includes('/')) {
            displayName = displayName.split('/').pop();
        }
        // 限制显示名称长度（避免按钮太长）
        if (displayName.length > 30) {
            displayName = displayName.substring(0, 27) + '...';
        }

        // 创建节点安装按钮的函数
        const createNodeInstallButton = (nodeLink, nodeName) => {
            const button = document.createElement('button');
            button.className = 'hive-library-button';
            
            // 按钮文本：使用Hive安装（label）+换行+缺失的名字
            const buttonText = document.createElement('div');
            buttonText.style.cssText = 'display: flex; flex-direction: column; align-items: center; line-height: 1.3;';
            
            const mainText = document.createElement('span');
            // 使用翻译函数支持中英文
            // 格式：使用Hive安装（label）或 Install with Hive (label)
            const installWithHiveText = getText('missingItems.fromLibraryNode'); // "从库中安装" 或 "Install from Library"
            const labelText = nodeLink.label || getText('missingItems.install'); // label 或 "安装"/"Install"
            
            // 根据当前语言决定括号格式：中文用（），英文用 ()
            // 通过检查翻译文本是否包含中文字符来判断语言
            const isZh = installWithHiveText.includes('安装') || installWithHiveText.includes('从库');
            const bracketLeft = isZh ? '（' : ' (';
            const bracketRight = isZh ? '）' : ')';
            
            mainText.textContent = `${installWithHiveText}${bracketLeft}${labelText}${bracketRight}`;
            mainText.style.cssText = 'font-weight: 500;';
            
            const nameText = document.createElement('span');
            nameText.textContent = nodeName;
            nameText.style.cssText = 'font-size: 10px; opacity: 0.9; margin-top: 2px; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
            nameText.title = nodeName; // 添加提示，显示完整名称
            
            buttonText.appendChild(mainText);
            buttonText.appendChild(nameText);
            button.appendChild(buttonText);
            
            button.style.cssText = `
                padding: 6px 12px;
                border-radius: 4px;
                border: none;
                font-size: 11px;
                background: #ffbd2e;
                color: #000;
                cursor: pointer;
                font-weight: 500;
                transition: background 0.2s;
                min-width: 100px;
                text-align: center;
            `;

            button.onmouseenter = () => {
                button.style.background = '#ffd84d';
            };
            button.onmouseleave = () => {
                button.style.background = '#ffbd2e';
            };

            button.onclick = async (e) => {
                e.stopPropagation();
                e.preventDefault();
                
                try {
                    // 先查找对话框引用（用于后续关闭）
                    const dialogRef = findDialogElement(itemElement);
                    
                    // 创建包含特定 node_link 的库项对象
                    const itemWithLink = { 
                        ...libraryItem,
                        extra: {
                            ...(libraryItem.extra || {}),
                            node_links: [nodeLink] // 只包含当前按钮对应的链接
                        }
                    };
                    
                    await handleNodeInstallFromLibrary(itemWithLink, itemElement);
                    
                    // 安装开始后，延迟关闭对话框（确保安装操作已启动）
                    setTimeout(() => {
                        if (dialogRef) {
                            closeMissingItemsDialog(dialogRef);
                        } else {
                            closeMissingItemsDialog(itemElement);
                        }
                    }, 500);
                } catch (error) {
                    console.error('🐝 Hive: Error handling node install:', error);
                    showToast(getText('common.error') + ': ' + error.message, 'error');
                    // 即使出错，也尝试关闭对话框
                    closeMissingItemsDialog(itemElement);
                }
            };

            return button;
        };

        // 创建按钮容器的函数（用于模型）
        const createDownloadButton = (url, isMirror = false) => {
            const button = document.createElement('button');
            button.className = 'hive-library-button';
            
            // 按钮文本：使用Hive下载 + 模型名称（换行显示）
            const buttonText = document.createElement('div');
            buttonText.style.cssText = 'display: flex; flex-direction: column; align-items: center; line-height: 1.3;';
            
            const mainText = document.createElement('span');
            mainText.textContent = isMirror 
                ? getText('missingItems.fromLibraryMirror')
                : getText('missingItems.fromLibrary');
            mainText.style.cssText = 'font-weight: 500;';
            
            const nameText = document.createElement('span');
            nameText.textContent = displayName;
            nameText.style.cssText = 'font-size: 10px; opacity: 0.9; margin-top: 2px; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
            nameText.title = displayName; // 添加提示，显示完整名称
            
            buttonText.appendChild(mainText);
            buttonText.appendChild(nameText);
            button.appendChild(buttonText);
            
            button.style.cssText = `
                padding: 6px 12px;
                border-radius: 4px;
                border: none;
                font-size: 11px;
                background: #ffbd2e;
                color: #000;
                cursor: pointer;
                font-weight: 500;
                transition: background 0.2s;
                min-width: 100px;
                text-align: center;
            `;

            button.onmouseenter = () => {
                button.style.background = '#ffd84d';
            };
            button.onmouseleave = () => {
                button.style.background = '#ffbd2e';
            };

            button.onclick = async (e) => {
                e.stopPropagation();
                e.preventDefault();
                
                try {
                    // 先查找对话框引用（用于后续关闭）
                    const dialogRef = findDialogElement(itemElement);
                    
                    if (category === 'model') {
                        // 创建临时库项对象，使用指定的URL
                        const itemWithUrl = { ...libraryItem };
                        if (isMirror) {
                            itemWithUrl.model_mirror_url = url;
                            itemWithUrl.model_hf_url = null; // 清除HF URL，确保使用镜像URL
                        } else {
                            itemWithUrl.model_hf_url = url;
                            itemWithUrl.model_mirror_url = null; // 清除镜像URL，确保使用HF URL
                        }
                        await handleModelDownloadFromLibrary(itemWithUrl, itemElement);
                    } else {
                        // 对于节点，传递包含 node_link 的库项
                        await handleNodeInstallFromLibrary(libraryItem, itemElement);
                    }
                    
                    // 下载/安装开始后，延迟关闭对话框（确保下载/安装操作已启动）
                    setTimeout(() => {
                        if (dialogRef) {
                            closeMissingItemsDialog(dialogRef);
                        } else {
                            closeMissingItemsDialog(itemElement);
                        }
                    }, 500);
                } catch (error) {
                    console.error('🐝 Hive: Error handling library action:', error);
                    showToast(getText('common.error') + ': ' + error.message, 'error');
                    // 即使出错，也尝试关闭对话框
                    closeMissingItemsDialog(itemElement);
                }
            };

            return button;
        };

        // 创建按钮容器（包含所有按钮）
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'hive-library-button-container';
        buttonContainer.style.cssText = `
            display: inline-flex;
            gap: 6px;
            margin-left: 8px;
            vertical-align: middle;
            align-items: center;
        `;

        // 检查是否有HF URL和镜像URL，创建相应的按钮
        if (category === 'model') {
            // 如果有HF URL，创建HF下载按钮
            if (libraryItem.model_hf_url) {
                const hfButton = createDownloadButton(libraryItem.model_hf_url, false);
                buttonContainer.appendChild(hfButton);
            }
            
            // 如果有镜像URL，创建镜像下载按钮
            if (libraryItem.model_mirror_url) {
                const mirrorButton = createDownloadButton(libraryItem.model_mirror_url, true);
                buttonContainer.appendChild(mirrorButton);
            }
        } else {
            // 对于节点，根据 node_links 的数量创建多个按钮
            const nodeLinks = libraryItem.extra?.node_links || libraryItem.node_links || [];
            if (nodeLinks.length > 0) {
                nodeLinks.forEach(nodeLink => {
                    const nodeButton = createNodeInstallButton(nodeLink, originalName || displayName);
                    buttonContainer.appendChild(nodeButton);
                });
            } else {
                // 如果没有 node_links，创建一个默认按钮
                const defaultNodeLink = { label: '安装', url: null };
                const nodeButton = createNodeInstallButton(defaultNodeLink, originalName || displayName);
                buttonContainer.appendChild(nodeButton);
            }
        }
        
        // 将按钮添加到合适的位置
        // 对于模型：尝试找到下载按钮，在旁边添加
        // 对于节点：添加到节点名称旁边
        
        if (category === 'model') {
            // 根据用户提供的DOM结构，需要找到包含模型路径信息的span
            // 这个span通常包含模型路径，如 "model_patches / qwen_image_canny_diffsynth_controlnet.safetensors"
            // 查找包含模型文件名的span（通过匹配原始模型名称）
            let modelNameSpan = null;
            
            if (originalName) {
                // 使用原始模型名称来查找对应的span
                const fileName = originalName.split('/').pop(); // 提取文件名
                const fileNameWithoutExt = fileName.replace(/\.(safetensors|pt|pth|ckpt|bin)$/i, '');
                
                // 查找包含模型路径的span
                modelNameSpan = Array.from(itemElement.querySelectorAll('span')).find(span => {
                    const text = span.textContent || '';
                    const title = span.getAttribute('title') || '';
                    // 检查span的文本或title是否包含模型文件名（不含扩展名）
                    return (text.includes(fileNameWithoutExt) || title.includes(fileNameWithoutExt) ||
                            text.includes(fileName) || title.includes(fileName)) &&
                           !span.classList.contains('hive-library-button');
                });
            }
            
            // 如果没找到，尝试查找包含.safetensors等扩展名的span
            if (!modelNameSpan) {
                modelNameSpan = Array.from(itemElement.querySelectorAll('span')).find(span => {
                    const text = span.textContent || '';
                    return /\.(safetensors|pt|pth|ckpt|bin)/i.test(text) &&
                           !span.classList.contains('hive-library-button') &&
                           !text.includes('下载') &&
                           !text.includes('Download');
                });
            }
            
            if (modelNameSpan) {
                const downloadLink = modelNameSpan; // 使用modelNameSpan作为定位点
                console.log(`🐝 Hive: Found download link:`, {
                    element: downloadLink,
                    tagName: downloadLink.tagName,
                    text: downloadLink.textContent?.substring(0, 50)
                });
                
                // 根据用户提供的DOM结构：
                // <div class="flex flex-row items-center gap-2">  // 最外层容器
                //   <div>                                        // 第一层div（包含模型名称的部分）
                //     <div>                                      // 第二层div
                //       <span>模型名称</span>                    // span（下载链接）
                //     </div>
                //   </div>
                //   <div><button>下载</button></div>             // 第一层div（包含下载按钮）
                //   <div><button>复制链接</button></div>         // 第一层div（包含复制按钮）
                // </div>
                
                // 第一层：找到span的直接父元素（第二层div，包含span的div）
                const secondLevelDiv = downloadLink.parentElement;
                
                if (secondLevelDiv) {
                    console.log(`🐝 Hive: Second level div (span的上一层div):`, {
                        element: secondLevelDiv,
                        tagName: secondLevelDiv.tagName
                    });
                    
                    // 第二层：找到第二层div的父元素（第一层div，span的上一层div的再上一层div）
                    const firstLevelDiv = secondLevelDiv.parentElement;
                    
                    if (firstLevelDiv) {
                        console.log(`🐝 Hive: First level div (span的上一层div的再上一层div):`, {
                            element: firstLevelDiv,
                            tagName: firstLevelDiv.tagName,
                            parent: firstLevelDiv.parentElement
                        });
                        
                        // 第三层：找到第一层div的父元素（最外层容器）
                        const outerContainer = firstLevelDiv.parentElement;
                        
                        if (outerContainer) {
                            // 在最外层容器中，在第一层div的后面插入按钮
                            // 这样按钮就与包含模型名称的第一层div在同一层级，可以在同一行显示
                            if (firstLevelDiv.nextSibling) {
                                outerContainer.insertBefore(buttonContainer, firstLevelDiv.nextSibling);
                            } else {
                                outerContainer.appendChild(buttonContainer);
                            }
                            
                            console.log(`🐝 Hive: ✅ Successfully inserted button in outerContainer, after firstLevelDiv`);
                            return;
                        }
                    }
                }
                
                // 回退方案：如果没有找到完整的层级，尝试其他方式
                if (secondLevelDiv && secondLevelDiv.parentElement) {
                    const fallbackParent = secondLevelDiv.parentElement.parentElement;
                    if (fallbackParent) {
                        if (secondLevelDiv.parentElement.nextSibling) {
                            fallbackParent.insertBefore(buttonContainer, secondLevelDiv.parentElement.nextSibling);
                        } else {
                            fallbackParent.appendChild(buttonContainer);
                        }
                        console.log(`🐝 Hive: Inserted button using fallback method`);
                        return;
                    }
                }
            } else {
                // 没有找到下载链接，查找现有的按钮
                const existingButtons = itemElement.querySelectorAll('button');
                if (existingButtons.length > 0) {
                    const lastButton = existingButtons[existingButtons.length - 1];
                    if (lastButton.parentElement) {
                        // 确保父容器是inline布局
                        const parentStyle = window.getComputedStyle(lastButton.parentElement);
                        if (parentStyle.display !== 'inline' && parentStyle.display !== 'inline-block' && parentStyle.display !== 'inline-flex') {
                            lastButton.parentElement.style.display = 'inline-flex';
                            lastButton.parentElement.style.alignItems = 'center';
                            lastButton.parentElement.style.gap = '6px';
                        }
                        lastButton.parentElement.insertBefore(buttonContainer, lastButton.nextSibling);
                        console.log(`🐝 Hive: Inserted button after existing button:`, lastButton);
                    } else {
                        itemElement.appendChild(buttonContainer);
                    }
                } else {
                    // 没有现有按钮，在元素末尾添加
                    itemElement.appendChild(buttonContainer);
                    console.log(`🐝 Hive: Appended button to item element`);
                }
            }
        } else {
            // 对于节点，需要特殊处理：
            // 1. 如果 itemElement 是 <a> 标签，检查是否已经在 <li> 中
            // 2. 如果不在 <li> 中，创建 <li> 包裹 <a> 标签
            // 3. 在 <li> 里面 <a> 标签后面添加按钮
            
            let aTag = null;
            let liTag = null;
            
            // 检查 itemElement 是否是 <a> 标签
            if (itemElement.tagName === 'A') {
                aTag = itemElement;
                // 检查是否已经在 <li> 中
                if (itemElement.parentElement && itemElement.parentElement.tagName === 'LI') {
                    liTag = itemElement.parentElement;
                } else {
                    // 创建 <li> 包裹 <a> 标签
                    liTag = document.createElement('li');
                    // 将 <a> 标签移动到 <li> 中
                    if (itemElement.parentElement) {
                        itemElement.parentElement.insertBefore(liTag, itemElement);
                    } else {
                        // 如果没有父元素，这种情况不太可能，但处理一下
                        console.warn('🐝 Hive: a tag has no parent element');
                        return;
                    }
                    liTag.appendChild(itemElement);
                    aTag = itemElement; // 更新引用
                }
            } else {
                // 如果不是 <a> 标签，尝试查找其中的 <a> 标签
                aTag = itemElement.querySelector('a');
                if (aTag) {
                    // 检查 <a> 标签是否已经在 <li> 中
                    if (aTag.parentElement && aTag.parentElement.tagName === 'LI') {
                        liTag = aTag.parentElement;
                    } else {
                        // 创建 <li> 包裹 <a> 标签
                        liTag = document.createElement('li');
                        if (aTag.parentElement) {
                            aTag.parentElement.insertBefore(liTag, aTag);
                        }
                        liTag.appendChild(aTag);
                    }
                } else {
                    // 如果找不到 <a> 标签，使用原来的逻辑
                    console.warn('🐝 Hive: No <a> tag found for node item');
                    if (itemElement.parentElement) {
                        itemElement.parentElement.insertBefore(buttonContainer, itemElement.nextSibling);
                    } else {
                        itemElement.appendChild(buttonContainer);
                    }
                    return;
                }
            }
            
            // 在 <li> 里面 <a> 标签后面添加按钮容器
            if (liTag && aTag) {
                // 将按钮容器添加到 <a> 标签后面
                if (aTag.nextSibling) {
                    liTag.insertBefore(buttonContainer, aTag.nextSibling);
                } else {
                    liTag.appendChild(buttonContainer);
                }
                console.log(`🐝 Hive: Added node buttons after <a> tag in <li>`);
            }
        }
        
        console.log(`🐝 Hive: Added library button for ${category}:`, libraryItem.title);
    }

    /**
     * 查找对话框元素
     */
    function findDialogElement(element) {
        try {
            let dialog = element;
            let depth = 0;
            while (dialog && depth < 15) {
                const computedStyle = window.getComputedStyle(dialog);
                const isDialog = 
                    dialog.classList && (
                        dialog.classList.contains('comfy-modal') ||
                        dialog.classList.contains('modal') ||
                        dialog.classList.contains('dialog') ||
                        dialog.tagName === 'DIALOG'
                    ) ||
                    dialog.getAttribute('role') === 'dialog' ||
                    (computedStyle.position === 'fixed' && computedStyle.zIndex > 1000);

                if (isDialog) {
                    return dialog;
                }
                
                dialog = dialog.parentElement;
                depth++;
            }
            
            // 如果没找到，尝试查找全局的模态框
            const modals = document.querySelectorAll('.comfy-modal, .modal, dialog, [role="dialog"]');
            for (const modal of modals) {
                const style = window.getComputedStyle(modal);
                if (style.display !== 'none' && style.visibility !== 'hidden') {
                    return modal;
                }
            }
            
            return null;
        } catch (error) {
            console.error('🐝 Hive: Error finding dialog element:', error);
            return null;
        }
    }

    /**
     * 关闭缺少项对话框
     */
    function closeMissingItemsDialog(element) {
        try {
            console.log(`🐝 Hive: Attempting to close missing items dialog, starting from:`, element);
            
            // 优先查找 .p-dialog-close-button 按钮（PrimeNG 对话框关闭按钮）
            let searchElement = element;
            let depth = 0;
            
            // 向上查找 .p-dialog-close-button
            while (searchElement && depth < 15) {
                // 在当前元素内查找 .p-dialog-close-button
                const closeBtn = searchElement.querySelector('.p-dialog-close-button');
                if (closeBtn) {
                    const style = window.getComputedStyle(closeBtn);
                    const isVisible = style.display !== 'none' && style.visibility !== 'hidden';
                    if (isVisible) {
                        console.log(`🐝 Hive: Found .p-dialog-close-button, clicking:`, closeBtn);
                        closeBtn.click();
                        return;
                    }
                }
                
                // 检查当前元素是否是 .p-dialog-close-button
                if (searchElement.classList && searchElement.classList.contains('p-dialog-close-button')) {
                    const style = window.getComputedStyle(searchElement);
                    const isVisible = style.display !== 'none' && style.visibility !== 'hidden';
                    if (isVisible) {
                        console.log(`🐝 Hive: Current element is .p-dialog-close-button, clicking:`, searchElement);
                        searchElement.click();
                        return;
                    }
                }
                
                searchElement = searchElement.parentElement;
                depth++;
            }
            
            // 如果向上查找没找到，尝试全局查找 .p-dialog-close-button
            console.log(`🐝 Hive: Searching globally for .p-dialog-close-button...`);
            const closeButtons = document.querySelectorAll('.p-dialog-close-button');
            console.log(`🐝 Hive: Found ${closeButtons.length} .p-dialog-close-button elements`);
            for (const closeBtn of closeButtons) {
                const style = window.getComputedStyle(closeBtn);
                const isVisible = style.display !== 'none' && style.visibility !== 'hidden';
                const ariaLabel = closeBtn.getAttribute('aria-label');
                console.log(`🐝 Hive: Checking .p-dialog-close-button, visible: ${isVisible}, aria-label: "${ariaLabel}"`);
                
                if (isVisible && (ariaLabel === 'Close' || ariaLabel === '关闭')) {
                    console.log(`🐝 Hive: Found visible .p-dialog-close-button globally, clicking:`, closeBtn);
                    closeBtn.click();
                    return;
                }
            }
            
            // 回退方案：查找 comfy-modal 中的 Close 按钮
            searchElement = element;
            depth = 0;
            
            // 向上查找 comfy-modal
            while (searchElement && depth < 15) {
                // 检查当前元素是否是 comfy-modal
                if (searchElement.classList && searchElement.classList.contains('comfy-modal')) {
                    console.log(`🐝 Hive: Found comfy-modal at depth ${depth}, searching for close button...`);
                    // 优先查找 .p-dialog-close-button
                    let closeBtn = searchElement.querySelector('.p-dialog-close-button');
                    if (closeBtn) {
                        console.log(`🐝 Hive: Found .p-dialog-close-button in comfy-modal, clicking:`, closeBtn);
                        closeBtn.click();
                        return;
                    }
                    // 如果没有找到，尝试查找其他关闭按钮
                    closeBtn = searchElement.querySelector('button[type="button"]');
                    if (!closeBtn) {
                        const buttons = searchElement.querySelectorAll('button');
                        for (const btn of buttons) {
                            const btnText = btn.textContent.trim();
                            if (btnText === 'Close' || btnText === '关闭' || 
                                btnText === '确定' || btnText === 'OK') {
                                closeBtn = btn;
                                break;
                            }
                        }
                    }
                    if (closeBtn && (closeBtn.textContent.trim() === 'Close' || 
                        closeBtn.textContent.trim() === '关闭' ||
                        closeBtn.textContent.trim() === '确定' ||
                        closeBtn.textContent.trim() === 'OK')) {
                        console.log(`🐝 Hive: Found Close button in comfy-modal, clicking:`, closeBtn);
                        closeBtn.click();
                        return;
                    }
                }
                
                // 在当前元素内查找 comfy-modal 和 Close 按钮
                const comfyModal = searchElement.querySelector('.comfy-modal');
                if (comfyModal) {
                    console.log(`🐝 Hive: Found nested comfy-modal, searching for close button...`);
                    // 优先查找 .p-dialog-close-button
                    let closeBtn = comfyModal.querySelector('.p-dialog-close-button');
                    if (closeBtn) {
                        console.log(`🐝 Hive: Found .p-dialog-close-button in nested comfy-modal, clicking:`, closeBtn);
                        closeBtn.click();
                        return;
                    }
                    // 如果没有找到，尝试查找其他关闭按钮
                    closeBtn = comfyModal.querySelector('button[type="button"]');
                    if (!closeBtn) {
                        const buttons = comfyModal.querySelectorAll('button');
                        for (const btn of buttons) {
                            const btnText = btn.textContent.trim();
                            if (btnText === 'Close' || btnText === '关闭' || 
                                btnText === '确定' || btnText === 'OK') {
                                closeBtn = btn;
                                break;
                            }
                        }
                    }
                    if (closeBtn && (closeBtn.textContent.trim() === 'Close' || 
                        closeBtn.textContent.trim() === '关闭' ||
                        closeBtn.textContent.trim() === '确定' ||
                        closeBtn.textContent.trim() === 'OK')) {
                        console.log(`🐝 Hive: Found Close button in comfy-modal (nested), clicking:`, closeBtn);
                        closeBtn.click();
                        return;
                    }
                }
                
                searchElement = searchElement.parentElement;
                depth++;
            }
            
            // 如果向上查找没找到，尝试全局查找 comfy-modal 中的 Close 按钮
            console.log(`🐝 Hive: Searching globally for comfy-modal with close button...`);
            const comfyModals = document.querySelectorAll('.comfy-modal');
            console.log(`🐝 Hive: Found ${comfyModals.length} comfy-modal elements`);
            for (const modal of comfyModals) {
                const style = window.getComputedStyle(modal);
                // 检查模态框是否可见（display: flex 或 block）
                const isVisible = style.display !== 'none' && 
                                 style.visibility !== 'hidden' && 
                                 (style.display === 'flex' || style.display === 'block');
                console.log(`🐝 Hive: Checking modal, display: ${style.display}, visible: ${isVisible}`);
                
                if (isVisible) {
                    // 优先查找 .p-dialog-close-button
                    let closeBtn = modal.querySelector('.p-dialog-close-button');
                    if (closeBtn) {
                        const btnStyle = window.getComputedStyle(closeBtn);
                        const btnVisible = btnStyle.display !== 'none' && btnStyle.visibility !== 'hidden';
                        if (btnVisible) {
                            console.log(`🐝 Hive: Found .p-dialog-close-button in comfy-modal globally, clicking:`, closeBtn);
                            closeBtn.click();
                            return;
                        }
                    }
                    // 如果没有找到，尝试查找其他关闭按钮
                    closeBtn = modal.querySelector('button[type="button"]');
                    if (!closeBtn) {
                        const buttons = modal.querySelectorAll('button');
                        console.log(`🐝 Hive: Found ${buttons.length} buttons in modal`);
                        for (const btn of buttons) {
                            const btnText = btn.textContent.trim();
                            const ariaLabel = btn.getAttribute('aria-label');
                            console.log(`🐝 Hive: Button text: "${btnText}", aria-label: "${ariaLabel}"`);
                            if (btnText === 'Close' || btnText === '关闭' || 
                                btnText === '确定' || btnText === 'OK' ||
                                ariaLabel === 'Close' ||
                                ariaLabel === '关闭') {
                                closeBtn = btn;
                                break;
                            }
                        }
                    }
                    if (closeBtn) {
                        const btnText = closeBtn.textContent.trim();
                        if (btnText === 'Close' || btnText === '关闭' ||
                            btnText === '确定' || btnText === 'OK') {
                            console.log(`🐝 Hive: Found Close button in comfy-modal globally, clicking:`, closeBtn);
                            closeBtn.click();
                            return;
                        }
                    }
                }
            }
            
            // 最后的回退方案：再次全局查找所有可见的 .p-dialog-close-button
            console.log(`🐝 Hive: Final fallback - searching globally for all .p-dialog-close-button...`);
            const allCloseButtons = document.querySelectorAll('.p-dialog-close-button');
            console.log(`🐝 Hive: Found ${allCloseButtons.length} .p-dialog-close-button elements total`);
            for (const closeBtn of allCloseButtons) {
                const style = window.getComputedStyle(closeBtn);
                const isVisible = style.display !== 'none' && style.visibility !== 'hidden';
                const ariaLabel = closeBtn.getAttribute('aria-label');
                const parent = closeBtn.closest('.p-dialog, .comfy-modal, [role="dialog"]');
                const parentStyle = parent ? window.getComputedStyle(parent) : null;
                const parentVisible = !parent || (parentStyle && 
                    parentStyle.display !== 'none' && 
                    parentStyle.visibility !== 'hidden' &&
                    (parentStyle.display === 'flex' || parentStyle.display === 'block'));
                
                console.log(`🐝 Hive: Checking .p-dialog-close-button, visible: ${isVisible}, parent visible: ${parentVisible}, aria-label: "${ariaLabel}"`);
                
                if (isVisible && parentVisible && (ariaLabel === 'Close' || ariaLabel === '关闭')) {
                    console.log(`🐝 Hive: Found visible .p-dialog-close-button in visible dialog, clicking:`, closeBtn);
                    closeBtn.click();
                    return;
                }
            }
            
            console.warn(`🐝 Hive: Could not find any close button to click`);
            
            // 如果还是没找到，尝试查找 p-dialog-mask 内的关闭按钮
            const masks = document.querySelectorAll('.p-dialog-mask, .p-overlay-mask');
            for (const mask of masks) {
                const style = window.getComputedStyle(mask);
                if (style.display !== 'none' && style.visibility !== 'hidden') {
                    const closeBtn = mask.querySelector('.p-dialog-close-button');
                    if (closeBtn) {
                        console.log(`🐝 Hive: Found p-dialog-close-button in mask, clicking:`, closeBtn);
                        closeBtn.click();
                        return;
                    }
                }
            }
            
            console.warn(`🐝 Hive: Could not find Close button to click`);
        } catch (error) {
            console.error('🐝 Hive: Error closing dialog:', error);
        }
    }

    /**
     * 从库中下载模型
     */
    async function handleModelDownloadFromLibrary(libraryItem, itemElement) {
        const getText = (key) => {
            if (typeof window !== 'undefined' && typeof window.t === 'function') {
                return window.t(key);
            }
            return key;
        };

        // 获取模型下载URL
        const modelUrl = libraryItem.model_hf_url || libraryItem.model_mirror_url;
        
        if (!modelUrl) {
            showToast(getText('toast.modelUrlNotFound'), 'error');
            return;
        }

        // 从itemElement中提取模型路径信息，用于确定保存目录
        const modelText = itemElement.textContent || '';
        const modelPathMatch = modelText.match(/^([^\n]+)/);
        let saveDirectory = 'checkpoints'; // 默认目录
        
        if (modelPathMatch) {
            const parsed = parseModelPath(modelPathMatch[1]);
            saveDirectory = parsed.directory;
        }

        // 使用ComfyUI的API或直接触发下载
        // 这里我们需要使用Hive的模型下载功能
        // 由于需要与ComfyUI的节点系统交互，可能需要通过workflow来实现
        
        showToast(getText('toast.modelDownloadStarted') || '模型下载已开始', 'info');
        
        // 打开Hive侧边栏并导航到模型下载页面
        // 这里可以触发一个自定义事件，让主界面处理
        if (window.initializeHive) {
            // 确保Hive已初始化
            try {
                await window.initializeHive();
            } catch (e) {
                console.error('Failed to initialize Hive:', e);
            }
        }

        // 触发自定义事件，通知主界面需要下载模型
        const event = new CustomEvent('hive-download-model', {
            detail: {
                url: modelUrl,
                saveDirectory: saveDirectory,
                libraryItem: libraryItem
            }
        });
        window.dispatchEvent(event);
    }

    /**
     * 从库中安装节点
     */
    async function handleNodeInstallFromLibrary(libraryItem, itemElement) {
        const getText = (key) => {
            if (typeof window !== 'undefined' && typeof window.t === 'function') {
                return window.t(key);
            }
            return key;
        };

        // 获取节点安装URL
        const nodeLinks = libraryItem.extra?.node_links || [];
        
        if (!nodeLinks || nodeLinks.length === 0) {
            showToast(getText('toast.nodeUrlNotFound') || '未找到节点安装地址', 'error');
            return;
        }

        // 使用第一个可用的链接
        const nodeUrl = nodeLinks[0].url;
        
        if (!nodeUrl) {
            showToast(getText('toast.nodeUrlNotFound') || '节点安装地址无效', 'error');
            return;
        }

        showToast(getText('toast.nodeInstallStarted') || '节点安装已开始', 'info');

        // 触发自定义事件，通知主界面需要安装节点
        const event = new CustomEvent('hive-install-node', {
            detail: {
                url: nodeUrl,
                libraryItem: libraryItem
            }
        });
        window.dispatchEvent(event);
    }
    
    // 保存实例引用
    missingItemsEnhancerInstance = {
        processedDialogs,
        checkAndEnhanceDialog,
        enhanceMissingItemsDialog
    };
    
    // 导出手动触发检测的函数（用于调试）
    window.hiveMissingItemsEnhancer = {
        checkNow: () => {
            console.log('🐝 Hive: Manually checking for missing items dialogs...');
            const allDialogs = document.querySelectorAll('div, dialog, [role="dialog"]');
            let found = 0;
            allDialogs.forEach((dialog) => {
                const text = dialog.textContent || '';
                if (text.includes('缺少模型') || text.includes('缺少节点') || 
                    text.includes('缺少以下节点') ||
                    text.includes('Missing Models') || text.includes('Missing Nodes')) {
                    found++;
                    checkAndEnhanceDialog(dialog);
                }
            });
            console.log(`🐝 Hive: Checked ${allDialogs.length} elements, found ${found} potential dialogs`);
        },
        reset: () => {
            processedDialogs = new WeakSet();
            if (missingItemsEnhancerInstance) {
                missingItemsEnhancerInstance.processedDialogs = processedDialogs;
            }
            console.log('🐝 Hive: Reset processed dialogs cache');
        }
    };
    
    console.log('🐝 Hive: Missing items enhancer ready. Use window.hiveMissingItemsEnhancer.checkNow() to manually check.');
}

