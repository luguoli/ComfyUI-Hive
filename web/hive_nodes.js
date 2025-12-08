// web/hive_nodes.js - Custom UI for Hive nodes with buttons and progress bars
// 这个文件放在 web 根目录以确保被 ComfyUI 自动加载

import { app } from "/scripts/app.js";

// 解析当前脚本路径，动态获取插件基准路径（避免依赖目录名，支持 -main 或任意目录名）
function detectHiveBaseUrl() {
    const defaults = ['/extensions/ComfyUI-Hive/', '/extensions/ComfyUI-Hive-main/'];
    const normalize = (pathname) => {
        if (!pathname.endsWith('/')) pathname += '/';
        if (pathname.endsWith('/web/')) {
            pathname = pathname.slice(0, -4);
        }
        if (pathname.match(/\/(js|css|lib|models|res)\/$/)) {
            pathname = pathname.replace(/\/[^/]+\/$/, '/');
        }
        return pathname;
    };
    const collectCandidates = () => {
        const list = [];
        if (typeof import.meta !== 'undefined' && import.meta.url) {
            list.push(import.meta.url);
        }
        if (document.currentScript && document.currentScript.src) list.push(document.currentScript.src);
        const scripts = Array.from(document.getElementsByTagName('script'));
        scripts.forEach(s => {
            if (!s.src) return;
            if (s.src.includes('hive_nodes.js') || s.src.includes('hive.js') || s.src.includes('ComfyUI-Hive')) {
                list.push(s.src);
            }
        });
        if (typeof window !== 'undefined' && window.HIVE_BASE_URL) {
            list.unshift(window.HIVE_BASE_URL);
        }
        return list;
    };
    if (typeof window !== 'undefined' && typeof window.HIVE_BASE_URL === 'string' && window.HIVE_BASE_URL) {
        return normalize(window.HIVE_BASE_URL);
    }
    try {
        const candidates = collectCandidates();
        for (const src of candidates) {
            if (!src) continue;
            if (src.startsWith('/extensions/') && src.endsWith('/')) {
                return src;
            }
            const url = new URL(src, window.location.href);
            let basePath = url.pathname.replace(/[^/]+$/, '');
            basePath = normalize(basePath);
            if (basePath !== '/') {
                return basePath;
            }
        }
        const match = window.location.pathname.match(/\/extensions\/[^/]+\//);
        if (match && match[0]) {
            return normalize(match[0]);
        }
    } catch (err) {
        console.warn('🐝 Hive: Failed to detect base url in nodes layer, fallback to default', err);
    }
    return defaults[0];
}

const HIVE_BASE_URL = detectHiveBaseUrl();

// 加载 CSS
const link = document.createElement("link");
link.rel = "stylesheet";
link.href = `${HIVE_BASE_URL}css/hive-nodes.css`;
document.head.appendChild(link);


// 注册扩展
app.registerExtension({
    name: "ComfyUI.Hive.Nodes",
    async setup(app) {
    },
    
    // 节点创建时添加自定义 UI
    nodeCreated(node) {
        // 处理 HiveModelDownloader 节点
        if (node.comfyClass === "HiveModelDownloader") {
            setupModelDownloaderNode(node, app);
        }
        // 处理 HiveNodeInstaller 节点
        else if (node.comfyClass === "HiveNodeInstaller") {
            setupNodeInstallerNode(node, app);
        }
    },
    
    // 在节点配置时处理输出文本显示
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "HiveModelDownloader" || nodeData.name === "HiveNodeInstaller") {
            const origOnExecuted = nodeType.prototype.onExecuted;
            nodeType.prototype.onExecuted = function (message) {
                if (origOnExecuted) {
                    origOnExecuted.apply(this, arguments);
                }
                
                // 更新输出文本
                if (message && message.text && message.text.length > 0) {
                    const outputWidget = this.widgets.find(w => w.type === "hiveOutput");
                    if (outputWidget) {
                        outputWidget.value = message.text[0];
                    }
                }
            };
        }
    }
});

// 设置模型下载器节点
function setupModelDownloaderNode(node, app) {
    // 检查是否已经设置过
    if (node.hiveStartButton) {
        return;
    }
    
    // 添加开始按钮
    try {
        const startDownloadText = 'Start Download (开始下载)';
        const startButton = node.addWidget("button", startDownloadText, null, () => {
            executeNode(node, app, "HiveModelDownloader");
        });
        startButton.serialize = false;
        node.hiveStartButton = startButton;
    } catch (error) {
        console.error("🐝 Hive Nodes: Error adding button:", error);
    }
    
    // 标记节点正在设置，防止重复调用
    if (node.hiveSettingUp) {
        return;
    }
    node.hiveSettingUp = true;
    
    // 等待节点完全初始化后再添加自定义 widget
    setTimeout(() => {
        // 检查是否已经设置过自定义widget，避免重复添加和高度无限增高
        if (node.hiveProgressWidget) {
            node.hiveSettingUp = false;
            return;
        }
        
        // 获取节点当前高度（此时节点应该已经完全初始化）
        const currentSize = node.size || [300, 200];
        const currentHeight = currentSize[1];
        
        // 检查节点是否从工作流加载（通过检查节点是否有pos属性且高度已经定义）
        // 从工作流加载的节点，高度已经在工作流中定义好了，不需要再调整
        // 手动添加的节点，高度通常是默认值，需要增加高度来容纳widget
        const isFromWorkflow = node.pos && node.pos.length === 2 && currentHeight > 200;
        
        try {
            // 添加进度条
            const progressWidget = createProgressWidget(node, app, "progress");
            node.addCustomWidget(progressWidget);
            node.hiveProgressWidget = progressWidget;
            
            // 添加输出文本框
            const outputWidget = createOutputWidget(node, app, "output");
            node.addCustomWidget(outputWidget);
            node.hiveOutputWidget = outputWidget;
            
            // 如果节点是从工作流加载的，高度已经在工作流中定义好了，不调整高度
            // 否则，说明是手动添加的节点，需要增加高度来容纳widget
            if (isFromWorkflow) {
                node.hiveSizeAdjusted = true;
            } else {
                // 计算需要增加的高度：进度条32px + 输出框140px + 间距20px = 192px
                const progressHeight = 32;
                const outputHeight = 140;
                const spacing = 20;
                const addedHeight = progressHeight + outputHeight + spacing;
                
                // 调整节点大小：基于当前高度增加
                const newHeight = currentHeight + addedHeight;
                node.setSize([currentSize[0], newHeight]);
                node.hiveSizeAdjusted = true; // 标记已调整过高度
            }
        } catch (error) {
            console.error("🐝 Hive Nodes: Error adding custom widgets:", error);
        } finally {
            node.hiveSettingUp = false;
        }
    }, 200);
}

// 设置节点安装器节点
function setupNodeInstallerNode(node, app) {
    // 检查是否已经设置过
    if (node.hiveStartButton) {
        return;
    }
    
    // 添加开始按钮
    try {
        const startInstallText = 'Start Install (开始安装)';
        const startButton = node.addWidget("button", startInstallText, null, () => {
            executeNode(node, app, "HiveNodeInstaller");
        });
        startButton.serialize = false;
        node.hiveStartButton = startButton;
    } catch (error) {
        console.error("🐝 Hive Nodes: Error adding button:", error);
    }
    
    // 标记节点正在设置，防止重复调用
    if (node.hiveSettingUp) {
        return;
    }
    node.hiveSettingUp = true;
    
    // 等待节点完全初始化后再添加自定义 widget
    setTimeout(() => {
        // 检查是否已经设置过自定义widget，避免重复添加和高度无限增高
        if (node.hiveProgressWidget) {
            node.hiveSettingUp = false;
            return;
        }
        
        // 获取节点当前高度（此时节点应该已经完全初始化）
        const currentSize = node.size || [300, 200];
        const currentHeight = currentSize[1];
        
        // 检查节点是否从工作流加载（通过检查节点是否有pos属性且高度已经定义）
        // 从工作流加载的节点，高度已经在工作流中定义好了，不需要再调整
        // 手动添加的节点，高度通常是默认值，需要增加高度来容纳widget
        const isFromWorkflow = node.pos && node.pos.length === 2 && currentHeight > 200;
        
        try {
            // 添加进度条
            const progressWidget = createProgressWidget(node, app, "progress");
            node.addCustomWidget(progressWidget);
            node.hiveProgressWidget = progressWidget;
            
            // 添加输出文本框
            const outputWidget = createOutputWidget(node, app, "output");
            node.addCustomWidget(outputWidget);
            node.hiveOutputWidget = outputWidget;
            
            // 如果节点是从工作流加载的，高度已经在工作流中定义好了，不调整高度
            // 否则，说明是手动添加的节点，需要增加高度来容纳widget
            if (isFromWorkflow) {
                node.hiveSizeAdjusted = true;
            } else {
                // 计算需要增加的高度：进度条32px + 输出框140px + 间距20px = 192px
                const progressHeight = 32;
                const outputHeight = 140;
                const spacing = 20;
                const addedHeight = progressHeight + outputHeight + spacing;
                
                // 调整节点大小：基于当前高度增加
                const newHeight = currentHeight + addedHeight;
                node.setSize([currentSize[0], newHeight]);
                node.hiveSizeAdjusted = true; // 标记已调整过高度
            }
        } catch (error) {
            console.error("🐝 Hive Nodes: Error adding custom widgets:", error);
        } finally {
            node.hiveSettingUp = false;
        }
    }, 200);
}

// 创建进度条 widget
function createProgressWidget(node, app, name) {
    const progressBar = document.createElement("div");
    progressBar.className = "hive-progress-container";
    progressBar.style.display = "none";
    
    const progressBarInner = document.createElement("div");
    progressBarInner.className = "hive-progress-bar";
    progressBar.appendChild(progressBarInner);
    
    const progressText = document.createElement("div");
    progressText.className = "hive-progress-text";
    progressText.textContent = "0%";
    progressBar.appendChild(progressText);
    
    document.body.appendChild(progressBar);
    
    let lastY = 0;
    
    const widget = {
        type: "hiveProgress",
        name: name,
        progressBar: progressBar,
        progressBarInner: progressBarInner,
        progressText: progressText,
        
        setProgress(percent, text) {
            this.progressBarInner.style.width = `${percent}%`;
            this.progressText.textContent = text || `${percent}%`;
        },
        
        show() {
            this.progressBar.style.display = "block";
        },
        
        hide() {
            this.progressBar.style.display = "none";
        },
        
        computeSize() {
            return [0, 32]; // 高度 32px
        },
        
        draw(ctx, node, widgetWidth, y, widgetHeight) {
            lastY = y;
            const visible = app.canvas.ds.scale > 0.5;
            const margin = 10;
            const elRect = ctx.canvas.getBoundingClientRect();
            const transform = new DOMMatrix()
                .scaleSelf(elRect.width / ctx.canvas.width, elRect.height / ctx.canvas.height)
                .multiplySelf(ctx.getTransform())
                .translateSelf(margin, margin + y);
            
            Object.assign(this.progressBar.style, {
                transformOrigin: "0 0",
                transform: transform,
                left: "0px",
                top: "0px",
                width: `${widgetWidth - (margin * 2)}px`,
                position: "absolute",
                zIndex: app.graph._nodes.indexOf(node) + 1000,
            });
            
            this.progressBar.hidden = !visible;
        },
    };
    
    widget.parent = node;
    widget.last_y = 0;
    return widget;
}

// 创建输出文本框 widget
function createOutputWidget(node, app, name) {
    const textarea = document.createElement("textarea");
    textarea.className = "hive-output-text";
    textarea.readOnly = true;
    const outputPlaceholder = 'Output information will be displayed here... (输出信息将显示在这里...)';
    textarea.placeholder = outputPlaceholder;
    textarea.value = "";
    
    document.body.appendChild(textarea);
    
    let lastY = 0;
    
    const widget = {
        type: "hiveOutput",
        name: name,
        get value() {
            return this.inputEl.value;
        },
        set value(x) {
            this.inputEl.value = x || "";
        },
        inputEl: textarea,
        
        computeSize() {
            return [0, 140]; // 高度 140px（增加高度）
        },
        
        draw(ctx, node, widgetWidth, y, widgetHeight) {
            lastY = y;
            const visible = app.canvas.ds.scale > 0.5;
            const margin = 10;
            const elRect = ctx.canvas.getBoundingClientRect();
            const transform = new DOMMatrix()
                .scaleSelf(elRect.width / ctx.canvas.width, elRect.height / ctx.canvas.height)
                .multiplySelf(ctx.getTransform())
                .translateSelf(margin, margin + y);
            
            Object.assign(this.inputEl.style, {
                transformOrigin: "0 0",
                transform: transform,
                left: "0px",
                top: "0px",
                width: `${widgetWidth - (margin * 2)}px`,
                height: "140px",
                position: "absolute",
                zIndex: app.graph._nodes.indexOf(node) + 1000,
            });
            
            this.inputEl.hidden = !visible;
        },
    };
    
    widget.parent = node;
    widget.last_y = 0;
    
    // 节点删除时清理
    const origOnRemoved = node.onRemoved;
    node.onRemoved = function() {
        if (origOnRemoved) {
            origOnRemoved.apply(this, arguments);
        }
        textarea.remove();
    };
    
    return widget;
}

// 执行节点
async function executeNode(node, app, nodeType) {
    // 禁用按钮
    if (node.hiveStartButton) {
        node.hiveStartButton.disabled = true;
    }
    
    // 显示进度条
    if (node.hiveProgressWidget) {
        node.hiveProgressWidget.show();
        const preparingText = 'Preparing... (准备中...)';
        node.hiveProgressWidget.setProgress(0, `0% - ${preparingText}`);
    }

    // 清空输出
    if (node.hiveOutputWidget) {
        const executingText = 'Executing... (正在执行...)';
        node.hiveOutputWidget.value = executingText;
    }
    
    try {
        // 获取节点输入值
        // 在 ComfyUI 中，widget.name 是显示名称，但实际输入键名是节点定义中的键
        // 我们需要根据节点类型和 widget 顺序来映射
        
        const inputs = {};
        let widgetIndex = 0; // 非按钮 widget 的索引
        
        // 定义输入名称映射（根据节点类型和 widget 顺序）
        const inputNameMap = {
            "HiveNodeInstaller": ["url"],
            "HiveModelDownloader": ["url", "save_directory"]
        };
        
        const inputNames = inputNameMap[nodeType] || [];
        
        // 从 widgets 中获取值
        for (const widget of node.widgets) {
            // 跳过按钮和自定义 widget（进度条和输出框）
            if (widget.type === "button" || widget.type === "hiveProgress" || widget.type === "hiveOutput") {
                continue;
            }
            
            if (widget.name) {
                let value = widget.value;
                
                // 处理不同类型的值
                if (widget.type === "combo") {
                    // combo 类型的值可能是索引，需要获取实际值
                    if (widget.options && Array.isArray(widget.options)) {
                        value = widget.options[widget.value] || widget.value;
                    }
                }
                
                // 使用映射的输入名称
                const inputName = inputNames[widgetIndex];
                if (inputName) {
                    inputs[inputName] = value;
                    widgetIndex++;
                }
            }
        }
        
        // 构建工作流（只包含当前节点）
        const workflow = {
            [node.id]: {
                inputs: inputs,
                class_type: nodeType,
            }
        };
        
        // 通过 API 执行节点
        const response = await fetch("/prompt", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                prompt: workflow,
                client_id: app.clientId || "hive-client-" + Date.now(),
            }),
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, ${errorText}`);
        }
        
        const data = await response.json();
        
        // 监听执行进度
        if (data.prompt_id) {
            monitorExecution(node, app, data.prompt_id);
        } else {
            const noPromptIdMsg = 'No prompt_id received (未收到 prompt_id)';
            throw new Error(noPromptIdMsg + ': ' + JSON.stringify(data));
        }
        
    } catch (error) {
        const errorMsg = 'Failed to execute node (执行节点失败)';
        console.error(errorMsg + ':', error);
        
        // 更新输出显示错误
        if (node.hiveOutputWidget) {
            const errorLabel = 'Error (错误)';
            node.hiveOutputWidget.value = `Error: ${error.message} (${errorLabel}: ${error.message})`;
        }
        
        // 隐藏进度条
        if (node.hiveProgressWidget) {
            node.hiveProgressWidget.hide();
        }
        
        // 重新启用按钮
        if (node.hiveStartButton) {
            node.hiveStartButton.disabled = false;
        }
    }
}

// 监听执行进度
function monitorExecution(node, app, promptId) {
    let startTime = Date.now();
    let lastUpdateTime = startTime;
    
    // 使用 WebSocket 或轮询获取真实进度
    // 首先尝试通过 WebSocket 获取进度
    let ws = null;
    let checkInterval = null;
    
    // 尝试连接 WebSocket 获取实时进度
    try {
        // 使用当前页面的协议（http/https）来确定 WebSocket 协议（ws/wss）
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const port = window.location.port || (window.location.protocol === 'https:' ? '443' : '8188');
        const wsUrl = `${protocol}//${window.location.hostname}:${port}/ws?clientId=${app.clientId || 'hive-client-' + Date.now()}`;
        ws = new WebSocket(wsUrl);
        
        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                
                // 处理进度消息
                if (data.type === 'progress') {
                    const progress = data.data.value || 0;
                    if (node.hiveProgressWidget) {
                        const elapsed = (Date.now() - startTime) / 1000;
                        node.hiveProgressWidget.setProgress(progress, `${progress.toFixed(1)}%`);
                    }
                } else if (data.type === 'executing') {
                    if (data.data.node === node.id) {
                        // 节点正在执行
                        if (node.hiveProgressWidget) {
                            const startingExecutionText = 'Starting Execution... (开始执行...)';
                            node.hiveProgressWidget.setProgress(10, `10% - ${startingExecutionText}`);
                        }
                    }
                } else if (data.type === 'executed') {
                    if (data.data.node === node.id) {
                        // 节点执行完成
                        if (node.hiveProgressWidget) {
                            const completedText = 'Completed (完成)';
                            node.hiveProgressWidget.setProgress(100, `100% - ${completedText}`);
                            setTimeout(() => {
                                if (node.hiveProgressWidget) {
                                    node.hiveProgressWidget.hide();
                                }
                            }, 1500);
                        }
                        if (ws) ws.close();
                        if (checkInterval) clearInterval(checkInterval);
                        if (node.hiveStartButton) {
                            node.hiveStartButton.disabled = false;
                        }
                    }
                }
            } catch (e) {
                const wsErrorMsg = 'Failed to process WebSocket message (处理 WebSocket 消息失败)';
                console.error(wsErrorMsg + ':', e);
            }
        };
        
        ws.onerror = (error) => {
            const wsConnFailedMsg = 'Unable to create WebSocket connection, using polling mode (无法创建 WebSocket 连接，使用轮询方式)';
            console.warn(wsConnFailedMsg + ':', error);
            if (ws) {
                ws.close();
                ws = null;
            }
        };
        
        ws.onclose = () => {
            ws = null;
        };
    } catch (e) {
        const wsConnFailedMsg = 'Unable to create WebSocket connection, using polling mode (无法创建 WebSocket 连接，使用轮询方式)';
        console.warn(wsConnFailedMsg + ':', e);
    }
    
    // 显示初始进度
    if (node.hiveProgressWidget) {
        const startingText = 'Starting Execution... (开始执行...)';
        node.hiveProgressWidget.setProgress(0, `0% - ${startingText}`);
    }
    
    // 检查执行状态
    checkInterval = setInterval(async () => {
        try {
            const response = await fetch(`/history/${promptId}`);
            if (response.ok) {
                const data = await response.json();
                
                // 如果执行完成
                if (data[promptId] && data[promptId].status) {
                    if (ws) {
                        ws.close();
                        ws = null;
                    }
                    if (checkInterval) {
                        clearInterval(checkInterval);
                        checkInterval = null;
                    }
                    
                    // 完成进度
                    if (node.hiveProgressWidget) {
                        const completedText = 'Completed (完成)';
                        node.hiveProgressWidget.setProgress(100, `100% - ${completedText}`);
                        setTimeout(() => {
                            if (node.hiveProgressWidget) {
                                node.hiveProgressWidget.hide();
                            }
                        }, 1500);
                    }
                    
                    // 重新启用按钮
                    if (node.hiveStartButton) {
                        node.hiveStartButton.disabled = false;
                    }
                    
                    // 检查是否有输出消息
                    if (data[promptId].outputs && data[promptId].outputs[node.id]) {
                        const output = data[promptId].outputs[node.id];
                        if (output.text && output.text.length > 0 && node.hiveOutputWidget) {
                            node.hiveOutputWidget.value = output.text[0];
                        }
                    } else if (data[promptId].status.status_str === "success") {
                        // 如果执行成功但没有输出，显示成功消息
                        if (node.hiveOutputWidget) {
                            const completedMsg = 'Execution Completed! (执行完成！)';
                            node.hiveOutputWidget.value = completedMsg;
                        }
                    }
                } else if (data[promptId] && data[promptId].status && data[promptId].status.status_str === "error") {
                    // 执行出错
                    if (ws) {
                        ws.close();
                        ws = null;
                    }
                    if (checkInterval) {
                        clearInterval(checkInterval);
                        checkInterval = null;
                    }
                    
                    if (node.hiveProgressWidget) {
                        node.hiveProgressWidget.hide();
                    }
                    
                    if (node.hiveStartButton) {
                        node.hiveStartButton.disabled = false;
                    }
                    
                    if (node.hiveOutputWidget) {
                        const defaultError = 'Execution Error (执行出错)';
                        const errorLabel = 'Error (错误)';
                        const errorMsg = data[promptId].status.exception_type || defaultError;
                        node.hiveOutputWidget.value = `Error: ${errorMsg} (${errorLabel}: ${errorMsg})`;
                    }
                } else {
                    // 仍在执行中，使用简单的时间估算进度
                    const elapsed = (Date.now() - startTime) / 1000;
                    
                    // 基于时间估算进度（简单但有效）
                    // 假设平均下载时间为30-60秒，根据已用时间估算
                    let estimatedProgress = 0;
                    if (elapsed < 2) {
                        estimatedProgress = 5; // 前2秒显示5%
                    } else if (elapsed < 10) {
                        estimatedProgress = 5 + Math.floor((elapsed - 2) / 2); // 每2秒增加1%
                    } else if (elapsed < 30) {
                        estimatedProgress = 9 + Math.floor((elapsed - 10) / 2.5); // 每2.5秒增加1%
                    } else if (elapsed < 60) {
                        estimatedProgress = 17 + Math.floor((elapsed - 30) / 3); // 每3秒增加1%
                    } else {
                        estimatedProgress = 27 + Math.min(63, Math.floor((elapsed - 60) / 2)); // 每2秒增加1%，最多到90%
                    }
                    
                    estimatedProgress = Math.min(90, estimatedProgress); // 最多显示90%，留10%给完成
                    
                    if (node.hiveProgressWidget && estimatedProgress > 0) {
                        const estimatedText = '(Estimated) (估算)';
                        node.hiveProgressWidget.setProgress(estimatedProgress, `${estimatedProgress}% ${estimatedText}`);
                    }
                    
                    // 尝试从输出文本中解析真实进度（如果节点已经输出了）
                    if (data[promptId] && data[promptId].outputs && data[promptId].outputs[node.id]) {
                        const output = data[promptId].outputs[node.id];
                        if (output.text && output.text.length > 0) {
                            const text = output.text[0];
                            
                            // 尝试从文本中提取进度百分比
                            const downloadProgressText = 'Download Progress (下载进度)';
                            const progressPattern = new RegExp(`${downloadProgressText}:\\s*(\\d+\\.?\\d*)%`);
                            const progressMatch = text.match(progressPattern);
                            if (progressMatch) {
                                const realProgress = parseFloat(progressMatch[1]);
                                if (node.hiveProgressWidget) {
                                    node.hiveProgressWidget.setProgress(realProgress, `${realProgress.toFixed(1)}%`);
                                }
                            }
                            
                            // 更新输出文本
                            if (node.hiveOutputWidget) {
                                node.hiveOutputWidget.value = text;
                            }
                        }
                    }
                }
            }
        } catch (error) {
            const statusErrorMsg = 'Failed to check execution status (检查执行状态失败)';
            console.error(statusErrorMsg + ':', error);
        }
    }, 1000);
    
    // 移除超时限制 - 允许长时间运行的任务
    // 不再设置超时，让任务自然完成
}
