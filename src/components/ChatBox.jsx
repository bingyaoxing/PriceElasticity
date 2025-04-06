import React, { useState, useEffect, useRef } from 'react';
import { Button, Input, Card, Typography, Spin, message, Upload, Progress } from 'antd';
import { SendOutlined, CloseOutlined, LoadingOutlined, PaperClipOutlined } from '@ant-design/icons';
import { sendMessageToDeepSeek, formatMessagesForDeepSeek, uploadFileToDeepSeek } from '../services/deepseekService';
import './ChatBox.css';

const { Text } = Typography;

const ChatBox = ({ onClose }) => {
  const [messages, setMessages] = useState([
    { text: '您好！我是专业的价格弹性分析助手，可以为您提供营销策略和定价分析等专业建议。请问有什么可以帮您的吗？', isBot: true }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fileList, setFileList] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const messagesEndRef = useRef(null);

  // 自动滚动到最新消息
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 文件上传前的验证
  const beforeUpload = (file) => {
    // 检查文件类型
    const isValidType = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
      'application/vnd.ms-excel', // xls
      'application/pdf', // pdf
      'application/msword', // doc
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
      'image/png' // png
    ].includes(file.type);
    
    if (!isValidType) {
      message.error('只支持上传Excel、PDF、Word和PNG格式的文件！');
      return Upload.LIST_IGNORE;
    }
    
    // 检查文件大小，限制为10MB
    const isLt10M = file.size / 1024 / 1024 < 10;
    if (!isLt10M) {
      message.error('文件大小不能超过10MB！');
      return Upload.LIST_IGNORE;
    }
    
    return true;
  };

  // 处理文件上传变化
  const handleUploadChange = (info) => {
    let fileList = [...info.fileList];
    
    // 限制只显示最近上传的一个文件
    fileList = fileList.slice(-1);
    
    // 更新文件列表状态
    setFileList(fileList);
    
    // 显示文件选择状态提示
    if (fileList.length > 0) {
      const file = fileList[0];
      // 模拟上传进度
      let progress = 0;
      const timer = setInterval(() => {
        progress += 10;
        if (progress >= 99) {
          clearInterval(timer);
          message.success(`文件 ${file.name} 已准备就绪，点击发送按钮上传`);
        }
        setUploadProgress(progress);
      }, 100);
    }
  };

  // 处理文件上传
  const handleUpload = async () => {
    if (fileList.length === 0 || isLoading || uploading) return;
    
    const file = fileList[0].originFileObj;
    setUploading(true);
    
    // 显示上传状态消息
    const userMessage = { text: `正在上传文件: ${file.name}`, isBot: false };
    setMessages(prevMessages => [...prevMessages, userMessage]);
    
    try {
      setUploadProgress(0);
      // 上传文件到DeepSeek API
      const uploadResponse = await uploadFileToDeepSeek(file);
      
      if (!uploadResponse.id) {
        throw new Error('文件上传失败，未获取到文件ID');
      }
      
      // 添加到已上传文件列表
      setUploadedFiles(prev => [...prev, {
        id: uploadResponse.id,
        name: file.name,
        size: file.size,
        type: file.type
      }]);
      
      setUploadProgress(100);
      message.success(`文件 ${file.name} 上传成功`);
      
      const fileId = uploadResponse.id;
      const fileInfo = `已上传文件: ${file.name} (${(file.size / 1024).toFixed(2)} KB, 类型: ${file.type})`;
      
      // 准备发送到DeepSeek的消息
      const updatedMessages = [...messages, { text: fileInfo, isBot: false }];
      const formattedMessages = formatMessagesForDeepSeek(updatedMessages);
      
      setIsLoading(true);
      
      // 调用DeepSeek API，并传递文件ID
      const response = await sendMessageToDeepSeek(formattedMessages, {
        model: 'deepseek-chat',
        temperature: 0.7,
        maxTokens: 1000,
        fileIds: [fileId] // 传递文件ID
      });
      
      // 处理API响应
      if (response.choices && response.choices.length > 0) {
        const botResponse = {
          text: response.choices[0].message.content,
          isBot: true
        };
        setMessages(prevMessages => [...prevMessages, { text: fileInfo, isBot: false }, botResponse]);
      } else {
        throw new Error('API返回了无效的响应格式');
      }
      
      // 清空文件列表
      setFileList([]);
    } catch (err) {
      console.error('文件上传或与DeepSeek API通信时出错:', err);
      setError(err.message || '文件处理过程中出现问题，请稍后再试');
      message.error('文件处理过程中出现问题，请稍后再试');
    } finally {
      setUploading(false);
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (input.trim() === '' || isLoading) return;
    
    const userMessage = { text: input, isBot: false };
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);
    
    try {
      // 准备发送到DeepSeek的消息
      const updatedMessages = [...messages, userMessage];
      const formattedMessages = formatMessagesForDeepSeek(updatedMessages);
      
      // 调用DeepSeek API
      const response = await sendMessageToDeepSeek(formattedMessages, {
        model: 'deepseek-chat',
        temperature: 0.7,
        maxTokens: 1000
      });
      
      // 处理API响应
      if (response.choices && response.choices.length > 0) {
        const botResponse = {
          text: response.choices[0].message.content,
          isBot: true
        };
        setMessages(prevMessages => [...prevMessages, botResponse]);
      } else {
        throw new Error('API返回了无效的响应格式');
      }
    } catch (err) {
      console.error('与DeepSeek API通信时出错:', err);
      setError(err.message || '与AI助手通信时出现问题，请稍后再试');
      message.error('与AI助手通信时出现问题，请稍后再试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <div className="chat-box">
      <div className="chat-header">
        <Text strong>价格弹性分析助手 (DeepSeek)</Text>
        <Button 
          type="text" 
          icon={<CloseOutlined />} 
          onClick={onClose}
          className="close-button"
        />
      </div>
      
      <div className="chat-messages">
        {messages.map((message, index) => (
          <div 
            key={index} 
            className={`message ${message.isBot ? 'bot-message' : 'user-message'}`}
          >
            {message.text}
          </div>
        ))}
        {isLoading && (
          <div className="message bot-message" style={{ display: 'flex', alignItems: 'center' }}>
            <Spin indicator={<LoadingOutlined style={{ fontSize: 16, marginRight: 8 }} spin />} />
            <span>思考中...</span>
          </div>
        )}
        {error && (
          <div className="message bot-message" style={{ color: '#ff4d4f' }}>
            <Text type="danger">出错了: {error}</Text>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="chat-input-container">
        {uploadedFiles.length > 0 && (
          <div className="uploaded-files">
            {uploadedFiles.map((file, index) => (
              <div key={file.id} className="uploaded-file-item">
                <Text ellipsis>{file.name}</Text>
                <Button 
                  type="text" 
                  icon={<CloseOutlined />} 
                  onClick={() => {
                    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
                  }}
                />
              </div>
            ))}
          </div>
        )}
        <div className="input-with-upload">
          <Input
            className="chat-input"
            placeholder="请输入您的问题..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading || uploading}
          />
          <Upload
            className="upload-button-wrapper"
            showUploadList={false}
            beforeUpload={beforeUpload}
            onChange={handleUploadChange}
            fileList={fileList}
            disabled={isLoading || uploading}
          >
            <Button
              type="text"
              icon={<PaperClipOutlined />}
              className="upload-button"
              disabled={isLoading || uploading}
              title="上传文件 (Excel, PDF, Word, PNG)"
            />
          </Upload>
          {fileList.length > 0 && (
            <div className="upload-progress">
              <Progress
                percent={uploadProgress}
                size="small"
                status={uploadProgress === 100 ? 'success' : 'active'}
                showInfo={false}
              />
            </div>
          )}
        </div>
        {fileList.length > 0 ? (
          <Button
            type="primary"
            icon={uploading ? <LoadingOutlined /> : <SendOutlined />}
            onClick={handleUpload}
            className="send-button"
            loading={uploading}
            disabled={isLoading}
          />
        ) : (
          <Button 
            type="primary" 
            icon={isLoading ? <LoadingOutlined /> : <SendOutlined />} 
            onClick={handleSend}
            className="send-button"
            loading={isLoading}
          />
        )}
      </div>
    </div>
  );
};

export default ChatBox;