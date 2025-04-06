/**
 * DeepSeek V3 API服务
 * 用于处理与DeepSeek V3大模型的通信
 * 参考文档: https://api-docs.deepseek.com/
 *
 * 该服务提供了与DeepSeek API通信的功能，包括：
 * - 文件上传
 * - 发送聊天消息
 * - 格式化消息
 */

// 默认API配置
const DEFAULT_API_URL = 'https://api.deepseek.com';
const DEFAULT_FILE_UPLOAD_URL = 'https://api.deepseek.com/v1/files';
const DEFAULT_MODEL = 'deepseek-chat';
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_MAX_TOKENS = 1000;
const MAX_RETRY_ATTEMPTS = 5;
const RETRY_DELAY_MS = 2000;
const MAX_BACKOFF_DELAY = 30000; // 最大重试延迟时间（30秒）

/**
 * 错误类型枚举
 * 用于分类API请求中可能出现的错误类型
 */
const ErrorTypes = {
  NETWORK_ERROR: 'network_error',
  AUTHENTICATION_ERROR: 'authentication_error',
  RATE_LIMIT_ERROR: 'rate_limit_error',
  SERVER_ERROR: 'server_error',
  VALIDATION_ERROR: 'validation_error',
  UNKNOWN_ERROR: 'unknown_error'
};

/**
 * 根据HTTP状态码和错误信息判断错误类型
 * @param {number} statusCode - HTTP状态码
 * @param {Object} errorData - 错误响应数据
 * @returns {string} - 错误类型
 */
const determineErrorType = (statusCode, errorData) => {
  // 网络错误
  if (!statusCode) return ErrorTypes.NETWORK_ERROR;
  
  // 认证错误
  if (statusCode === 401) return ErrorTypes.AUTHENTICATION_ERROR;
  
  // 请求频率限制
  if (statusCode === 429) return ErrorTypes.RATE_LIMIT_ERROR;
  
  // 服务器错误
  if (statusCode >= 500) return ErrorTypes.SERVER_ERROR;
  
  // 验证错误
  if (statusCode === 400 || statusCode === 422) return ErrorTypes.VALIDATION_ERROR;
  
  // 其他未知错误
  return ErrorTypes.UNKNOWN_ERROR;
};

/**
 * 根据错误类型生成用户友好的错误消息
 * @param {string} errorType - 错误类型
 * @param {string} originalMessage - 原始错误消息
 * @param {number} statusCode - HTTP状态码
 * @returns {string} - 用户友好的错误消息
 */
const generateUserFriendlyErrorMessage = (errorType, originalMessage, statusCode) => {
  switch (errorType) {
    case ErrorTypes.NETWORK_ERROR:
      return `网络连接错误，请检查您的网络连接并重试。详情: ${originalMessage}`;
    
    case ErrorTypes.AUTHENTICATION_ERROR:
      return `认证失败，请检查您的API密钥是否正确。详情: ${originalMessage}`;
    
    case ErrorTypes.RATE_LIMIT_ERROR:
      return `请求频率超出限制，请稍后再试。详情: ${originalMessage}`;
    
    case ErrorTypes.SERVER_ERROR:
      return `DeepSeek服务器错误(${statusCode})，请稍后再试。详情: ${originalMessage}`;
    
    case ErrorTypes.VALIDATION_ERROR:
      return `请求参数无效，请检查您的输入。详情: ${originalMessage}`;
    
    case ErrorTypes.UNKNOWN_ERROR:
    default:
      return `发生未知错误(${statusCode})。详情: ${originalMessage}`;
  }
};

/**
 * 处理API响应错误
 * @param {Response} response - Fetch API响应对象
 * @returns {Promise<Object>} - 包含错误类型和消息的对象
 */
const handleApiResponseError = async (response) => {
  let errorData = {};
  let errorMessage = response.statusText || '未知错误';
  
  try {
    errorData = await response.json();
    errorMessage = errorData.error?.message || errorMessage;
  } catch (e) {
    // 如果响应不是JSON格式，使用状态文本作为错误消息
    console.warn('无法解析错误响应为JSON:', e);
  }
  
  const errorType = determineErrorType(response.status, errorData);
  const userFriendlyMessage = generateUserFriendlyErrorMessage(errorType, errorMessage, response.status);
  
  return {
    type: errorType,
    message: userFriendlyMessage,
    originalError: errorData,
    statusCode: response.status
  };
};

/**
 * 带重试机制的API请求
 * @param {Function} requestFn - 执行API请求的函数
 * @param {number} maxRetries - 最大重试次数
 * @param {number} delayMs - 重试延迟(毫秒)
 * @returns {Promise<any>} - API响应
 */
const withRetry = async (requestFn, maxRetries = MAX_RETRY_ATTEMPTS, delayMs = RETRY_DELAY_MS) => {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // 执行请求
      return await requestFn();
    } catch (error) {
      lastError = error;
      
      // 判断是否可以重试
      const canRetry = attempt < maxRetries && (
        error.type === ErrorTypes.NETWORK_ERROR ||
        error.type === ErrorTypes.SERVER_ERROR ||
        error.type === ErrorTypes.RATE_LIMIT_ERROR ||
        (error.statusCode && error.statusCode >= 500)
      );

      if (!canRetry) break;

      // 计算延迟时间(指数退避策略)
      let retryDelay = Math.min(
        delayMs * Math.pow(2, attempt),
        MAX_BACKOFF_DELAY
      );

      // 添加随机抖动，避免多个请求同时重试
      retryDelay += Math.random() * 1000;
      
      // 记录重试日志
      logApiActivity('请求重试', {
        attempt: attempt + 1,
        maxRetries,
        retryDelay,
        errorType: error.type,
        errorMessage: error.message
      }, 'warn');
      
      // 等待一段时间后重试
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
  
  // 所有重试都失败，抛出最后一个错误
  throw lastError;
};

/**
 * 上传文件到DeepSeek V3 API
 * @param {File} file - 要上传的文件
 * @param {Object} options - 可选配置参数
 * @param {boolean} options.retry - 是否启用重试机制，默认为true
 * @param {number} options.maxRetries - 最大重试次数，默认为MAX_RETRY_ATTEMPTS
 * @returns {Promise<Object>} - 返回文件上传响应的Promise，成功时包含file_id
 * @throws {Object} - 当API密钥未配置或API请求失败时抛出错误对象
 */
export const uploadFileToDeepSeek = async (file, options = {}) => {
  // 默认启用重试
  const shouldRetry = options.retry !== false;
  const maxRetries = options.maxRetries || MAX_RETRY_ATTEMPTS;
  
  // 定义请求函数
  const performRequest = async () => {
    try {
      // 获取API密钥
      const apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY;
      
      if (!apiKey) {
        const error = {
          type: ErrorTypes.AUTHENTICATION_ERROR,
          message: 'DeepSeek API密钥未配置。请在.env文件中设置VITE_DEEPSEEK_API_KEY',
          originalError: null,
          statusCode: null
        };
        logApiActivity('文件上传失败', { error: '缺少API密钥' }, 'error');
        throw error;
      }
      
      // 记录上传请求
      logApiActivity('文件上传开始', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      });

      // 创建FormData对象
      const formData = new FormData();
      formData.append('file', file);
      formData.append('purpose', 'assistants');

      // 构建请求配置
      const requestOptions = {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`
        },
        body: formData
      };

      // 发送文件上传请求
      let response;
      try {
        response = await fetch(DEFAULT_FILE_UPLOAD_URL, requestOptions);
      } catch (networkError) {
        // 处理网络错误
        const error = {
          type: ErrorTypes.NETWORK_ERROR,
          message: `网络连接错误，无法连接到DeepSeek API。详情: ${networkError.message}`,
          originalError: networkError,
          statusCode: null
        };
        throw error;
      }
      
      // 检查响应状态
      if (!response.ok) {
        const errorDetails = await handleApiResponseError(response);
        throw errorDetails;
      }

      // 解析响应数据
      const responseData = await response.json();
      
      // 记录消息发送成功
      logApiActivity('消息发送成功', {
        model: options.model || DEFAULT_MODEL,
        messageCount: messages.length
      });
      
      return responseData;
    } catch (error) {
      // 记录错误信息
      logApiActivity('文件上传失败', {
        fileName: file?.name,
        errorType: error.type || 'unknown',
        errorMessage: error.message || '未知错误'
      }, 'error');
      throw error;
    }
  };

  // 执行请求(带重试机制或不带)
  if (shouldRetry) {
    return withRetry(performRequest, maxRetries);
  } else {
    return performRequest();
  }
};

/**
 * 发送消息到DeepSeek V3 API
 * @param {Array} messages - 消息历史记录数组
 * @param {Object} options - 可选配置参数
 * @param {string} options.model - 模型名称，默认为'deepseek-chat-v3'
 * @param {number} options.temperature - 温度参数，控制随机性，默认为0.7
 * @param {number} options.maxTokens - 最大生成token数，默认为1000
 * @param {boolean} options.stream - 是否使用流式响应，默认为false
 * @param {Array<string>} options.fileIds - 文件ID数组，用于引用上传的文件
 * @param {boolean} options.retry - 是否启用重试机制，默认为true
 * @param {number} options.maxRetries - 最大重试次数，默认为MAX_RETRY_ATTEMPTS
 * @returns {Promise<Object>} - 返回API响应的Promise
 * @throws {Object} - 当API密钥未配置或API请求失败时抛出错误对象
 */
export const sendMessageToDeepSeek = async (messages, options = {}) => {
  // 默认启用重试
  const shouldRetry = options.retry !== false;
  const maxRetries = options.maxRetries || MAX_RETRY_ATTEMPTS;
  
  // 定义请求函数
  const performRequest = async () => {
    try {
      // 获取API密钥，优先使用环境变量
      const apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY;
      
      if (!apiKey) {
        const error = {
          type: ErrorTypes.AUTHENTICATION_ERROR,
          message: 'DeepSeek API密钥未配置。请在.env文件中设置VITE_DEEPSEEK_API_KEY',
          originalError: null,
          statusCode: null
        };
        logApiActivity('消息发送失败', { error: '缺少API密钥' }, 'error');
        throw error;
      }
      
      // 记录消息发送请求
      logApiActivity('消息发送开始', {
        messageCount: messages.length,
        model: options.model || DEFAULT_MODEL,
        stream: options.stream || false
      });

      // 构建请求配置
      const requestOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: options.model || DEFAULT_MODEL,
          messages: messages,
          temperature: options.temperature || DEFAULT_TEMPERATURE,
          max_tokens: options.maxTokens || DEFAULT_MAX_TOKENS,
          stream: options.stream || false,
          file_ids: options.fileIds || []
        })
      };

      // 发送请求到DeepSeek API
      let response;
      try {
        response = await fetch(`${DEFAULT_API_URL}/v1/chat/completions`, requestOptions);
      } catch (networkError) {
        // 处理网络错误
        const error = {
          type: ErrorTypes.NETWORK_ERROR,
          message: `网络连接错误，无法连接到DeepSeek API。详情: ${networkError.message}`,
          originalError: networkError,
          statusCode: null
        };
        throw error;
      }
      
      // 检查响应状态
      if (!response.ok) {
        const errorDetails = await handleApiResponseError(response);
        throw errorDetails;
      }

      // 解析响应数据
      const responseData = await response.json();
      
      // 记录消息发送成功
      logApiActivity('消息发送成功', {
        model: options.model || DEFAULT_MODEL,
        messageCount: messages.length
      });
      
      return responseData;
    } catch (error) {
      // 记录错误信息
      logApiActivity('消息发送失败', {
        errorType: error.type || 'unknown',
        errorMessage: error.message || '未知错误',
        model: options.model || DEFAULT_MODEL,
        messageCount: messages?.length || 0
      }, 'error');
      throw error;
    }
  };

  // 执行请求(带重试机制或不带)
  if (shouldRetry) {
    return withRetry(performRequest, maxRetries);
  } else {
    return performRequest();
  }
};

/**
 * 记录API请求日志
 * @param {string} action - 操作类型
 * @param {Object} data - 日志数据
 * @param {string} level - 日志级别 (info, warn, error)
 */
const logApiActivity = (action, data, level = 'info') => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    action,
    ...data
  };
  
  // 根据日志级别选择合适的控制台方法
  switch (level) {
    case 'error':
      console.error(`[DeepSeek API] ${action}:`, logEntry);
      break;
    case 'warn':
      console.warn(`[DeepSeek API] ${action}:`, logEntry);
      break;
    default:
      console.log(`[DeepSeek API] ${action}:`, logEntry);
  }
  
  // 这里可以扩展添加更多日志记录方式，如发送到服务器或保存到本地存储
};

/**
 * 判断是否应该重试请求
 * @param {Object} error - 错误对象
 * @returns {boolean} - 是否应该重试
 */
const shouldRetryRequest = (error) => {
  // 网络错误、服务器错误和频率限制错误可以重试
  return error.type === ErrorTypes.NETWORK_ERROR || 
         error.type === ErrorTypes.SERVER_ERROR || 
         error.type === ErrorTypes.RATE_LIMIT_ERROR;
};

/**
 * 格式化聊天消息为DeepSeek API所需格式
 * @param {Array} messages - 应用内的消息格式
 * @param {boolean} messages[].isBot - 是否为机器人消息
 * @param {string} messages[].text - 消息文本内容
 * @param {string} systemMessage - 可选的系统消息
 * @returns {Array} - DeepSeek API所需的消息格式
 */
export const formatMessagesForDeepSeek = (messages, systemMessage = null) => {
  if (!Array.isArray(messages)) {
    logApiActivity('格式化消息失败', { error: '消息必须是数组格式' }, 'error');
    throw new Error('消息必须是数组格式');
  }

  // 设置默认的系统消息，定义AI助手的角色和回答范围
  const defaultSystemMessage = `您是一位专业的价格弹性分析助手，专注于提供营销和定价相关的咨询服务。您的主要职责包括：
- 价格弹性分析和建议
- 定价策略制定
- 市场营销策略咨询
- 促销活动效果评估
- 读取用户所上传excel文件的分析结果，并进行解读和回复

如果用户询问与营销和定价无关的问题，请礼貌地说明您的专业领域，并建议用户咨询其他相关专家。`;

  // 使用传入的系统消息或默认系统消息
  const finalSystemMessage = systemMessage || defaultSystemMessage;
  
  const formattedMessages = messages.map(msg => ({
    role: msg.isBot ? 'assistant' : 'user',
    content: msg.text
  }));
  
  // 如果提供了系统消息，添加到消息数组的开头
  if (systemMessage) {
    formattedMessages.unshift({
      role: 'system',
      content: systemMessage
    });
  }
  
  return formattedMessages;
};