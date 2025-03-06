import React, { useState, useRef, useEffect } from 'react';
import './ChatBox.css';
import ReactMarkdown from 'react-markdown';
import TypingAnimation from './TypingAnimation';

const ChatBox = () => {
  // 初始化消息列表，包含AI的欢迎语
  const [messages, setMessages] = useState([
    {
      text: "How can I help you?",
      isUser: false,
      timestamp: new Date().toISOString()
    }
  ]);
  
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef(null);
  
  // 自动滚动到最新消息
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 添加清除历史记录的函数
  const clearHistory = () => {
    setMessages([{
      text: "How can I help you?",
      isUser: false,
      timestamp: new Date().toISOString()
    }]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    // 检查是否需要清除历史
    const shouldClearHistory = (messages) => {
      // 1. 检查消息数量
      if (messages.length > 20) return true;
      
      // 2. 安全地估算token数量
      const estimatedTokens = messages.reduce((acc, msg) => {
        // 添加空值检查
        if (!msg || !msg.text) return acc;
        return acc + msg.text.split(' ').length * 1.3;
      }, 0);
      
      console.log('Estimated tokens:', estimatedTokens); // 调试日志
      
      if (estimatedTokens > 3000) return true; // GPT-3.5的安全阈值
      
      // 3. 检查时间间隔
      const lastMessage = messages[messages.length - 1];
      if (!lastMessage || !lastMessage.timestamp) return false;
      
      const lastMessageTime = new Date(lastMessage.timestamp);
      const timeDiff = Date.now() - lastMessageTime.getTime();
      if (timeDiff > 30 * 60 * 1000) return true; // 30分钟无交互
      
      return false;
    };

    // 添加调试日志
    console.log('Current messages:', messages);
    
    // 如果需要清除历史，则在发送新请求前清除
    if (shouldClearHistory(messages)) {
      console.log('Clearing chat history due to limits');
      clearHistory();
    }
    // 添加用户消息
    const userMessageId = Date.now();
    setMessages(prev => [
      ...prev,
      {
        text: inputMessage,
        isUser: true,
        timestamp: new Date().toISOString(),
        id: userMessageId
      }
    ]);

    // 清空输入框
    setInputMessage('');

    // 添加临时的"正在输入"消息
    const tempMessageId = Date.now() + 1;
    setMessages(prev => [
      ...prev,
      {
        text: <TypingAnimation />,
        isUser: false,
        timestamp: new Date().toISOString(),
        id: tempMessageId,
        isLoading: true
      }
    ]);

    try {
      const chatHistory = messages
        .slice(1)  // 跳过第一条欢迎消息
        .reduce((acc, msg, index, array) => {
          // 用户消息在偶数位置(0,2,4...)，AI响应在奇数位置(1,3,5...)
          if (index % 2 === 0 && index + 1 < array.length) {
            acc.push({
              user_message: array[index].text,  // 用户消息
              ai_response: array[index + 1].text  // AI响应
            });
          }
          return acc;
        }, []);

      // 发送请求到后端
      const response = await fetch('https://betagpt-3let.onrender.com/api/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: inputMessage,
          chat_history: chatHistory.filter(msg => !msg.isLoading) // 过滤掉加载中的消息
        }),
      });

      const data = await response.json();
      
      // // 添加AI响应
      // const aiMessage = {
      //   text: data.answer,  // 修改这里匹配后端返回的字段名
      //   isUser: false,
      //   timestamp: new Date().toISOString()
      // };

      // 添加调试日志
      console.log('AI response received:', data);// 请求成功后，用实际回复替换临时消息
      setMessages(prev => 
        prev.map(msg => 
          msg.id === tempMessageId 
            ? {
                text: data.answer,
                isUser: false,
                timestamp: new Date().toISOString(),
                id: data.id || Date.now() + 2,
                isLoading: false
              } 
            : msg
        )
      );
    } catch (error) {
      console.error('Error:', error);
      
      // 用错误消息替换临时消息
      setMessages(prev => 
        prev.map(msg => 
          msg.id === tempMessageId 
            ? {
                text: '抱歉，发生了错误，请稍后再试。',
                isUser: false,
                timestamp: new Date().toISOString(),
                id: Date.now() + 2
              } 
            : msg
        )
      );
      console.error('Error:', error);
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <button onClick={clearHistory} className="clear-button">
          Start a new conversation  
        </button>
      </div>
      <div className="chat-messages">
        {messages.map((message) => (
          <div 
            key={message.id} 
            className={`message ${message.isUser ? 'user-message' : 'ai-message'}`}
          >
            <div className="message-content">
              {message.isLoading ? (
                message.text
              ) : (
                <ReactMarkdown>{message.text}</ReactMarkdown>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      <form className="chat-input-form" onSubmit={handleSubmit}>
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Type your message here..."
          className="chat-input"
        />
        <button type="submit" className="send-button">
          Send
        </button>
      </form>
    </div>
  );
};

export default ChatBox; 