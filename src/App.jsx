import React, { useState } from 'react';
import { Layout, Typography, Tabs, message } from 'antd';
import PriceElasticity from './components/PriceElasticity';
import CrossElasticity from './components/CrossElasticity';

const { Header, Content } = Layout;
const { Title } = Typography;

function App() {
  const [activeTab, setActiveTab] = useState('1');

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
    </Layout>
  );
}

export default App;