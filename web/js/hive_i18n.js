// web/js/hive_i18n.js - 国际化语言文件
// Internationalization language file

const HIVE_I18N = {
    zh: {
        // 通用
        common: {
            close: '关闭',
            confirm: '确认',
            cancel: '取消',
            save: '保存',
            loading: '加载中...',
            copy: '复制',
            copied: '✓ 已复制',
            copyFailed: '复制失败，请手动复制',
            remove: '移除',
            yesterday: '昨天',
            image: '图像',
            file: '文件',
            workflowFile: '工作流文件',
            workflowJson: '工作流 JSON',
            loadWorkflow: '加载工作流',
            download: '下载',
            downloadModel: '下载模型',
            translate: '翻译',
            install: '安装',
            previous: '上一页',
            next: '下一页'
        },
        
        // Toast 消息
        toast: {
            connected: 'Hive 多人聊天已连接！',
            connectedMessage: 'Hive 多人聊天已连接！',
            connectionFailed: '连接失败：',
            reconnected: '已重新连接 Hive 聊天',
            messageSent: '消息已发送',
            sendFailed: '发送失败：',
            fileReady: '文件 "{name}" 已准备发送',
            joinChannelFirst: '请先加入频道后再发送文件',
            joinChannelFirstSend: '请先加入频道',
            connectionLost: '当前连接已断开，正在尝试自动重连，请稍后再试',
            enterMessageOrFile: '请输入消息或选择文件',
            sendingTooFast: '消息发送过快，请稍后再试',
            sendingTooFrequent: '发送过于频繁，请稍后再试',
            messageTooLong: '消息过长，请控制在 {count} 个字符以内',
            duplicateContent: '请不要在短时间内重复发送相同内容',
            meaninglessContent: '消息内容疑似无意义，请适当修改后再发送',
            loadingHistory: '正在加载历史消息...',
            loadHistoryFailed: '加载历史消息失败：',
            connecting: '正在连接...',
            connectionFailedRetry: '连接失败，请稍后重试',
            connectingChannel: '连接中...',
            disconnectedReconnecting: '与 Hive 聊天服务器连接已断开，正在尝试自动重连...',
            networkDisconnected: '检测到本地网络已断开，正在尝试自动重连...',
            workflowLoaded: '工作流已加载到画布',
            workflowLoadFailed: '无法加载工作流：ComfyUI未找到',
            workflowLoadError: '加载工作流失败：',
            workflowLoadingFromUrl: '正在从链接加载工作流...',
            workflowDataNotFound: '无法加载工作流数据：未找到工作流信息',
            invalidWorkflowFormat: '无效的工作流数据格式',
            invalidComfyUIWorkflow: '无效的 ComfyUI 工作流格式',
            unableToLoadWorkflow: '无法加载工作流',
            unableToLoadWorkflowFile: '无法加载工作流文件:',
            onlyImageFiles: '只支持图片文件（PNG/JPG/WebP）',
            onlyJsonWorkflow: '只支持JSON工作流文件',
            onlyImageOrJson: '只支持图片文件（PNG/JPG/WebP）或JSON工作流文件',
            notComfyUIWorkflow: '非comfyui工作流文件',
            profileUpdated: '用户资料已更新',
            updateFailed: '更新失败：',
            languageUpdated: '语言设置已更新',
            refreshBrowser: '请刷新浏览器以应用更改',
            settingsSaved: '设置已保存',
            emailCopied: '邮箱已复制到剪贴板',
            emailCopyFailed: '复制失败，请手动复制',
            feedbackSubmitted: '反馈提交成功，感谢您的反馈！',
            submitFailed: '提交失败：',
            dontRemindVersion: '已设置该版本不再提醒',
            hfUrlCopied: '已复制 HuggingFace 下载地址',
            mirrorUrlCopied: '已复制镜像下载地址',
            clipboardCopyFailed: '无法复制到剪贴板',
            downloadStarted: '开始下载模型',
            sending: '发送中...',
            fetchChannelsFailed: '获取频道失败：',
            configureSupabase: '请配置完整的 Supabase URL 和 API Key',
            loadSupabaseFailed: '无法加载Supabase库，请检查网络连接',
            joinChannelFailed: '加入频道失败：',
            parseJsonFailed: '无法解析JSON文件：',
            translateBusy: '上一个消息正在翻译，请稍后再试',
            translateFailed: '翻译失败：',
            noContent: '暂无内容',
            favoriteFailed: '收藏失败：',
            loadInspirationFailed: '加载灵感内容失败：',
            likeFailed: '点赞失败：',
            workflowNotConfigured: '未配置工作流数据',
            dragDropFiles: '📎 拖放文件到这里',
            invalidComfyUIWorkflowFormat: '无效的 ComfyUI 工作流格式',
            configWarning: '请先配置 SUPABASE_URL 和 SUPABASE_KEY 常量',
            loadSupabaseLibraryError: '无法加载Supabase库，请检查网络连接',
            nsfwContentDetected: '图片包含不适宜内容（{className}，置信度：{probability}%）',
            noInstallUrl: '暂无可用安装地址',
            updateUserProfileFailed: '更新用户资料失败：RPC 函数没有返回数据',
            fileUploadFailed: '文件上传失败：请检查Supabase存储桶的行级安全策略（RLS）配置',
            userNotLoggedIn: '当前用户信息不存在，无法执行操作',
            nodeExecuteFailed: '执行节点失败',
            websocketMessageFailed: '处理 WebSocket 消息失败',
            websocketConnectionFailed: '无法创建 WebSocket 连接，使用轮询方式',
            checkExecutionStatusFailed: '检查执行状态失败',
            noPromptId: '未收到 prompt_id',
            supabaseNotInitialized: 'Supabase 尚未初始化',
            nodeInstallAddressInvalid: '节点安装地址无效',
            nodeInstallWorkflowLoaded: '节点安装工作流已加载到画布',
            nodeInstallWorkflowLoadFailed: '加载节点安装工作流失败：',
            modelDownloadWorkflowLoaded: '模型下载工作流已加载到画布',
            modelDownloadWorkflowLoadFailed: '加载模型下载工作流失败：',
            modelDownloadAddressInvalid: '模型下载地址无效',
            loadWorkflowFileFailed: '无法加载工作流文件：{status} {statusText}',
            loadTemplateFileFailed: '无法加载模板文件：{statusText}',
            loadTagsFailed: '加载标签失败：',
            loadCategoriesFailed: '加载分类失败：',
            loadCategoriesFailedError: '加载分类失败',
            versionUpdateRequired: '当前版本需要更新，请前往下载最新版本',
            connectionFailedRetry: '连接失败，请重试',
            toggleSidebar: '打开/关闭 Hive Hub',
            pageInfo: '第 {page} / {totalPages} 页，共 {total} 条',
            userDisabled: '您的账号已被管理员禁用，无法在频道中发送消息',
            modelUrlNotFound: '未找到模型下载地址',
            nodeUrlNotFound: '未找到节点安装地址',
            modelDownloadStarted: '模型下载已开始',
            nodeInstallStarted: '节点安装已开始',
            modelDownloadFailed: '模型下载失败：',
            nodeInstallFailed: '节点安装失败：',
            modelUrlNotFound: '未找到模型下载地址',
            nodeUrlNotFound: '未找到节点安装地址',
            modelDownloadStarted: '模型下载已开始',
            nodeInstallStarted: '节点安装已开始',
            modelDownloadFailed: '模型下载失败：',
            nodeInstallFailed: '节点安装失败：',
        },
        missingItems: {
            fromLibrary: '使用Hive下载',
            fromLibraryMirror: '使用Hive下载（镜像）',
            fromLibraryNode: '使用Hive安装',
            download: '下载',
            install: '安装',
        },
        contextMenu: {
            fixNodeWithHive: 'Hive 修复节点',
            selectNodeLink: '选择节点安装地址',
            nodeName: '节点名称',
            installAddress: '安装地址',
            noNodeLinks: '未找到可用的节点安装地址',
            randomPrompt: 'Hive 随机提示词',
            generatingPrompt: '正在生成提示词...',
            promptGenerated: '提示词已生成',
            copyPrompt: '复制提示词',
            promptCopied: '提示词已复制到剪贴板',
            generatePromptFailed: '生成提示词失败：',
            apiNotConfigured: 'API未配置。可以使用以下免费API：\n1. DeepSeek (https://platform.deepseek.com) - 免费，国内可访问\n2. 硅基流动 (https://siliconflow.cn) - 有免费额度\n3. 通义千问、文心一言等\n\n请在浏览器控制台设置：\nlocalStorage.setItem("hive_llm_api_key", "your-api-key");\nlocalStorage.setItem("hive_llm_api_url", "api-url");\nlocalStorage.setItem("hive_llm_model", "model-name");',
            copyEnglishPrompt: '复制英文提示词',
            copyChinesePrompt: '复制中文提示词',
            englishPrompt: '英文提示词',
            chinesePrompt: '中文提示词',
            reversePrompt: 'Hive 提示词反推',
            generatingReversePrompt: '正在分析图片并生成提示词...',
            reversePromptFailed: '提示词反推失败：',
            aiChat: 'Hive 与AI对话',
            aiChatPlaceholder: '请输入您的问题...',
            aiChatSending: '正在发送...',
            aiChatFailed: '对话失败：',
            aiChatSend: '发送',
            expandPrompt: 'Hive 提示词扩写',
            expandPromptPlaceholder: '请输入要扩写的提示词...',
            expandingPrompt: '正在扩写提示词...',
            expandPromptFailed: '扩写提示词失败：',
            expandPromptSend: '扩写',
            translate: 'Hive 翻译',
            translatePlaceholder: '请输入要翻译的文本...',
            translating: '正在翻译...',
            translateFailed: '翻译失败：',
            translateSend: '翻译',
            sourceLanguage: '源语言',
            targetLanguage: '目标语言',
            chinese: '中文',
            english: '英文',
            copyResult: '复制结果',
        },
        
        // 设置界面
        settings: {
            title: '设置',
            userInfo: '用户信息',
            randomAvatar: '随机头像',
            username: '昵称',
            enterUsername: '请输入昵称',
            systemSettings: '系统设置',
            language: '语言',
            followSystem: '跟随系统',
            chinese: '中文',
            fontSize: '侧边栏大小',
            fontSizeSmall: '小',
            fontSizeMedium: '中',
            fontSizeLarge: '大',
            autoTranslate: '消息自动翻译',
            autoTranslateDesc: '自动将收到的非当前语言消息翻译为界面语言（默认关闭）',
            nodeInstallerGuide: '节点安装提示',
            dontShowNodeInstaller: '不再显示节点安装器使用指南弹层',
            modelDownloaderGuide: '模型下载提示',
            dontShowModelDownloader: '不再显示模型下载器使用指南弹层',
            about: '关于',
            version: '版本',
            github: 'GitHub',
            contactEmail: '联系邮箱',
            customRequirements: '💡 如有特殊定制需求，请联系作者',
            feedback: '💬 反馈',
            close: '关闭',
            saving: '保存中...',
            autoTranslationEnabled: '已开启消息自动翻译',
            autoTranslationDisabled: '已关闭消息自动翻译',
            configureLLMAPI: '配置大模型API',
            llmAPIConfig: '大语言模型API配置',
            visionAPIConfig: '视觉模型API配置',
            provider: '模型提供商',
            selectProvider: '选择提供商',
            apiKey: 'API Key',
            enterAPIKey: '请输入API Key',
            availableModels: '可用模型',
            loadingModels: '正在加载模型列表...',
            noModels: '暂无可用模型',
            selectModel: '选择模型',
            saveConfig: '保存配置',
            configSaved: '配置已保存',
            configSaveFailed: '保存配置失败：',
            pleaseConfigureLLM: '🤖 大语言模型 API 未填写。请先在浏览器右侧点击 🐝Hive 打开侧边栏，点击右上角齿轮 ⚙️ 打开设置，然后点击 🤖 配置大模型API 按钮，在大语言模型配置中填写 API Key 和模型后保存再试',
            pleaseConfigureVision: '👁️ 视觉模型 API 未填写。请先在浏览器右侧点击 🐝Hive 打开侧边栏，点击右上角齿轮 ⚙️ 打开设置，然后点击 🤖 配置大模型API 按钮，在视觉模型配置中填写 API Key 和模型后保存再试',
            apiUrl: 'API地址',
            enterAPIUrl: '请输入API地址',
            checkApiConfig: '请检查API地址和参数配置',
            siliconflow: '硅基流动',
            zhipu: '智谱',
            ai302: '302.AI',
            openrouter: 'OpenRouter',
            getAPIKey: '申请API Key',
            tryChangeModel: '如果问题持续，您可以尝试更换模型后再试',
        },
        
        // 反馈界面
        feedback: {
            title: '💬 反馈',
            titleLabel: '标题',
            titlePlaceholder: '请输入反馈标题',
            contentLabel: '内容',
            contentPlaceholder: '请输入反馈内容...',
            note: '提交反馈时，会包含您的用户信息和当前插件版本号。',
            submit: '提交',
            cancel: '取消',
            submitting: '提交中...',
            titleTooLong: '标题不能超过100个字符',
            contentTooLong: '内容不能超过1000个字符',
            titleRequired: '请输入反馈标题',
            titleMinLength: '标题至少需要2个字符',
            contentRequired: '请输入反馈内容',
            contentMinLength: '内容至少需要5个字符'
        },
        
        // 版本更新
        update: {
            title: '📦 版本更新',
            forceUpdateTitle: '⚠️ 强制更新',
            updateRequired: '需要更新',
            remindLater: '稍后提醒',
            dontRemindThisVersion: '该版本不再提醒',
            goToGitHub: '前往 GitHub',
            goToGitHubDownload: '前往 GitHub 下载',
            newVersionAvailable: '发现新版本 v{version}，建议更新以获取更好的体验。',
            forceUpdateMessage: '当前版本需要强制更新到 v{version} 才能继续使用。请前往 GitHub 下载最新版本。'
        },
        
        // 用户名验证
        username: {
            empty: '昵称不能为空',
            tooShort: '昵称至少需要2个字符',
            tooLong: '昵称不能超过20个字符',
            invalidChars: '昵称只能包含中文、英文、数字、下划线和连字符'
        },
        
        // 工作流相关
        workflow: {
            detected: '📋 检测到工作流数据',
            hasWorkflowData: '此图片包含ComfyUI工作流数据<br>是否在发送时携带工作流信息？',
            includeWorkflow: '携带后，接收方可以在图片上看到"加载工作流"按钮',
            confirmLoad: '确定要加载此工作流到ComfyUI画布吗？',
            canLoadWorkflow: '可加载生成此图片的工作流',
            nodeList: '节点列表',
            unableToParse: '无法解析工作流'
        },
        
        // 频道相关
        channel: {
            enterChannel: '点击进入频道',
            online: '{count} 人在线'
        },
        
        // 灵感相关
        inspiration: {
            square: '广场',
            inspiration: '灵感',
            back: '< 返回',
            saySomething: '说点什么...',
            searchPlaceholder: '输入关键词搜索...',
            search: '搜索',
            clear: '清除',
            latest: '最新',
            mostLikes: '最多点赞',
            mostFavorites: '最多收藏',
            all: '全部',
            favorites: '收藏',
            noCategories: '暂无分类',
            expand: '展开',
            collapse: '收起',
            noItemsFound: '未找到相关内容',
            send: '发送'
        },
        
        // 文件上传
        upload: {
            addImage: '添加图片 (PNG/JPG/WebP)',
            addWorkflowJson: '添加工作流 JSON',
            addEmoji: '添加表情符号',
            enableNotifications: '开启消息提醒',
            disableNotifications: '关闭消息提醒',
            reminder: '提醒',
            muted: '静音'
        },
        
        // 信息面板标签
        labels: {
            prompt: '提示词',
            negative: '负面提示词',
            model: '模型',
            sampler: '采样器',
            steps: '步数',
            cfgScale: 'CFG Scale',
            seed: 'Seed',
            title: '标题',
            description: '描述'
        },
        
        // 模型相关
        model: {
            huggingfaceUrl: 'huggingface地址',
            mirrorUrl: '镜像地址'
        },
        
        // 节点安装指南
        nodeInstall: {
            title: '📦 节点安装指南',
            nodeName: '节点名称：',
            installUrl: '安装地址：',
            stepsTitle: '安装步骤',
            step1Title: '打开命令提示符（Windows）或终端（Mac/Linux）',
            step1Win: '按 Win + R，输入 cmd，按回车',
            step1Mac: '按 Cmd + Space，输入 终端，按回车',
            step1Linux: '按 Ctrl + Alt + T',
            step2Title: '导航到ComfyUI的custom_nodes目录',
            step2Tip: '💡 提示：请将命令中的"你的ComfyUI安装目录"替换为你的实际ComfyUI安装路径。如果custom_nodes目录不存在，请先创建它',
            step3Title: '执行安装命令',
            step3Tip: '💡 提示：等待命令执行完成，通常需要几秒到几分钟',
            step4Title: '重启ComfyUI',
            step4Desc: '安装完成后，关闭并重新启动ComfyUI，新节点就会出现在节点列表中。',
            noteTitle: '⚠️ 注意事项：',
            note1: '确保已安装Git工具（下载Git）',
            note2: '中国大陆用户：GitHub访问可能需要VPN或使用镜像源。如果克隆失败，请检查网络连接或配置Git代理',
            note3: '如果安装失败，请检查网络连接和Git是否正确安装',
            note4: '某些节点可能需要额外的Python依赖，请查看节点的README文件',
            closeBtn: '我知道了',
            comfyUIPath: '你的ComfyUI安装目录'
        },
        
        // 节点安装器指南
        nodeInstallerGuide: {
            title: '📦 节点安装器使用指南',
            step1Title: '1. 输入安装地址',
            step1Desc: '在工作流画布上的 HiveNodeInstaller 节点中，找到"节点安装地址"输入框。',
            step1Tip: '✨ 提示：安装地址已自动填入，您可以直接使用或根据需要修改。',
            step2Title: '2. 点击安装按钮',
            step2Desc: '点击节点上的"Start Install (开始安装)"按钮，系统将自动下载并安装节点。',
            step3Title: '3. 等待安装完成',
            step3Desc: '安装过程中，节点会显示进度条和输出信息。请耐心等待安装完成。',
            step4Title: '4. 重启 ComfyUI',
            step4Desc: '安装完成后，请关闭并重新启动 ComfyUI，新安装的节点就会出现在节点列表中。',
            exampleImage: '示例图片',
            closeBtn: '我知道了',
            dontShowAgain: '不再提示',
            note: '💡 提示：如果安装失败，请检查网络连接和 Git 是否正确安装。某些节点可能需要额外的 Python 依赖。',
            exampleImageFailed: '示例图片加载失败'
        },
        
        // 模型下载器指南
        modelDownloaderGuide: {
            title: '📥 模型下载器使用指南',
            step1Title: '1. 填写下载地址',
            step1Desc: '在工作流画布上的 HiveModelDownloader 节点中，找到"模型地址"输入框。',
            step1Tip: '✨ 提示：下载地址已自动填入，您可以直接使用或根据需要修改。',
            step2Title: '2. 选择下载目录',
            step2Desc: '在节点上找到"选择模型保存目录"下拉菜单，选择要保存模型的目录（如 diffusion_models、loras 等）。',
            step3Title: '3. 点击下载按钮',
            step3Desc: '点击节点上的"Start Download (开始下载)"按钮，系统将自动下载模型文件到指定目录。',
            step4Title: '4. 等待下载完成',
            step4Desc: '下载过程中，节点会显示进度条和输出信息。请耐心等待下载完成。',
            exampleImage: '示例图片',
            closeBtn: '我知道了',
            dontShowAgain: '不再提示',
            note: '💡 提示：如果下载失败，请检查网络连接和下载地址是否正确。某些模型文件较大，下载可能需要较长时间。',
            exampleImageFailed: '示例图片加载失败'
        }
    },
    
    en: {
        // Common
        common: {
            close: 'Close',
            confirm: 'Confirm',
            cancel: 'Cancel',
            save: 'Save',
            loading: 'Loading...',
            copy: 'Copy',
            copied: '✓ Copied',
            copyFailed: 'Copy failed, please copy manually',
            remove: 'Remove',
            yesterday: 'Yesterday',
            image: 'Image',
            file: 'File',
            workflowFile: 'Workflow File',
            workflowJson: 'Workflow JSON',
            loadWorkflow: 'Load Workflow',
            download: 'Download',
            downloadModel: 'Download Model',
            translate: 'Translate',
            install: 'Install',
            previous: 'Previous',
            next: 'Next'
        },
        
        // Toast messages
        toast: {
            connected: 'Hive multi-user chat connected!',
            connectedMessage: 'Hive multi-user chat connected!',
            connectionFailed: 'Connection failed: ',
            reconnected: 'Reconnected to Hive chat',
            messageSent: 'Message sent',
            sendFailed: 'Send failed: ',
            fileReady: 'File "{name}" is ready to send',
            joinChannelFirst: 'Please join a channel before sending files',
            joinChannelFirstSend: 'Please join a channel first',
            connectionLost: 'Connection lost, attempting to reconnect. Please try again later',
            enterMessageOrFile: 'Please enter a message or select a file',
            sendingTooFast: 'Message sent too quickly, please try again later',
            sendingTooFrequent: 'Sending too frequently, please try again later',
            messageTooLong: 'Message too long, please limit to {count} characters',
            duplicateContent: 'Please do not send the same content repeatedly in a short time',
            meaninglessContent: 'Message content appears meaningless, please modify before sending',
            loadingHistory: 'Loading history messages...',
            loadHistoryFailed: 'Failed to load history messages: ',
            connecting: 'Connecting...',
            connectionFailedRetry: 'Connection failed, please try again later',
            connectingChannel: 'Connecting...',
            disconnectedReconnecting: 'Connection to Hive chat server lost, attempting to reconnect...',
            networkDisconnected: 'Local network disconnected, attempting to reconnect...',
            workflowLoaded: 'Workflow loaded to canvas',
            workflowLoadFailed: 'Unable to load workflow: ComfyUI not found',
            workflowLoadError: 'Failed to load workflow: ',
            workflowLoadingFromUrl: 'Loading workflow from link...',
            workflowDataNotFound: 'Unable to load workflow data: workflow information not found',
            invalidWorkflowFormat: 'Invalid workflow data format',
            invalidComfyUIWorkflow: 'Invalid ComfyUI workflow format',
            unableToLoadWorkflow: 'Unable to load workflow',
            unableToLoadWorkflowFile: 'Unable to load workflow file: ',
            onlyImageFiles: 'Only image files (PNG/JPG/WebP) are supported',
            onlyJsonWorkflow: 'Only JSON workflow files are supported',
            onlyImageOrJson: 'Only image files (PNG/JPG/WebP) or JSON workflow files are supported',
            notComfyUIWorkflow: 'Not a valid ComfyUI workflow file',
            profileUpdated: 'Profile updated',
            updateFailed: 'Update failed: ',
            languageUpdated: 'Language updated',
            refreshBrowser: 'Please refresh your browser to apply the changes',
            settingsSaved: 'Settings saved',
            emailCopied: 'Email copied to clipboard',
            emailCopyFailed: 'Copy failed, please copy manually',
            feedbackSubmitted: 'Feedback submitted successfully, thank you!',
            submitFailed: 'Submit failed: ',
            dontRemindVersion: 'This version will not be reminded',
            hfUrlCopied: 'HuggingFace URL copied',
            mirrorUrlCopied: 'Mirror URL copied',
            clipboardCopyFailed: 'Failed to copy to clipboard',
            clipboardCopyFailed: 'Failed to copy to clipboard',
            downloadStarted: 'Download started',
            sending: 'Sending...',
            fetchChannelsFailed: 'Failed to fetch channels: ',
            configureSupabase: 'Please configure complete Supabase URL and API Key',
            loadSupabaseFailed: 'Unable to load Supabase library, please check network connection',
            joinChannelFailed: 'Failed to join channel: ',
            parseJsonFailed: 'Unable to parse JSON file: ',
            translateBusy: 'Previous message is being translated, please try again later',
            translateFailed: 'Translation failed: ',
            noContent: 'No content',
            favoriteFailed: 'Failed to favorite: ',
            loadInspirationFailed: 'Failed to load inspiration content: ',
            likeFailed: 'Failed to like: ',
            workflowNotConfigured: 'Workflow data not configured',
            dragDropFiles: '📎 Drag and drop files here',
            invalidComfyUIWorkflowFormat: 'Invalid ComfyUI workflow format',
            configWarning: 'Please configure SUPABASE_URL and SUPABASE_KEY constants',
            loadSupabaseLibraryError: 'Unable to load Supabase library, please check network connection',
            nsfwContentDetected: 'Image contains inappropriate content ({className}, confidence: {probability}%)',
            noInstallUrl: 'No installation URL available',
            updateUserProfileFailed: 'Failed to update user profile: RPC function did not return data',
            fileUploadFailed: 'File upload failed: Please check Supabase storage bucket RLS policy configuration',
            userNotLoggedIn: 'Current user information does not exist, cannot perform operation',
            nodeExecuteFailed: 'Failed to execute node',
            websocketMessageFailed: 'Failed to process WebSocket message',
            websocketConnectionFailed: 'Unable to create WebSocket connection, using polling mode',
            checkExecutionStatusFailed: 'Failed to check execution status',
            noPromptId: 'No prompt_id received',
            supabaseNotInitialized: 'Supabase not initialized',
            nodeInstallAddressInvalid: 'Node installation address is invalid',
            nodeInstallWorkflowLoaded: 'Node installation workflow loaded to canvas',
            nodeInstallWorkflowLoadFailed: 'Failed to load node installation workflow: ',
            modelDownloadWorkflowLoaded: 'Model download workflow loaded to canvas',
            modelDownloadWorkflowLoadFailed: 'Failed to load model download workflow: ',
            modelDownloadAddressInvalid: 'Model download address is invalid',
            loadWorkflowFileFailed: 'Unable to load workflow file: {status} {statusText}',
            loadTemplateFileFailed: 'Unable to load template file: {statusText}',
            loadTagsFailed: 'Failed to load tags: ',
            loadCategoriesFailed: 'Failed to load categories: ',
            loadCategoriesFailedError: 'Failed to load categories',
            versionUpdateRequired: 'Current version needs update, please download the latest version',
            connectionFailedRetry: 'Connection failed, please retry',
            toggleSidebar: 'Toggle Hive Hub',
            pageInfo: 'Page {page} / {totalPages}, Total {total} items',
            userDisabled: 'Your account has been disabled. You cannot send messages in channels.',
            modelUrlNotFound: 'Model download URL not found',
            nodeUrlNotFound: 'Node installation URL not found',
            modelDownloadStarted: 'Model download started',
            nodeInstallStarted: 'Node installation started',
            modelDownloadFailed: 'Failed to download model: ',
            nodeInstallFailed: 'Failed to install node: ',
            chinese: 'Chinese',
            startDownload: 'Start Download',
            startInstall: 'Start Install',
            outputInfo: 'Output information will be displayed here...',
            executing: 'Executing...',
            preparing: 'Preparing...',
            startingExecution: 'Starting Execution...',
            completed: 'Completed',
            executionCompleted: 'Execution Completed!',
            executionError: 'Execution Error',
            downloadProgress: 'Download Progress',
            estimated: '(Estimated)',
            error: 'Error'
        },
        missingItems: {
            fromLibrary: 'Download with Hive',
            fromLibraryMirror: 'Download with Hive (Mirror)',
            fromLibraryNode: 'Install with Hive',
            download: 'Download',
            install: 'Install',
        },
        contextMenu: {
            fixNodeWithHive: 'Hive Fix Node',
            selectNodeLink: 'Select Node Installation Address',
            nodeName: 'Node Name',
            installAddress: 'Installation Address',
            noNodeLinks: 'No available node installation addresses found',
            randomPrompt: 'Hive Random Prompt',
            generatingPrompt: 'Generating prompt...',
            promptGenerated: 'Prompt generated',
            copyPrompt: 'Copy Prompt',
            promptCopied: 'Prompt copied to clipboard',
            generatePromptFailed: 'Failed to generate prompt: ',
            apiNotConfigured: 'API not configured. You can use these free APIs:\n1. DeepSeek (https://platform.deepseek.com) - Free, accessible in China\n2. SiliconFlow (https://siliconflow.cn) - Free tier available\n3. Qwen, ERNIE, etc.\n\nSet in browser console:\nlocalStorage.setItem("hive_llm_api_key", "your-api-key");\nlocalStorage.setItem("hive_llm_api_url", "api-url");\nlocalStorage.setItem("hive_llm_model", "model-name");',
            copyEnglishPrompt: 'Copy English Prompt',
            copyChinesePrompt: 'Copy Chinese Prompt',
            englishPrompt: 'English Prompt',
            chinesePrompt: 'Chinese Prompt',
            reversePrompt: 'Hive Reverse Prompt',
            generatingReversePrompt: 'Analyzing image and generating prompt...',
            reversePromptFailed: 'Reverse prompt failed: ',
            aiChat: 'Hive AI Chat',
            aiChatPlaceholder: 'Enter your question...',
            aiChatSending: 'Sending...',
            aiChatFailed: 'Chat failed: ',
            aiChatSend: 'Send',
            expandPrompt: 'Hive Expand Prompt',
            expandPromptPlaceholder: 'Enter prompt to expand...',
            expandingPrompt: 'Expanding prompt...',
            expandPromptFailed: 'Expand prompt failed: ',
            expandPromptSend: 'Expand',
            translate: 'Hive Translate',
            translatePlaceholder: 'Enter text to translate...',
            translating: 'Translating...',
            translateFailed: 'Translation failed: ',
            translateSend: 'Translate',
            sourceLanguage: 'Source Language',
            targetLanguage: 'Target Language',
            chinese: 'Chinese',
            english: 'English',
            copyResult: 'Copy Result',
        },
        
        // Settings
        settings: {
            title: 'Settings',
            userInfo: 'User Info',
            randomAvatar: 'Random Avatar',
            username: 'Username',
            enterUsername: 'Enter username',
            systemSettings: 'System Settings',
            language: 'Language',
            followSystem: 'Follow System',
            chinese: '中文',
            fontSize: 'Sidebar Size',
            fontSizeSmall: 'Small',
            fontSizeMedium: 'Medium',
            fontSizeLarge: 'Large',
            autoTranslate: 'Auto Translate Messages',
            autoTranslateDesc: 'Automatically translate incoming messages that are not in your current language (off by default).',
            nodeInstallerGuide: 'Node Installer Guide',
            dontShowNodeInstaller: "Don't show node installer guide popup",
            modelDownloaderGuide: 'Model Downloader Guide',
            dontShowModelDownloader: "Don't show model downloader guide popup",
            about: 'About',
            version: 'Version',
            github: 'GitHub',
            contactEmail: 'Contact Email',
            customRequirements: '💡 For custom requirements, please contact the author',
            feedback: '💬 Feedback',
            close: 'Close',
            saving: 'Saving...',
            autoTranslationEnabled: 'Auto translation enabled',
            autoTranslationDisabled: 'Auto translation disabled',
            configureLLMAPI: 'Configure Model API',
            llmAPIConfig: 'Language Model API Configuration',
            visionAPIConfig: 'Vision Model API Configuration',
            provider: 'Provider',
            selectProvider: 'Select Provider',
            apiKey: 'API Key',
            enterAPIKey: 'Enter API Key',
            availableModels: 'Available Models',
            loadingModels: 'Loading models...',
            noModels: 'No available models',
            selectModel: 'Select Model',
            saveConfig: 'Save Configuration',
            configSaved: 'Configuration saved',
            configSaveFailed: 'Failed to save configuration: ',
            pleaseConfigureLLM: '🤖 Language Model API not set. Open the 🐝 Hive sidebar on the right, click the top-right gear to open ⚙️ Settings, then click 🤖 Configure Model API to fill the Language Model section (provider, API Key, model), save, and try again',
            pleaseConfigureVision: '👁️ Vision Model API not set. Open the 🐝 Hive sidebar on the right, click the top-right gear to open ⚙️ Settings, then click 🤖 Configure Model API to fill the Vision Model section (provider, API Key, model), save, and try again',
            apiUrl: 'API URL',
            enterAPIUrl: 'Enter API URL',
            checkApiConfig: 'Please check API URL and parameter configuration',
            siliconflow: 'SiliconFlow',
            zhipu: 'Zhipu AI',
            ai302: '302.AI',
            openrouter: 'OpenRouter',
            getAPIKey: 'Get API Key',
            tryChangeModel: 'If the problem persists, you can try changing the model and try again',
        },
        
        // Feedback
        feedback: {
            title: '💬 Feedback',
            titleLabel: 'Title',
            titlePlaceholder: 'Enter feedback title',
            contentLabel: 'Content',
            contentPlaceholder: 'Enter feedback content...',
            note: 'Submitting feedback will include your user information and current plugin version.',
            submit: 'Submit',
            cancel: 'Cancel',
            submitting: 'Submitting...',
            titleTooLong: 'Title cannot exceed 100 characters',
            contentTooLong: 'Content cannot exceed 1000 characters',
            titleRequired: 'Please enter feedback title',
            titleMinLength: 'Title must be at least 2 characters',
            contentRequired: 'Please enter feedback content',
            contentMinLength: 'Content must be at least 5 characters'
        },
        
        // Update
        update: {
            title: '📦 Version Update',
            forceUpdateTitle: '⚠️ Force Update Required',
            updateRequired: 'Update Required',
            remindLater: 'Remind Later',
            dontRemindThisVersion: "Don't Remind This Version",
            goToGitHub: 'Go to GitHub',
            goToGitHubDownload: 'Go to GitHub',
            newVersionAvailable: 'New version v{version} available. Please update for better experience.',
            forceUpdateMessage: 'This version requires a mandatory update to v{version} to continue. Please download the latest version from GitHub.'
        },
        
        // Username validation
        username: {
            empty: 'Username cannot be empty',
            tooShort: 'Username must be at least 2 characters',
            tooLong: 'Username cannot exceed 20 characters',
            invalidChars: 'Username can only contain Chinese, English, numbers, underscores and hyphens'
        },
        
        // Workflow
        workflow: {
            detected: '📋 Workflow Data Detected',
            hasWorkflowData: 'This image contains ComfyUI workflow data<br>Include workflow information when sending?',
            includeWorkflow: 'After including, recipients can see the "Load Workflow" button on the image',
            confirmLoad: 'Are you sure you want to load this workflow to the ComfyUI canvas?',
            canLoadWorkflow: 'Workflow can be loaded',
            nodeList: 'Node List',
            unableToParse: 'Unable to parse workflow'
        },
        
        // Channel
        channel: {
            enterChannel: 'Click to enter channel',
            online: '{count} online'
        },
        
        // Inspiration
        inspiration: {
            square: 'Square',
            inspiration: 'Inspiration',
            back: '< Back',
            saySomething: 'Say something...',
            searchPlaceholder: 'Enter keywords to search...',
            search: 'Search',
            clear: 'Clear',
            latest: 'Latest',
            mostLikes: 'Most Likes',
            mostFavorites: 'Most Favorites',
            all: 'All',
            favorites: 'Favorites',
            noCategories: 'No categories',
            expand: 'Expand',
            collapse: 'Collapse',
            noItemsFound: 'No items found',
            send: 'Send'
        },
        
        // File upload
        upload: {
            addImage: 'Add Image (PNG/JPG/WebP)',
            addWorkflowJson: 'Add Workflow JSON',
            addEmoji: 'Add Emoji',
            enableNotifications: 'Enable Notifications',
            disableNotifications: 'Disable Notifications',
            reminder: 'On',
            muted: 'Off'
        },
        
        // Info panel labels
        labels: {
            prompt: 'Prompt',
            negative: 'Negative Prompt',
            model: 'Model',
            sampler: 'Sampler',
            steps: 'Steps',
            cfgScale: 'CFG Scale',
            seed: 'Seed',
            title: 'Title',
            description: 'Description'
        },
        
        // Model
        model: {
            huggingfaceUrl: 'HuggingFace URL',
            mirrorUrl: 'Mirror URL'
        },
        
        // Node install guide
        nodeInstall: {
            title: '📦 Node Installation Guide',
            nodeName: 'Node Name:',
            installUrl: 'Installation URL:',
            stepsTitle: 'Installation Steps',
            step1Title: 'Open Command Prompt (Windows) or Terminal (Mac/Linux)',
            step1Win: 'Press Win + R, type cmd, press Enter',
            step1Mac: 'Press Cmd + Space, type Terminal, press Enter',
            step1Linux: 'Press Ctrl + Alt + T',
            step2Title: 'Navigate to ComfyUI\'s custom_nodes directory',
            step2Tip: '💡 Tip: Replace "Your ComfyUI Installation Directory" in the command with your actual ComfyUI installation path. If the custom_nodes directory doesn\'t exist, create it first.',
            step3Title: 'Execute Installation Command',
            step3Tip: '💡 Tip: Wait for the command to complete, usually takes a few seconds to a few minutes',
            step4Title: 'Restart ComfyUI',
            step4Desc: 'After installation is complete, close and restart ComfyUI. The new node will appear in the node list.',
            noteTitle: '⚠️ Notes:',
            note1: 'Ensure Git is installed (Download Git)',
            note2: 'Mainland China Users: GitHub access may require VPN or use mirror sources. If clone fails, check network connection or configure Git proxy',
            note3: 'If installation fails, check network connection and ensure Git is properly installed',
            note4: 'Some nodes may require additional Python dependencies. Please check the node\'s README file',
            closeBtn: 'Got it',
            comfyUIPath: 'Your ComfyUI Installation Directory'
        },
        
        // Node installer guide
        nodeInstallerGuide: {
            title: '📦 Node Installer Guide',
            step1Title: '1. Enter Installation Address',
            step1Desc: 'In the HiveNodeInstaller node on the workflow canvas, find the "Node Installation Address" input field.',
            step1Tip: '✨ Tip: The installation address has been automatically filled in. You can use it directly or modify it as needed.',
            step2Title: '2. Click Install Button',
            step2Desc: 'Click the "Start Install" button on the node, and the system will automatically download and install the node.',
            step3Title: '3. Wait for Installation',
            step3Desc: 'During installation, the node will display a progress bar and output information. Please wait patiently for the installation to complete.',
            step4Title: '4. Restart ComfyUI',
            step4Desc: 'After installation is complete, please close and restart ComfyUI. The newly installed node will appear in the node list.',
            exampleImage: 'Example Image',
            closeBtn: 'Got it',
            dontShowAgain: "Don't show again",
            note: '💡 Tip: If installation fails, please check your network connection and ensure Git is properly installed. Some nodes may require additional Python dependencies.',
            exampleImageFailed: 'Example image failed to load'
        },
        
        // Model downloader guide
        modelDownloaderGuide: {
            title: '📥 Model Downloader Guide',
            step1Title: '1. Enter Download Address',
            step1Desc: 'In the HiveModelDownloader node on the workflow canvas, find the "Model URL" input field.',
            step1Tip: '✨ Tip: The download address has been automatically filled in. You can use it directly or modify it as needed.',
            step2Title: '2. Select Download Directory',
            step2Desc: 'Find the "Select Model Save Directory" dropdown menu on the node and select the directory where you want to save the model (e.g., diffusion_models, loras, etc.).',
            step3Title: '3. Click Download Button',
            step3Desc: 'Click the "Start Download" button on the node, and the system will automatically download the model file to the specified directory.',
            step4Title: '4. Wait for Download',
            step4Desc: 'During download, the node will display a progress bar and output information. Please wait patiently for the download to complete.',
            exampleImage: 'Example Image',
            closeBtn: 'Got it',
            dontShowAgain: "Don't show again",
            note: '💡 Tip: If download fails, please check your network connection and verify the download address is correct. Some model files are large and may take a while to download.',
            exampleImageFailed: 'Example image failed to load'
        }
    }
};

// 获取翻译文本的辅助函数
// Helper function to get translated text
function getI18nText(key, lang = null) {
    // 获取当前语言：优先使用传入的 lang，其次从 getCurrentLanguageSafe 获取
    let currentLang = lang;
    if (!currentLang) {
        // 优先使用全局的 getCurrentLanguage（可能来自 hive_ui.js）
        if (typeof window !== 'undefined' && typeof window.getCurrentLanguage === 'function') {
            currentLang = window.getCurrentLanguage();
        } else if (typeof window !== 'undefined' && typeof window.getCurrentLanguageSafe === 'function') {
            currentLang = window.getCurrentLanguageSafe();
        } else if (typeof getCurrentLanguage === 'function') {
            currentLang = getCurrentLanguage();
        } else {
            // 如果都未定义，直接从 localStorage 读取
            const savedLang = typeof localStorage !== 'undefined' ? localStorage.getItem('hive_lang') : null;
            if (savedLang && savedLang !== 'auto') {
                currentLang = savedLang;
            } else {
                // 检测系统语言
                const browserLang = typeof navigator !== 'undefined' ? (navigator.language || navigator.userLanguage) : 'zh';
                currentLang = browserLang && browserLang.startsWith('zh') ? 'zh' : 'en';
            }
        }
    }
    const keys = key.split('.');
    let text = HIVE_I18N[currentLang] || HIVE_I18N.zh;
    
    for (const k of keys) {
        if (text && typeof text === 'object' && k in text) {
            text = text[k];
        } else {
            // 如果找不到，使用中文版本
            text = HIVE_I18N.zh;
            for (const k2 of keys) {
                if (text && typeof text === 'object' && k2 in text) {
                    text = text[k2];
                } else {
                    return key; // 如果都找不到，返回key
                }
            }
            break;
        }
    }
    
    // 支持简单的参数替换 {name}, {count} 等
    if (typeof text === 'string' && arguments.length > 2) {
        const args = Array.from(arguments).slice(2);
        text = text.replace(/\{(\w+)\}/g, (match, key) => {
            const index = parseInt(key);
            if (!isNaN(index) && index < args.length) {
                return args[index];
            }
            // 尝试从对象参数中获取
            if (args[0] && typeof args[0] === 'object' && key in args[0]) {
                return args[0][key];
            }
            return match;
        });
    }
    
    return text;
}

// 统一的翻译函数（简化调用）
function t(key, params = {}) {
    if (typeof window !== 'undefined' && typeof window.getI18nText === 'function') {
        let text = window.getI18nText(key);
        // 参数替换
        if (typeof params === 'object' && Object.keys(params).length > 0) {
            for (const [paramKey, paramValue] of Object.entries(params)) {
                text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue));
            }
        }
        return text;
    }
    // 回退：返回 key 本身
    return key;
}

// 获取当前语言的辅助函数（如果 hive_ui.js 未加载，则使用此版本）
function getCurrentLanguageSafe() {
    // 优先使用全局的 getCurrentLanguage（来自 hive_ui.js）
    if (typeof window !== 'undefined' && typeof window.getCurrentLanguage === 'function') {
        return window.getCurrentLanguage();
    }
    if (typeof getCurrentLanguage === 'function') {
        return getCurrentLanguage();
    }
    // 直接从 localStorage 读取
    const savedLang = typeof localStorage !== 'undefined' ? localStorage.getItem('hive_lang') : null;
    if (savedLang && savedLang !== 'auto') {
        return savedLang;
    }
    // 检测系统语言
    if (typeof navigator !== 'undefined') {
        const browserLang = navigator.language || navigator.userLanguage;
        if (browserLang && browserLang.startsWith('zh')) {
            return 'zh';
        }
    }
    return 'en';
}

// 导出供其他文件使用
if (typeof window !== 'undefined') {
    window.HIVE_I18N = HIVE_I18N;
    window.getI18nText = getI18nText;
    window.t = t; // 简化的翻译函数
    window.getCurrentLanguageSafe = getCurrentLanguageSafe;
    
    // 如果 getCurrentLanguage 未定义，使用安全版本
    if (typeof window.getCurrentLanguage !== 'function') {
        window.getCurrentLanguage = getCurrentLanguageSafe;
    }
    
    // 触发语言文件加载完成事件
    if (typeof window.dispatchEvent !== 'undefined') {
        window.dispatchEvent(new CustomEvent('hiveI18nLoaded'));
    }
}

