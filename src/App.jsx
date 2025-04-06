import React, { useState } from 'react';
import { Layout, Typography, Tabs, Button, message } from 'antd';
import { CommentOutlined } from '@ant-design/icons';
import PriceElasticity from './components/PriceElasticity';
import CrossElasticity from './components/CrossElasticity';
import ChatBox from './components/ChatBox';

const { Header, Content } = Layout;
const { Title } = Typography;

function App() {
  const [activeTab, setActiveTab] = useState('1');
  const [showChat, setShowChat] = useState(false);

  const items = [
    {
      key: '1',
      label: '价格弹性分析',
      children: <PriceElasticity />,
    },
    {
      key: '2',
      label: '交叉弹性分析',
      children: <CrossElasticity />,
    },
  ];

  return (
    <Layout className="layout">
      <Header className="header">
        <Title level={2} style={{ color: 'white', margin: '10px 0' }}>
          价格弹性分析助手
        </Title>
      </Header>
      <Content className="container">
        <div className="card">
          <Tabs 
            activeKey={activeTab} 
            onChange={setActiveTab} 
            items={items}
            size="large"
          />
        </div>
      </Content>
      
      {/* 聊天框悬浮按钮 */}
      {!showChat && (
        <Button 
          type="primary" 
          shape="circle" 
          icon={<CommentOutlined />} 
          size="large"
          onClick={() => setShowChat(true)}
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            zIndex: 999
          }}
        />
      )}
      
      {/* 聊天框组件 */}
      {showChat && <ChatBox onClose={() => setShowChat(false)} />}
    </Layout>
  );
}

export default App;