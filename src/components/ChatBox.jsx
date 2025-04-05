import React, { useState, useRef, useEffect } from 'react';
import './ChatBox.css';

const ChatBox = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // 自动滚动到最新消息
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 处理用户输入变化
  const handleInputChange = (e) => {
    setInput(e.target.value);
  };

  // 发送消息到LLM API
  const sendMessage = async () => {
    if (input.trim() === '') return;
    
    // 添加用户消息到聊天历史
    const userMessage = { role: 'user', content: input };
    setMessages([...messages, userMessage]);
    setInput('');
    setIsLoading(true);
    
    try {
      // 这里应该替换为实际的API调用
      // 模拟API调用
      setTimeout(() => {
        const botResponse = {
          role: 'assistant',
          content: '这是一个模拟的回复。在实际应用中，这里应该是从LLM API获取的响应。'
        };
        setMessages(prevMessages => [...prevMessages, botResponse]);
        setIsLoading(false);
      }, 1000);
      
      // 实际API调用的示例代码
      /*
      const response = await fetch('YOUR_LLM_API_ENDPOINT', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage]
        }),
      });
      
      if (!response.ok) {
        throw new Error('API请求失败');
      }
      
      const data = await response.json();
      const botResponse = { role: 'assistant', content: data.response };
      setMessages(prevMessages => [...prevMessages, botResponse]);
      */
    } catch (error) {
      console.error('发送消息时出错:', error);
      // 添加错误消息到聊天历史
      setMessages(prevMessages => [...prevMessages, { 
        role: 'system', 
        content: '发送消息时出错，请稍后再试。' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // 处理按键事件（按Enter发送消息）
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="chat-box">
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="empty-state">
            <p>欢迎使用价格弹性分析助手！</p>
            <p>请输入您的问题，我将为您提供价格弹性相关的分析和建议。</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div 
              key={index} 
              className={`message ${message.role === 'user' ? 'user-message' : 'bot-message'}`}
            >
              <div className="message-content">{message.content}</div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="message bot-message loading">
            <div className="loading-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="chat-input-container">
        <textarea
          className="chat-input"
          value={input}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          placeholder="输入您的问题..."
          disabled={isLoading}
        />
        <button 
          className="send-button" 
          onClick={sendMessage} 
          disabled={isLoading || input.trim() === ''}
        >
          发送
        </button>
      </div>
    </div>
  );
};

export default ChatBox;