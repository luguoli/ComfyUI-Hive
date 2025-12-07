// web/js/hive_data.js - Supabase 数据层

// Supabase 客户端实例
let supabase = null;
let supabaseUrl = null;
let supabaseKey = null;
let currentUser = null;
let profileCache = new Map(); // 头像昵称缓存

// 计算文件的SHA-256哈希值（用于生成文件名）
// 注意：浏览器不支持MD5，使用SHA-256代替
async function calculateFileHash(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const arrayBuffer = e.target.result;
                const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
                resolve(hashHex);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsArrayBuffer(file);
    });
}

// 加载 NSFWJS 模型
let nsfwModel = null;
let nsfwModelLoading = false;
let nsfwModelLoadPromise = null;
let nsfwModelLoadFailed = false; // 标记模型加载是否已失败

async function loadNSFWModel() {
    // 如果模型已加载，直接返回
    if (nsfwModel) {
        return nsfwModel;
    }
    
    // 如果之前加载失败，直接返回 null（跳过检测）
    if (nsfwModelLoadFailed) {
        return null;
    }
    
    // 如果正在加载，返回加载中的 Promise
    if (nsfwModelLoading && nsfwModelLoadPromise) {
        return nsfwModelLoadPromise;
    }
    
    // 开始加载模型
    nsfwModelLoading = true;
    nsfwModelLoadPromise = new Promise((resolve, reject) => {
        // 检查是否已经加载了 NSFWJS
        if (window.nsfwjs && window.nsfwjs.load) {
            console.log('🐝 Hive: NSFWJS library already loaded, loading model from local path...');
            // 使用本地模型路径（注意：WEB_DIRECTORY 指向 ./web，所以路径不包含 web/）
            const localModelPath = '/extensions/ComfyUI-Hive/models/nsfw/';
            
            window.nsfwjs.load(localModelPath)
                .then(model => {
                    nsfwModel = model;
                    nsfwModelLoading = false;
                    console.log('🐝 Hive: NSFWJS model loaded successfully from local path:', localModelPath);
                    resolve(model);
                })
                .catch(error => {
                    nsfwModelLoading = false;
                    nsfwModelLoadPromise = null;
                    nsfwModelLoadFailed = true;
                    console.warn('🐝 Hive: Failed to load NSFWJS model from local path:', error);
                    resolve(null); // 返回 null 而不是抛出错误
                });
            return;
        }
        
        // 先检查是否需要加载 TensorFlow.js（NSFWJS 的依赖）
        const loadTensorFlow = () => {
            return new Promise((resolve) => {
                if (window.tf) {
                    console.log('🐝 Hive: TensorFlow.js already loaded');
                    resolve();
                    return;
                }
                
                const tfScript = document.createElement('script');
                tfScript.src = '/extensions/ComfyUI-Hive/lib/tf.min.js';
                tfScript.onload = () => {
                    console.log('🐝 Hive: TensorFlow.js loaded from local path');
                    resolve();
                };
                tfScript.onerror = () => {
                    console.warn('🐝 Hive: Failed to load TensorFlow.js from local path, NSFWJS may not work');
                    resolve(); // 继续尝试加载 NSFWJS
                };
                document.head.appendChild(tfScript);
            });
        };
        
        // 加载本地 NSFWJS 库文件
        loadTensorFlow().then(() => {
            const localLibPath = '/extensions/ComfyUI-Hive/lib/nsfwjs.min.js';
            console.log('🐝 Hive: Loading NSFWJS library from local path:', localLibPath);
            
            const script = document.createElement('script');
            script.src = localLibPath;
            
            script.onload = () => {
                setTimeout(() => {
                    if (window.nsfwjs && window.nsfwjs.load) {
                        console.log('🐝 Hive: NSFWJS library loaded, loading model from local path...');
                        // 使用本地模型路径（注意：WEB_DIRECTORY 指向 ./web，所以路径不包含 web/）
                        const localModelPath = '/extensions/ComfyUI-Hive/models/nsfw/';
                        
                        window.nsfwjs.load(localModelPath)
                            .then(model => {
                                nsfwModel = model;
                                nsfwModelLoading = false;
                                console.log('🐝 Hive: NSFWJS model loaded successfully from local path:', localModelPath);
                                resolve(model);
                            })
                            .catch(error => {
                                nsfwModelLoading = false;
                                nsfwModelLoadPromise = null;
                                nsfwModelLoadFailed = true;
                                console.warn('🐝 Hive: Failed to load NSFWJS model from local path:', error);
                                resolve(null); // 返回 null 而不是抛出错误
                            });
                    } else {
                        nsfwModelLoading = false;
                        nsfwModelLoadPromise = null;
                        nsfwModelLoadFailed = true;
                        console.warn('🐝 Hive: Script loaded but nsfwjs not found');
                        resolve(null);
                    }
                }, 100);
            };
            
            script.onerror = () => {
                nsfwModelLoading = false;
                nsfwModelLoadPromise = null;
                nsfwModelLoadFailed = true;
                console.warn('🐝 Hive: Failed to load NSFWJS library from local path');
                resolve(null);
            };
            
            document.head.appendChild(script);
        });
    });
    
    return nsfwModelLoadPromise;
}

// 使用 NSFWJS 检测图片内容
async function detectNSFW(imageBlob) {
    try {
        // 加载模型（如果尚未加载）
        const model = await loadNSFWModel();
        
        // 如果模型未加载（所有源都失败），跳过检测
        if (!model) {
            console.log('🐝 Hive: NSFW model not available, skipping detection');
            return {
                isNSFW: false,
                predictions: [],
                maxProbability: 0,
                detectedClass: null,
                skipped: true
            };
        }
        
        // 创建图片元素
        const img = new Image();
        const imageUrl = URL.createObjectURL(imageBlob);
        
        return new Promise((resolve, reject) => {
            img.onload = async () => {
                try {
                    // 使用 NSFWJS 分类图片
                    const predictions = await model.classify(img);
                    
                    // 定义 NSFW 类别及其对应的阈值
                    // Porn: > 0.70 - 拦截所有真人裸照、性行为
                    // Hentai: > 0.7 - 拦截二次元本子，偶尔可能会误杀肉色极多的正常动漫（可接受）
                    // Sexy: > 0.9 - 放行泳装、自拍、Cosplay；仅拦截近乎全裸的擦边图
                    const nsfwThresholds = {
                        'Porn': 0.70,
                        'Hentai': 0.7,
                        'Sexy': 0.9
                    };
                    
                    // 提取并打印三个关键类别的检测值
                    let pornValue = 0;
                    let hentaiValue = 0;
                    let sexyValue = 0;
                    
                    for (const prediction of predictions) {
                        if (prediction.className === 'Porn') {
                            pornValue = prediction.probability;
                        } else if (prediction.className === 'Hentai') {
                            hentaiValue = prediction.probability;
                        } else if (prediction.className === 'Sexy') {
                            sexyValue = prediction.probability;
                        }
                    }
                    
                    // 在控制台打印检测结果
                    console.log('🐝 Hive: NSFW Detection Results:', {
                        'Porn': (pornValue * 100).toFixed(2) + '%',
                        'Hentai': (hentaiValue * 100).toFixed(2) + '%',
                        'Sexy': (sexyValue * 100).toFixed(2) + '%',
                        'Thresholds': {
                            'Porn': '> 70%',
                            'Hentai': '> 70%',
                            'Sexy': '> 90%'
                        }
                    });
                    
                    // 检查是否有 NSFW 内容
                    let isNSFW = false;
                    let maxProbability = 0;
                    let detectedClass = null;
                    
                    for (const prediction of predictions) {
                        const className = prediction.className;
                        const threshold = nsfwThresholds[className];
                        
                        // 如果该类别有阈值设置，且概率超过阈值，则拦截
                        if (threshold !== undefined && prediction.probability > threshold) {
                            isNSFW = true;
                            if (prediction.probability > maxProbability) {
                                maxProbability = prediction.probability;
                                detectedClass = className;
                            }
                        }
                    }
                    
                    // 如果检测到 NSFW 内容，打印拦截信息
                    if (isNSFW) {
                        console.log(`🐝 Hive: NSFW content detected and blocked: ${detectedClass} (${(maxProbability * 100).toFixed(2)}%)`);
                    }
                    
                    // 清理 URL
                    URL.revokeObjectURL(imageUrl);
                    
                    resolve({
                        isNSFW: isNSFW,
                        predictions: predictions,
                        maxProbability: maxProbability,
                        detectedClass: detectedClass
                    });
                } catch (error) {
                    URL.revokeObjectURL(imageUrl);
                    console.error('🐝 Hive: NSFW detection error:', error);
                    // 检测出错时，允许图片通过
                    resolve({
                        isNSFW: false,
                        predictions: [],
                        maxProbability: 0,
                        detectedClass: null,
                        error: error.message
                    });
                }
            };
            
            img.onerror = () => {
                URL.revokeObjectURL(imageUrl);
                // 图片加载失败时，允许通过
                resolve({
                    isNSFW: false,
                    predictions: [],
                    maxProbability: 0,
                    detectedClass: null,
                    error: 'Failed to load image for NSFW detection'
                });
            };
            
            img.src = imageUrl;
        });
    } catch (error) {
        console.warn('🐝 Hive: NSFW detection failed, allowing image:', error);
        // 如果检测失败，允许图片通过（避免误拦截）
        return {
            isNSFW: false,
            predictions: [],
            maxProbability: 0,
            detectedClass: null,
            error: error.message
        };
    }
}

// 图片压缩
async function compressImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                let width = img.width;
                let height = img.height;
                const maxDimension = 1280;
                
                // 检查是否需要缩放
                let needsResize = false;
                if (width > maxDimension || height > maxDimension) {
                    // 需要缩放，按比例计算新尺寸
                    needsResize = true;
                    if (width > height) {
                        height = (height / width) * maxDimension;
                        width = maxDimension;
                    } else {
                        width = (width / height) * maxDimension;
                        height = maxDimension;
                    }
                }
                
                // 创建canvas进行缩放或质量压缩
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                // 转换为blob，无论是否缩放都进行质量压缩（90%质量）
                canvas.toBlob(async (blob) => {
                    if (blob) {
                        // 压缩完成后，进行 NSFW 检测
                        try {
                            const nsfwResult = await detectNSFW(blob);
                            
                            if (nsfwResult.isNSFW) {
                                const className = nsfwResult.detectedClass;
                                const probability = (nsfwResult.maxProbability * 100).toFixed(1);
                                const nsfwErrorMsg = typeof window !== 'undefined' && typeof window.t === 'function' 
                                    ? window.t('toast.nsfwContentDetected', { className: className, probability: probability })
                                    : (typeof window !== 'undefined' && typeof window.t === 'function' 
                                        ? window.t('toast.nsfwContentDetected', { className: className, probability: probability })
                                        : `Image contains inappropriate content (${className}, confidence: ${probability}%), blocked`);
                                reject(new Error(nsfwErrorMsg));
                                return;
                            }
                            
                            resolve({
                                blob: blob,
                                originalName: file.name,
                                needsResize: needsResize
                            });
                        } catch (error) {
                            // 如果检测过程中出错，根据错误类型决定是否允许
                            // 使用语言文件的错误消息关键词来检测 NSFW 错误
                            const nsfwErrorText = typeof window !== 'undefined' && typeof window.t === 'function' 
                                ? window.t('toast.nsfwContentDetected', { className: '', probability: '0' })
                                : 'inappropriate content';
                            // Use keywords to detect NSFW errors
                            const nsfwKeywords = ['inappropriate content', 'NSFW', 'nsfw'];
                            // Also check for Chinese keywords in case language file was used
                            if (typeof window !== 'undefined' && typeof window.t === 'function') {
                                const chineseKeyword = window.t('toast.nsfwContentDetected', { className: 'test', probability: '0' });
                                // Check if Chinese keyword exists in error message
                                if (chineseKeyword && chineseKeyword.includes('inappropriate') || error.message.includes('NSFW')) {
                                    // Already covered by English keywords
                                }
                            }
                            if (error.message && nsfwKeywords.some(keyword => error.message.includes(keyword))) {
                                reject(error);
                            } else {
                                // 检测失败，允许图片通过
                                console.warn('🐝 Hive: NSFW detection error, allowing image:', error);
                                resolve({
                                    blob: blob,
                                    originalName: file.name,
                                    needsResize: needsResize
                                });
                            }
                        }
                    } else {
                        reject(new Error('Failed to compress image'));
                    }
                }, file.type, 0.9); // 90%质量
            };
            
            img.onerror = () => {
                reject(new Error('Failed to load image'));
            };
            
            img.src = e.target.result;
        };
        
        reader.onerror = () => {
            reject(new Error('Failed to read file'));
        };
        
        reader.readAsDataURL(file);
    });
}

// 验证是否是有效的ComfyUI工作流JSON
export function isValidComfyUIWorkflow(data) {
    if (!data || typeof data !== 'object') {
        return false;
    }
    
    // ComfyUI工作流必须包含nodes数组
    if (!data.nodes || !Array.isArray(data.nodes)) {
        return false;
    }
    
    // 如果nodes数组为空，也认为是有效的工作流（可能是空工作流）
    if (data.nodes.length === 0) {
        return true;
    }
    
    // 验证nodes数组中的每个节点都有基本结构
    // ComfyUI节点至少应该是对象，id可以是数字或字符串
    for (const node of data.nodes) {
        if (!node || typeof node !== 'object') {
            return false;
        }
        // 节点应该有id（数字或字符串），type字段是可选的（某些节点可能没有type）
        if (node.id === undefined || node.id === null) {
            return false;
        }
        // id可以是数字或字符串
        if (typeof node.id !== 'number' && typeof node.id !== 'string') {
            return false;
        }
    }
    
    return true;
}

// 从图片中提取工作流数据（使用PNG块解析方法）
export async function extractWorkflowFromImage(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const buffer = event.target.result;
                const view = new DataView(buffer);
                const decoder = new TextDecoder("utf-8"); // iTXt 使用 utf-8
                const textDecoder = new TextDecoder("iso-8859-1"); // tEXt 使用 iso-8859-1
                
                // 1. 验证 PNG 签名 (89 50 4E 47 0D 0A 1A 0A)
                if (view.getUint32(0) !== 0x89504e47 || view.getUint32(4) !== 0x0d0a1a0a) {
                    // 不是 PNG，尝试从文件末尾查找JSON（对于其他格式的图片）
                    console.log('🐝 Hive: Not a PNG file, trying to find JSON at end of file');
                    const uint8Array = new Uint8Array(buffer);
                    const searchLength = Math.min(50000, uint8Array.length);
                    const searchStart = uint8Array.length - searchLength;
                    const searchArray = uint8Array.slice(searchStart);
                    const fileString = decoder.decode(searchArray);
                
                    // 对于非PNG图片，尝试从文件末尾查找JSON
                    const findWorkflowJSON = (text) => {
                        const nodesIndex = text.lastIndexOf('"nodes"');
                        if (nodesIndex === -1) return null;
                        
                        let startPos = nodesIndex;
                        while (startPos >= 0 && text[startPos] !== '{') {
                            startPos--;
                        }
                        if (startPos === -1) return null;
                        
                        let depth = 0;
                        let endPos = startPos;
                        for (let i = startPos; i < text.length; i++) {
                            if (text[i] === '{') depth++;
                            else if (text[i] === '}') {
                                depth--;
                                if (depth === 0) {
                                    endPos = i;
                                    break;
                                }
                            }
                        }
                        if (depth === 0 && endPos > startPos) {
                            return text.substring(startPos, endPos + 1);
                        }
                        return null;
                    };
                    
                    const jsonStr = findWorkflowJSON(fileString);
                    if (jsonStr) {
                        try {
                            const jsonData = JSON.parse(jsonStr);
                            if (jsonData && typeof jsonData === 'object' && jsonData.nodes && Array.isArray(jsonData.nodes)) {
                                console.log('🐝 Hive: Found workflow data in non-PNG image');
                                resolve({ workflow: jsonData, prompt: null });
                                return;
                            }
                        } catch (error) {
                            console.log('🐝 Hive: Failed to parse JSON from non-PNG image:', error.message);
                        }
                    }
                    
                    resolve(null);
                    return;
                }
                
                // 2. 遍历PNG数据块
                const result = { workflow: null, prompt: null };
                let offset = 8; // 跳过签名
                
                while (offset < buffer.byteLength) {
                    // 读取块长度 (4字节)
                    const length = view.getUint32(offset);
                    offset += 4;
                    
                    // 读取块类型 (4字节)
                    const type = textDecoder.decode(new Uint8Array(buffer, offset, 4));
                    offset += 4;
                    
                    // 如果是 tEXt 或 iTXt (包含文本数据)
                    if (type === 'tEXt' || type === 'iTXt') {
                        const dataStart = offset;
                        const dataEnd = offset + length;
                        
                        // 获取该块的全部二进制数据
                        const chunkData = new Uint8Array(buffer, dataStart, length);
                        
                        // 寻找关键字和内容的分隔符 (Null Separator: 0x00)
                        let separatorIndex = -1;
                        for (let i = 0; i < length; i++) {
                            if (chunkData[i] === 0) {
                                separatorIndex = i;
                                break;
                            }
                        }
                        
                        if (separatorIndex !== -1) {
                            // 提取关键字 (Keyword)
                            const keyword = textDecoder.decode(chunkData.slice(0, separatorIndex));
                            
                            // 提取内容 (Text)
                            let textData = null;
                            
                            if (type === 'tEXt') {
                                textData = textDecoder.decode(chunkData.slice(separatorIndex + 1));
                            } else {
                                // iTXt 结构更复杂
                                let textStart = separatorIndex + 1;
                                // 跳过压缩标志(1) + 压缩方法(1)
                                if (textStart + 2 < length) {
                                    textStart += 2;
                                    // 跳过语言标签(null terminated)
                                    while(textStart < length && chunkData[textStart] !== 0) textStart++;
                                    textStart++;
                                    // 跳过翻译关键字(null terminated)
                                    while(textStart < length && chunkData[textStart] !== 0) textStart++;
                                    textStart++;
                                }
                                textData = decoder.decode(chunkData.slice(textStart));
                            }
                            
                            // 🎯 核心逻辑：匹配 ComfyUI 的关键字
                            if (keyword === 'workflow') {
                                try {
                                    const workflowData = JSON.parse(textData);
                                    if (workflowData && typeof workflowData === 'object' && workflowData.nodes && Array.isArray(workflowData.nodes)) {
                                        console.log('🐝 Hive: Found workflow data in PNG tEXt/iTXt chunk:', {
                                            keyword: keyword,
                                            nodesCount: workflowData.nodes.length
                                        });
                                        result.workflow = workflowData;
                                    }
                                } catch(e) {
                                    console.log('🐝 Hive: Failed to parse workflow JSON from PNG chunk:', e.message);
                                }
                            } else if (keyword === 'prompt') {
                                try {
                                    result.prompt = JSON.parse(textData);
                                } catch(e) {
                                    console.log('🐝 Hive: Failed to parse prompt JSON from PNG chunk:', e.message);
                                }
                            }
                        }
                    }
                    
                    // 跳过数据区 + CRC校验码 (4字节)
                    offset += length + 4;
                }
                
                // 返回工作流与提示词（如果有）
                if (result.workflow) {
                    resolve(result);
                } else {
                    console.log('🐝 Hive: No workflow data found in PNG chunks');
                    resolve(null);
                }
            } catch (error) {
                console.log('🐝 Hive: Error extracting workflow from image:', error);
                resolve(null);
            }
        };
        
        reader.onerror = () => {
            resolve(null);
        };
        
        reader.readAsArrayBuffer(file);
    });
}

// 初始化 Supabase
export function initSupabase(url, key) {
    // 检查是否已经存在相同配置的客户端实例
    if (supabase && supabaseUrl === url && supabaseKey === key) {
        console.log('🐝 Hive: Supabase already initialized with the same configuration, reusing existing instance');
        return;
    }
    
    // 如果配置不同，记录警告并创建新实例
    if (supabase && (supabaseUrl !== url || supabaseKey !== key)) {
        console.warn('🐝 Hive: Supabase configuration changed, creating new client instance');
        console.warn('🐝 Hive: Old URL:', supabaseUrl, 'New URL:', url);
    }
    
    supabaseUrl = url;
    supabaseKey = key;
    supabase = window.supabase.createClient(url, key);
    console.log('🐝 Hive: Supabase initialized');
}

// 游客登录
export async function loginGuest() {
    try {
        // 检查本地存储
        const stored = localStorage.getItem('hive_guest_user');
        if (stored) {
            currentUser = JSON.parse(stored);
            console.log('🐝 Hive: Loaded user from localStorage:', currentUser);
            return currentUser;
        }

        // 生成游客信息
        const uuid = crypto.randomUUID();
        const randomSuffix = Math.random().toString(36).substr(2, 5);
        const username = `Guest_${randomSuffix}`;
        const avatar_url = `https://api.dicebear.com/7.x/avataaars/svg?seed=${uuid}`;

        // 插入到数据库
        const { data, error } = await supabase
            .from('hive_profiles')
            .insert({
                id: uuid,
                username: username,
                avatar_url: avatar_url
            })
            .select()
            .single();

        if (error) {
            // 如果插入失败（可能UUID重复），直接使用本地随机数据
            console.warn('🐝 Hive: Failed to insert guest user, using local:', error);
            currentUser = { id: uuid, username, avatar_url };
        } else {
            currentUser = data;
        }

        // 保存到本地存储
        localStorage.setItem('hive_guest_user', JSON.stringify(currentUser));
        console.log('🐝 Hive: Created guest user:', currentUser);

        return currentUser;
    } catch (error) {
        console.error('🐝 Hive: Guest login failed:', error);
        // 降级到本地模式
        currentUser = {
            id: 'local_' + Date.now(),
            username: 'LocalUser',
            avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=local'
        };
        localStorage.setItem('hive_guest_user', JSON.stringify(currentUser));
        return currentUser;
    }
}

// 获取频道列表
export async function fetchChannels() {
    try {
        const { data, error } = await supabase
            .from('hive_channels')
            .select('*')
            .order('sort_order', { ascending: true })
            .order('id', { ascending: true }); // 如果sort_order相同，按id排序

        if (error) throw error;

        console.log('🐝 Hive: Fetched channels:', data);
        return data || [];
    } catch (error) {
        console.error('🐝 Hive: Failed to fetch channels:', error);
        return [];
    }
}

// 获取用户头像昵称（带缓存）
export async function getUserProfile(userId) {
    if (profileCache.has(userId)) {
        return profileCache.get(userId);
    }

    try {
        const { data, error } = await supabase
            .from('hive_profiles')
            .select('id, username, avatar_url')
            .eq('id', userId)
            .single();

        if (error || !data) {
            // 返回默认头像
            const defaultProfile = {
                id: userId,
                username: 'Unknown',
                avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=unknown'
            };
            profileCache.set(userId, defaultProfile);
            return defaultProfile;
        }

        profileCache.set(userId, data);
        return data;
    } catch (error) {
        console.error('🐝 Hive: Failed to get user profile:', error);
        const defaultProfile = {
            id: userId,
            username: 'Unknown',
            avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=unknown'
        };
        profileCache.set(userId, defaultProfile);
        return defaultProfile;
    }
}

// 更新用户资料
export async function updateUserProfile(userId, updates) {
    try {
        console.log('🐝 Hive: Updating user profile via RPC:', { userId, updates });

        // 使用 RPC 函数更新用户资料
        // RPC 函数使用 SECURITY DEFINER，可以绕过 RLS 策略
        const { data, error } = await supabase
            .rpc('update_user_profile', {
                p_user_id: userId,
                p_username: updates.username || null,
                p_avatar_url: updates.avatar_url || null
            });

        if (error) {
            console.error('🐝 Hive: RPC update_user_profile failed:', error);
            throw error;
        }

        // RPC 函数返回的是数组，需要取第一个元素
        const result = Array.isArray(data) && data.length > 0 ? data[0] : data;

        if (!result) {
            const errorMsg = typeof window !== 'undefined' && typeof window.t === 'function' 
                ? window.t('toast.updateUserProfileFailed') 
                : 'Failed to update user profile: RPC function did not return data';
            throw new Error(errorMsg);
        }

        // 将 RPC 函数返回的列名映射回标准格式
        // 支持多种可能的列名格式
        const profileData = {
            id: result.user_id || result.result_id || result.id,
            username: result.user_name || result.result_username || result.username,
            avatar_url: result.user_avatar_url || result.result_avatar_url || result.avatar_url
        };

        // 更新缓存
        profileCache.set(userId, profileData);

        // 如果是当前用户，更新 currentUser
        if (currentUser && currentUser.id === userId) {
            currentUser = { ...currentUser, ...updates };
            localStorage.setItem('hive_guest_user', JSON.stringify(currentUser));
        }

        console.log('🐝 Hive: User profile updated successfully:', profileData);
        return profileData;
    } catch (error) {
        console.error('🐝 Hive: Failed to update user profile:', error);
        throw error;
    }
}

// 清除用户资料缓存
export function clearUserProfileCache(userId) {
    if (userId) {
        profileCache.delete(userId);
    } else {
        profileCache.clear();
    }
}

// 生成随机头像URL
export function generateRandomAvatar() {
    const seed = crypto.randomUUID();
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
}

// 检查用户是否被禁用
export async function checkUserDisabled(userId) {
    try {
        if (!supabase || !userId) {
            return false;
        }

        const { data, error } = await supabase
            .from('hive_profiles')
            .select('is_disabled')
            .eq('id', userId)
            .single();

        if (error || !data) {
            console.warn('🐝 Hive: Failed to check user disabled status:', error);
            return false; // 如果查询失败，允许发送（避免误封）
        }

        return data.is_disabled === true;
    } catch (error) {
        console.error('🐝 Hive: Error checking user disabled status:', error);
        return false; // 如果出现异常，允许发送（避免误封）
    }
}

// 发送消息
export async function sendMessage(channelId, content, file = null, workflowDataOverride = null) {
    try {
        // 检查用户是否被禁用
        if (currentUser && currentUser.id) {
            const isDisabled = await checkUserDisabled(currentUser.id);
            if (isDisabled) {
                const errorMsg = typeof window !== 'undefined' && typeof window.t === 'function' 
                    ? window.t('toast.userDisabled') 
                    : 'Your account has been disabled. You cannot send messages in channels.';
                throw new Error(errorMsg);
            }
        }
        let fileUrl = null;
        let workflowData = null;
        let originalFileName = null;
        let promptData = null;

        // 如果有文件，先处理
        if (file) {
            originalFileName = file.name;
            
            if (file.type.startsWith('image/')) {
                // 处理图片：先提取工作流数据，再压缩
                console.log('🐝 Hive: Processing image file:', file.name);
                
                // 如果workflowDataOverride不为null，使用它（null表示用户选择不携带，undefined表示未询问）
                if (workflowDataOverride !== undefined) {
                    workflowData = workflowDataOverride;
                } else {
                    // 先尝试从原图提取工作流数据和提示词（在压缩之前）
                    const extracted = await extractWorkflowFromImage(file);
                    if (extracted && extracted.workflow) {
                        workflowData = extracted.workflow;
                        promptData = extracted.prompt || null;
                    }
                }
                
                // 压缩图片（如果需要）
                const processed = await compressImage(file);
                file = processed.blob; // 使用处理后的blob
                
                console.log('🐝 Hive: Image processed, resized:', processed.needsResize, 'workflow data:', workflowData ? 'found' : 'not found');
            } else if (file.name.endsWith('.json')) {
                // 处理JSON文件：读取工作流数据
                try {
                    // 先读取文件内容（需要克隆，因为text()会消耗file对象）
                    const text = await file.text();
                    const parsedData = JSON.parse(text);
                    
                    // 验证是否是有效的ComfyUI工作流
                    if (!isValidComfyUIWorkflow(parsedData)) {
                        throw new Error(typeof window !== 'undefined' && typeof window.t === 'function' ? window.t('toast.notComfyUIWorkflow') : 'Not a valid ComfyUI workflow file');
                    }
                    
                    workflowData = parsedData;
                    console.log('🐝 Hive: Found valid ComfyUI workflow data in JSON file');
                    
                    // 重新创建File对象以便上传（因为text()已经消耗了原file对象）
                    const blob = new Blob([text], { type: 'application/json' });
                    file = new File([blob], originalFileName, { type: 'application/json' });
                } catch (error) {
                    console.warn('🐝 Hive: Failed to parse or validate JSON file:', error);
                    throw error; // 重新抛出错误，让调用者处理
                }
            }
            
            // 上传文件
            // 使用文件的SHA-256哈希值作为文件名（MD5在浏览器中不可用，使用SHA-256代替）
            const fileHash = await calculateFileHash(file);
            const fileExt = originalFileName.substring(originalFileName.lastIndexOf('.'));
            let fileName = `${fileHash}${fileExt}`;
            
            console.log('🐝 Hive: Uploading file with hash name:', fileName, 'original:', originalFileName);
            
            // 尝试上传文件，如果文件已存在则直接使用现有文件（不覆盖）
            let { data: fileData, error: uploadError } = await supabase.storage
                .from('chat-files')
                .upload(fileName, file);

            // 如果上传失败，处理不同的错误情况
            if (uploadError) {
                if (uploadError.message && uploadError.message.includes('already exists')) {
                    console.log('🐝 Hive: File already exists, using existing file:', fileName);
                    // 文件已存在，直接使用现有文件，不覆盖
                    fileData = { path: fileName };
                } else if (uploadError.message && uploadError.message.includes('row-level security')) {
                    // RLS策略错误，提示用户
                    console.error('🐝 Hive: Storage RLS policy error:', uploadError);
                    const uploadErrorMsg = typeof window !== 'undefined' && typeof window.t === 'function' 
                        ? window.t('toast.fileUploadFailed') 
                        : 'File upload failed: Please check Supabase storage bucket RLS policy configuration';
                    throw new Error(uploadErrorMsg);
                } else {
                    throw uploadError;
                }
            }

            const { data: urlData } = supabase.storage
                .from('chat-files')
                .getPublicUrl(fileName);

            fileUrl = urlData.publicUrl;
        }

        // 插入消息
        const metadata = {};
        if (file) {
            if (file.type && file.type.startsWith('image/')) {
                metadata.type = 'image';
            } else if (originalFileName && originalFileName.endsWith('.json')) {
                metadata.type = 'workflow';
            } else {
                metadata.type = 'workflow'; // 默认
            }
            metadata.file_url = fileUrl;
            metadata.original_filename = originalFileName; // 保存原始文件名
            
            // 如果有工作流数据，添加到metadata
            if (workflowData) {
                metadata.workflow_data = workflowData;
                console.log('🐝 Hive: Adding workflow_data to metadata:', {
                    hasWorkflowData: true,
                    workflowDataType: typeof workflowData,
                    hasNodes: workflowData.nodes ? true : false,
                    nodesCount: workflowData.nodes ? workflowData.nodes.length : 0
                });
            } else {
                console.log('🐝 Hive: No workflow_data to add to metadata');
            }

            // 如果从图片中解析出了提示词，也一并写入 metadata，方便前端展示
            if (promptData) {
                metadata.prompt = promptData;
            }
        }

        console.log('🐝 Hive: Inserting message with metadata:', {
            hasFile: !!file,
            metadataType: metadata.type,
            hasWorkflowData: !!metadata.workflow_data,
            metadata: metadata
        });

        const { data, error } = await supabase
            .from('hive_messages')
            .insert({
                channel_id: channelId,
                user_id: currentUser.id,
                content: content,
                metadata: metadata
            })
            .select()
            .single();

        if (error) throw error;

        console.log('🐝 Hive: Message sent, returned data:', {
            id: data.id,
            hasMetadata: !!data.metadata,
            metadataType: data.metadata?.type,
            hasWorkflowData: !!data.metadata?.workflow_data,
            workflowDataType: typeof data.metadata?.workflow_data
        });
        return data;
    } catch (error) {
        console.error('🐝 Hive: Failed to send message:', error);
        throw error;
    }
}

// 加入频道 - 实时连接
export function joinChannel(channelId, onMessage, onPresence, onStatus) {
    if (!supabase) {
        console.error('🐝 Hive: Supabase not initialized');
        return null;
    }

    const channelName = `hive_channel_${channelId}`;
    const realtimeChannel = supabase.channel(channelName);

    // 计算在线人数的辅助函数
    const getOnlineCount = () => {
        const presenceState = realtimeChannel.presenceState();
        // presenceState 的格式: { "user-id": [{...}, {...}], ... }
        // 需要统计所有有 presence 的用户数量（去重）
        const onlineCount = Object.keys(presenceState).length;
        return onlineCount;
    };

    // 暴露 getOnlineCount 给外部使用
    realtimeChannel.getOnlineCount = getOnlineCount;

    // 先注册 Presence 事件监听器（必须在 subscribe 之前）
    realtimeChannel.on('presence', { event: 'sync' }, () => {
        const onlineCount = getOnlineCount();
        if (onPresence) {
            onPresence(onlineCount);
        }
    });

    realtimeChannel.on('presence', { event: 'join' }, () => {
        const onlineCount = getOnlineCount();
        if (onPresence) {
            onPresence(onlineCount);
        }
    });

    realtimeChannel.on('presence', { event: 'leave' }, () => {
        const onlineCount = getOnlineCount();
        if (onPresence) {
            onPresence(onlineCount);
        }
    });

    // 订阅消息插入事件
    realtimeChannel.on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'hive_messages',
        filter: `channel_id=eq.${channelId}`
    }, async (payload) => {
        console.log('🐝 Hive: New message from realtime:', payload.new);

        // 获取用户资料
        const profile = await getUserProfile(payload.new.user_id);
        const enrichedMessage = {
            ...payload.new,
            profile: profile
        };

        // 检查是否是自己刚发送的消息（通过消息ID判断）
        // 如果是自己发送的，可能已经在界面上显示了，需要去重
        const chatMessages = document.querySelector('.chat-messages');
        if (chatMessages) {
            // 检查是否已经显示了这条消息（通过消息ID）
            const existingMessage = chatMessages.querySelector(`[data-message-id="${payload.new.id}"]`);
            if (existingMessage) {
                console.log('🐝 Hive: Message already displayed, skipping duplicate');
                return;
            }
        }

        onMessage(enrichedMessage);
    });

    // 订阅频道（统一使用一个 subscribe）
    realtimeChannel.subscribe(async (status) => {
        console.log(`🐝 Hive: Channel ${channelId} subscription status:`, status);

        // 通知上层当前连接状态（用于 UI 禁用、自动重连等）
        if (typeof onStatus === 'function') {
            try {
                onStatus(status);
            } catch (e) {
                console.error('🐝 Hive: onStatus callback error:', e);
            }
        }
        
        if (status === 'SUBSCRIBED') {
            // 在 SUBSCRIBED 后立即 track
            try {
                await realtimeChannel.track({
                    user_id: currentUser.id,
                    username: currentUser.username,
                    avatar_url: currentUser.avatar_url,
                    online_at: new Date().toISOString()
                });
                
                // track 后，多次尝试获取 Presence 状态，确保能正确显示
                const checkPresence = (attempt = 1) => {
                    setTimeout(() => {
                        const onlineCount = getOnlineCount();
                        
                        if (onPresence) {
                            onPresence(onlineCount);
                        }
                        
                        // 如果还没有看到自己的 presence（onlineCount 为 0），继续尝试
                        if (onlineCount === 0 && attempt < 5) {
                            checkPresence(attempt + 1);
                        }
                    }, 500 * attempt); // 每次延迟递增：500ms, 1000ms, 1500ms...
                };
                
                checkPresence(1);
            } catch (error) {
                console.error(`🐝 Hive: Failed to track presence for channel ${channelId}:`, error);
            }
        }
    });

    return realtimeChannel;
}

// 离开频道
export function leaveChannel(realtimeChannel) {
    if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
    }
}

// 获取频道历史消息
// beforeTimestamp: 仅获取该时间之前的消息（用于向上翻历史）
// afterTimestamp: 仅获取该时间之后的消息（用于补齐断线期间遗漏的新消息）
export async function fetchChannelMessages(channelId, limit = 50, beforeTimestamp = null, afterTimestamp = null) {
    try {
        let query = supabase
            .from('hive_messages')
            .select('*')
            .eq('channel_id', channelId)
            .order('created_at', { ascending: false })
            .limit(limit);

        // 如果指定了 beforeTimestamp，只获取该时间之前的消息
        if (beforeTimestamp) {
            query = query.lt('created_at', beforeTimestamp);
        }

        // 如果指定了 afterTimestamp，只获取该时间之后的消息
        if (afterTimestamp) {
            query = query.gt('created_at', afterTimestamp);
        }

        const { data, error } = await query;

        if (error) throw error;

        // 反转顺序，使最新的在最后
        const messages = data.reverse();

        // 异步获取所有用户的profile
        const userIds = [...new Set(messages.map(msg => msg.user_id))];
        const profilePromises = userIds.map(id => getUserProfile(id));
        await Promise.all(profilePromises);

        // 丰富消息数据
        const enrichedMessages = messages.map(msg => ({
            ...msg,
            profile: profileCache.get(msg.user_id)
        }));

        console.log('🐝 Hive: Fetched messages:', enrichedMessages.length, 'before:', beforeTimestamp, 'after:', afterTimestamp);
        return enrichedMessages;
    } catch (error) {
        console.error('🐝 Hive: Failed to fetch messages:', error);
        return [];
    }
}

// 导出当前用户
export function getCurrentUser() {
    return currentUser;
}

// 获取 Supabase 客户端实例
export function getSupabase() {
    return supabase;
}

// 频道在线人数订阅管理
let channelPresenceSubscriptions = new Map(); // channelId -> { channel, onPresence }

// 是否启用频道列表的 Presence 轮询（在广场视图时启用，在聊天视图时禁用）
let presencePollingEnabled = true;

export function setPresencePollingEnabled(enabled) {
    presencePollingEnabled = !!enabled;
}

// 为频道列表订阅 Presence，获取每个频道的在线人数
export function subscribeChannelsPresence(channels, onChannelPresenceUpdate) {
    if (!supabase) {
        console.error('🐝 Hive: Supabase not initialized');
        return;
    }

    // 清理旧的订阅
    channelPresenceSubscriptions.forEach((sub, channelId) => {
        if (!channels.find(c => c.id === channelId)) {
            // 频道已不存在，取消订阅
            if (sub.refreshInterval) {
                clearInterval(sub.refreshInterval);
            }
            if (sub.channel) {
                supabase.removeChannel(sub.channel);
            }
            channelPresenceSubscriptions.delete(channelId);
        }
    });

    // 为每个频道创建 Presence 订阅
    channels.forEach(channel => {
        if (channelPresenceSubscriptions.has(channel.id)) {
            // 已订阅，跳过
            return;
        }

        const channelName = `hive_channel_${channel.id}`;
        const presenceChannel = supabase.channel(channelName);

        // 计算在线人数的辅助函数
        const getOnlineCount = () => {
            if (!presencePollingEnabled) return 0;
            const presenceState = presenceChannel.presenceState();
            const onlineCount = Object.keys(presenceState).length;
            return onlineCount;
        };

        // 监听 Presence 变化
        const handlePresenceUpdate = (eventType) => {
            if (!presencePollingEnabled) return;
            const onlineCount = getOnlineCount();
            
            if (onChannelPresenceUpdate) {
                onChannelPresenceUpdate(channel.id, onlineCount);
            }
        };

        presenceChannel.on('presence', { event: 'sync' }, () => handlePresenceUpdate('sync'));
        presenceChannel.on('presence', { event: 'join' }, () => handlePresenceUpdate('join'));
        presenceChannel.on('presence', { event: 'leave' }, () => handlePresenceUpdate('leave'));

        // 先设置一个占位符
        channelPresenceSubscriptions.set(channel.id, {
            channel: presenceChannel,
            onPresence: handlePresenceUpdate,
            refreshInterval: null
        });

        // 订阅但不 track（只监听，不标记自己在线）
        presenceChannel.subscribe((status) => {
            // 订阅成功后，立即获取一次 Presence 状态
            if (status === 'SUBSCRIBED') {
                // 延迟一小段时间，确保 Presence 状态已同步
                setTimeout(() => {
                    if (!presencePollingEnabled) return;
                    const onlineCount = getOnlineCount();
                    
                    if (onChannelPresenceUpdate) {
                        onChannelPresenceUpdate(channel.id, onlineCount);
                    }
                }, 500); // 等待 500ms 让 Presence 状态同步
                
                // 定期刷新 Presence 状态（作为备用，确保数据同步）
                const refreshInterval = setInterval(() => {
                    if (!presencePollingEnabled) return;
                    const onlineCount = getOnlineCount();
                    if (onChannelPresenceUpdate) {
                        onChannelPresenceUpdate(channel.id, onlineCount);
                    }
                }, 5000); // 每 5 秒刷新一次
                
                // 更新 interval ID
                const sub = channelPresenceSubscriptions.get(channel.id);
                if (sub) {
                    sub.refreshInterval = refreshInterval;
                }
            }
        });
    });

}

// 手动刷新指定频道的 Presence 状态（用于进入频道时同步列表显示）
export function refreshChannelPresence(channelId, onChannelPresenceUpdate) {
    const sub = channelPresenceSubscriptions.get(channelId);
    if (sub && sub.channel) {
        const presenceState = sub.channel.presenceState();
        const onlineCount = Object.keys(presenceState).length;
        
        if (onChannelPresenceUpdate) {
            onChannelPresenceUpdate(channelId, onlineCount);
        }
    }
}

// 取消所有频道 Presence 订阅
export function unsubscribeChannelsPresence() {
    channelPresenceSubscriptions.forEach((sub, channelId) => {
        if (sub.refreshInterval) {
            clearInterval(sub.refreshInterval);
        }
        if (sub.channel) {
            supabase.removeChannel(sub.channel);
        }
    });
    channelPresenceSubscriptions.clear();
}

// ======================== 灵感模块数据层 ========================

/**
 * 搜索灵感内容（统一调用 rpc_inspiration_search）
 * 
 * @param {Object} params
 * @param {'image'|'video'|'workflow'|'model'|'node'|'tutorial'} params.category
 * @param {string} [params.keyword]
 * @param {number[]} [params.tagIds]
 * @param {boolean} [params.onlyNoTag]  // 仅展示无标签内容
 * @param {'latest'|'most_likes'|'most_favorites'} [params.sort]
 * @param {number} [params.page]
 * @param {number} [params.pageSize]
 * @returns {Promise<{ items: any[], total: number }>}
 */
export async function searchInspiration(params) {
    if (!supabase) {
        const notInitMsg = typeof window !== 'undefined' && typeof window.t === 'function' 
            ? window.t('toast.supabaseNotInitialized') 
            : 'Supabase not initialized';
        throw new Error(notInitMsg);
    }

    const currentUser = getCurrentUser();
    const {
        category,
        keyword = null,
        tagIds = null,
        onlyNoTag = false,
        favoritesOnly = false,
        sort = 'latest',
        page = 1,
        pageSize = 20
    } = params || {};

    const { data, error } = await supabase.rpc('rpc_inspiration_search', {
        p_category: category,
        p_keyword: keyword && keyword.trim() ? keyword.trim() : null,
        p_tag_ids: (tagIds && tagIds.length) ? tagIds : null,
        p_only_no_tag: !!onlyNoTag,
        p_favorites_only: !!favoritesOnly,
        p_user_id: currentUser ? currentUser.id : null, // 始终传递用户ID，用于判断是否已点赞/收藏
        p_sort: sort,
        p_page: page,
        p_page_size: pageSize
    });

    if (error) {
        console.error('🐝 Hive: rpc_inspiration_search error:', error);
        throw error;
    }

    let total = 0;
    if (Array.isArray(data) && data.length > 0) {
        total = data[0].total_count || 0;
    }

    return {
        items: data || [],
        total
    };
}

/**
 * 获取一级大分类列表（按排序和显示状态）
 * @returns {Promise<Array<{id: number, name: string, code: string, sort_order: number, is_visible: boolean}>>}
 */
export async function fetchInspirationCategories() {
    if (!supabase) {
        const notInitMsg = typeof window !== 'undefined' && typeof window.t === 'function' 
            ? window.t('toast.supabaseNotInitialized') 
            : 'Supabase not initialized';
        throw new Error(notInitMsg);
    }

    const { data, error } = await supabase
        .from('inspiration_categories')
        .select('*')
        .eq('is_visible', true)
        .order('sort_order', { ascending: true })
        .order('id', { ascending: true });

    if (error) {
        console.error('🐝 Hive: fetchInspirationCategories error:', error);
        throw error;
    }

    return data || [];
}

/**
 * 获取某个分类下的启用标签列表
 * @param {'image'|'video'|'workflow'|'model'|'node'|'tutorial'} category
 */
export async function fetchInspirationTags(category) {
    if (!supabase) {
        const notInitMsg = typeof window !== 'undefined' && typeof window.t === 'function' 
            ? window.t('toast.supabaseNotInitialized') 
            : 'Supabase not initialized';
        throw new Error(notInitMsg);
    }

    const { data, error } = await supabase
        .from('inspiration_tags')
        .select('*')
        .eq('category', category)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('id', { ascending: true });

    if (error) {
        console.error('🐝 Hive: fetchInspirationTags error:', error);
        throw error;
    }

    return data || [];
}

/**
 * 点赞某个灵感内容
 * @param {string} itemId 
 */
export async function likeInspirationItem(itemId) {
    if (!supabase) {
        const notInitMsg = typeof window !== 'undefined' && typeof window.t === 'function' 
            ? window.t('toast.supabaseNotInitialized') 
            : 'Supabase not initialized';
        throw new Error(notInitMsg);
    }

    const user = getCurrentUser();
    if (!user) {
        const userNotLoggedInMsg = typeof window !== 'undefined' && typeof window.t === 'function' 
            ? window.t('toast.userNotLoggedIn') 
            : 'Current user information does not exist, cannot perform operation';
        throw new Error(userNotLoggedInMsg);
    }

    try {
        // 先检查是否已经点赞
        const { data: existing, error: checkError } = await supabase
            .from('inspiration_likes')
            .select('*')
            .eq('user_id', user.id)
            .eq('item_id', itemId)
            .maybeSingle();

        if (checkError && checkError.code !== 'PGRST116') {
            // PGRST116 表示没有找到记录，这是正常的
            console.error('🐝 Hive: likeInspirationItem check error:', checkError);
            throw checkError;
        }

        // 如果已经点赞，则取消点赞（实现点击切换）
        if (existing) {
            await unlikeInspirationItem(itemId);
            return;
        }

        // 如果没有点赞，则添加点赞
        const { error } = await supabase
            .from('inspiration_likes')
            .insert({
                user_id: user.id,
                item_id: itemId
            });

        if (error) {
            // 如果插入时仍然遇到唯一键冲突（可能是在检查后到插入前有并发操作）
            const msg = (error.message || '').toLowerCase();
            if (msg.includes('duplicate') || msg.includes('unique') || error.code === '23505') {
                // 再次尝试取消点赞
                await unlikeInspirationItem(itemId);
                return;
            }
            console.error('🐝 Hive: likeInspirationItem error:', error);
            throw error;
        }
    } catch (err) {
        console.error('🐝 Hive: likeInspirationItem failed:', err);
        throw err;
    }
}

/**
 * 取消点赞
 * @param {string} itemId 
 */
export async function unlikeInspirationItem(itemId) {
    if (!supabase) {
        const notInitMsg = typeof window !== 'undefined' && typeof window.t === 'function' 
            ? window.t('toast.supabaseNotInitialized') 
            : 'Supabase not initialized';
        throw new Error(notInitMsg);
    }

    const user = getCurrentUser();
    if (!user) {
        const userNotLoggedInMsg = typeof window !== 'undefined' && typeof window.t === 'function' 
            ? window.t('toast.userNotLoggedIn') 
            : 'Current user information does not exist, cannot perform operation';
        throw new Error(userNotLoggedInMsg);
    }

    // 先检查是否存在，避免无意义的删除操作
    const { data: existing, error: checkError } = await supabase
        .from('inspiration_likes')
        .select('*')
        .eq('user_id', user.id)
        .eq('item_id', itemId)
        .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 表示没有找到记录，这是正常的（可能已经被删除了）
        console.error('🐝 Hive: unlikeInspirationItem check error:', checkError);
        throw checkError;
    }

    // 如果不存在，直接返回成功（幂等操作）
    if (!existing) {
        return;
    }

    // 执行删除操作
    const { error } = await supabase
        .from('inspiration_likes')
        .delete()
        .eq('user_id', user.id)
        .eq('item_id', itemId);

    if (error) {
        console.error('🐝 Hive: unlikeInspirationItem error:', error);
        throw error;
    }
}

/**
 * 收藏某个灵感内容
 * @param {string} itemId 
 */
export async function favoriteInspirationItem(itemId) {
    if (!supabase) {
        const notInitMsg = typeof window !== 'undefined' && typeof window.t === 'function' 
            ? window.t('toast.supabaseNotInitialized') 
            : 'Supabase not initialized';
        throw new Error(notInitMsg);
    }

    const user = getCurrentUser();
    if (!user) {
        const userNotLoggedInMsg = typeof window !== 'undefined' && typeof window.t === 'function' 
            ? window.t('toast.userNotLoggedIn') 
            : 'Current user information does not exist, cannot perform operation';
        throw new Error(userNotLoggedInMsg);
    }

    try {
        // 先检查是否已经收藏
        const { data: existing, error: checkError } = await supabase
            .from('inspiration_favorites')
            .select('*')
            .eq('user_id', user.id)
            .eq('item_id', itemId)
            .maybeSingle();

        if (checkError && checkError.code !== 'PGRST116') {
            // PGRST116 表示没有找到记录，这是正常的
            console.error('🐝 Hive: favoriteInspirationItem check error:', checkError);
            throw checkError;
        }

        // 如果已经收藏，则取消收藏（实现点击切换）
        if (existing) {
            await unfavoriteInspirationItem(itemId);
            return;
        }

        // 如果没有收藏，则添加收藏
        const { error } = await supabase
            .from('inspiration_favorites')
            .insert({
                user_id: user.id,
                item_id: itemId
            });

        if (error) {
            // 如果插入时仍然遇到唯一键冲突（可能是在检查后到插入前有并发操作）
            const msg = (error.message || '').toLowerCase();
            if (msg.includes('duplicate') || msg.includes('unique') || error.code === '23505') {
                // 再次尝试取消收藏
                await unfavoriteInspirationItem(itemId);
                return;
            }
            console.error('🐝 Hive: favoriteInspirationItem error:', error);
            throw error;
        }
    } catch (err) {
        console.error('🐝 Hive: favoriteInspirationItem failed:', err);
        throw err;
    }
}

/**
 * 取消收藏
 * @param {string} itemId 
 */
export async function unfavoriteInspirationItem(itemId) {
    if (!supabase) {
        const notInitMsg = typeof window !== 'undefined' && typeof window.t === 'function' 
            ? window.t('toast.supabaseNotInitialized') 
            : 'Supabase not initialized';
        throw new Error(notInitMsg);
    }

    const user = getCurrentUser();
    if (!user) {
        const userNotLoggedInMsg = typeof window !== 'undefined' && typeof window.t === 'function' 
            ? window.t('toast.userNotLoggedIn') 
            : 'Current user information does not exist, cannot perform operation';
        throw new Error(userNotLoggedInMsg);
    }

    // 先检查是否存在，避免无意义的删除操作
    const { data: existing, error: checkError } = await supabase
        .from('inspiration_favorites')
        .select('*')
        .eq('user_id', user.id)
        .eq('item_id', itemId)
        .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 表示没有找到记录，这是正常的（可能已经被删除了）
        console.error('🐝 Hive: unfavoriteInspirationItem check error:', checkError);
        throw checkError;
    }

    // 如果不存在，直接返回成功（幂等操作）
    if (!existing) {
        return;
    }

    // 执行删除操作
    const { error } = await supabase
        .from('inspiration_favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('item_id', itemId);

    if (error) {
        console.error('🐝 Hive: unfavoriteInspirationItem error:', error);
        throw error;
    }
}

/**
 * 检查插件版本
 * @param {string} currentVersion 当前插件版本号
 * @returns {Promise<{needUpdate: boolean, isForce: boolean, latestVersion: string, message: string}>}
 */
export async function checkPluginVersion(currentVersion) {
    if (!supabase) {
        const notInitMsg = typeof window !== 'undefined' && typeof window.t === 'function' 
            ? window.t('toast.supabaseNotInitialized') 
            : 'Supabase not initialized';
        throw new Error(notInitMsg);
    }

    try {
        // 获取最新一条版本记录
        const { data, error } = await supabase
            .from('plugin_versions')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error) {
            // 如果表不存在或没有数据，不报错，返回不需要更新
            if (error.code === 'PGRST116') {
                // Version table not found or empty, skip version check
                console.log('🐝 Hive: Version table not found or empty, skipping version check');
                return {
                    needUpdate: false,
                    isForce: false,
                    latestVersion: currentVersion,
                    message: ''
                };
            }
            throw error;
        }

        if (!data) {
            return {
                needUpdate: false,
                isForce: false,
                latestVersion: currentVersion,
                message: ''
            };
        }

        const latestVersion = data.version || '';
        const isForce = data.is_force_update || false;
        
        // 规范化版本号进行比较
        const needUpdate = compareVersions(currentVersion, latestVersion) < 0;

        console.log('🐝 Hive: Version check:', {
            current: currentVersion,
            latest: latestVersion,
            needUpdate,
            isForce
        });

        return {
            needUpdate,
            isForce: needUpdate && isForce,
            latestVersion,
            message: data.message || ''
        };
    } catch (error) {
        console.error('🐝 Hive: checkPluginVersion error:', error);
        // 版本检查失败不影响使用，返回不需要更新
        return {
            needUpdate: false,
            isForce: false,
            latestVersion: currentVersion,
            message: ''
        };
    }
}

/**
 * 规范化版本号（去除v前缀和非数字字符）
 * @param {string} version 版本号
 * @returns {string} 规范化后的版本号
 */
function normalizeVersion(version) {
    if (!version) return '0.0.0';
    // 去除v前缀和首尾空白
    let normalized = version.trim().replace(/^v/i, '');
    // 确保只包含数字和点
    normalized = normalized.replace(/[^\d.]/g, '');
    // 如果为空，返回0.0.0
    if (!normalized) return '0.0.0';
    return normalized;
}

/**
 * 比较版本号
 * @param {string} v1 版本号1
 * @param {string} v2 版本号2
 * @returns {number} -1: v1 < v2, 0: v1 === v2, 1: v1 > v2
 */
function compareVersions(v1, v2) {
    // 规范化版本号
    const normV1 = normalizeVersion(v1);
    const normV2 = normalizeVersion(v2);
    
    const parts1 = normV1.split('.').map(Number);
    const parts2 = normV2.split('.').map(Number);
    const maxLength = Math.max(parts1.length, parts2.length);

    for (let i = 0; i < maxLength; i++) {
        const part1 = parts1[i] || 0;
        const part2 = parts2[i] || 0;
        if (part1 < part2) return -1;
        if (part1 > part2) return 1;
    }
    return 0;
}

/**
 * 提交反馈
 * @param {string} title 反馈标题
 * @param {string} content 反馈内容
 * @param {string} version 插件版本号
 * @returns {Promise<void>}
 */
export async function submitFeedback(title, content, version) {
    if (!supabase) {
        const notInitMsg = typeof window !== 'undefined' && typeof window.t === 'function' 
            ? window.t('toast.supabaseNotInitialized') 
            : 'Supabase not initialized';
        throw new Error(notInitMsg);
    }

    const currentUser = getCurrentUser();
    const userAgent = navigator.userAgent || '';

    const { error } = await supabase
        .from('plugin_feedbacks')
        .insert({
            user_id: currentUser ? currentUser.id : null,
            username: currentUser ? currentUser.username : 'Anonymous',
            version: version,
            title: title,
            content: content,
            user_agent: userAgent
        });

    if (error) {
        console.error('🐝 Hive: submitFeedback error:', error);
        throw error;
    }
}

/**
 * 获取插件配置（包括GitHub链接等）
 * @returns {Promise<{githubLinks: Array<{name: string, url: string}>}>}
 */
export async function getPluginConfig() {
    if (!supabase) {
        const notInitMsg = typeof window !== 'undefined' && typeof window.t === 'function' 
            ? window.t('toast.supabaseNotInitialized') 
            : 'Supabase not initialized';
        throw new Error(notInitMsg);
    }

    try {
        // 获取插件配置，按排序顺序
        const { data, error } = await supabase
            .from('plugin_configs')
            .select('*')
            .eq('config_key', 'github_links')
            .order('sort_order', { ascending: true });

        if (error) {
            // 如果表不存在，返回默认配置
            if (error.code === 'PGRST116') {
                // Config table not found, using default GitHub link
                console.log('🐝 Hive: Config table not found, using default GitHub link');
                return {
                    githubLinks: [
                        { name: 'GitHub', url: 'https://github.com/luguoli/ComfyUI-Hive' }
                    ]
                };
            }
            throw error;
        }

        let githubLinks = [];
        if (data && data.length > 0) {
            // 解析JSON配置
            try {
                const configData = typeof data[0].config_value === 'string' 
                    ? JSON.parse(data[0].config_value) 
                    : data[0].config_value;
                githubLinks = Array.isArray(configData) ? configData : [];
            } catch (e) {
                console.warn('🐝 Hive: Failed to parse github_links config:', e);
            }
        }

        // 如果没有配置，使用默认值
        if (githubLinks.length === 0) {
            githubLinks = [
                { name: 'GitHub', url: 'https://github.com/luguoli/ComfyUI-Hive' }
            ];
        }

        return { githubLinks };
    } catch (error) {
        console.error('🐝 Hive: getPluginConfig error:', error);
        // 出错时返回默认配置
        return {
            githubLinks: [
                { name: 'GitHub', url: 'https://github.com/luguoli/ComfyUI-Hive' }
            ]
        };
    }
}
