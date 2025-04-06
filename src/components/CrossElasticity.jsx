import React, { useState } from 'react';
import { Upload, Button, Table, Card, Typography, message, Tooltip, Select, Row, Col, Space } from 'antd';
import { UploadOutlined, InfoCircleOutlined, DownloadOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';
import ReactECharts from 'echarts-for-react';

const { Title, Paragraph, Text } = Typography;
const { Option } = Select;

const CrossElasticity = () => {
  const [data, setData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [product1, setProduct1] = useState('');
  const [product2, setProduct2] = useState('');
  const [crossElasticity, setCrossElasticity] = useState(null);
  const [chartData, setChartData] = useState([]);

  // 处理文件上传
  const handleFileUpload = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(e.target.result, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        // 验证数据格式
        if (jsonData.length === 0) {
          message.error('Excel文件为空');
          return false;
        }

        // 获取所有列名
        const firstRow = jsonData[0];
        const columnNames = Object.keys(firstRow);
        
        // 检查是否至少有两个价格列和两个需求量列
        const priceColumns = columnNames.filter(col => 
          col.toLowerCase().includes('价格') || 
          col.toLowerCase().includes('price')
        );
        const quantityColumns = columnNames.filter(col => 
          col.toLowerCase().includes('需求量') || 
          col.toLowerCase().includes('quantity')
        );
        
        if (priceColumns.length < 2 || quantityColumns.length < 2) {
          message.error('Excel文件必须包含至少两种商品的价格和需求量列（或英文price和quantity列）');
          return false;
        }

        setData(jsonData);
        
        // 设置表格列
        const tableColumns = columnNames.map(col => ({
          title: col,
          dataIndex: col,
          key: col,
        }));
        setColumns(tableColumns);
        
        // 设置下拉选项的默认值
        if (priceColumns.length >= 2 && quantityColumns.length >= 2) {
          setProduct1({
            price: priceColumns[0],
            quantity: quantityColumns[0]
          });
          setProduct2({
            price: priceColumns[1],
            quantity: quantityColumns[1]
          });
        }
        
        message.success('数据上传成功');
      } catch (error) {
        console.error('解析Excel文件出错:', error);
        message.error('解析Excel文件出错，请检查文件格式');
      }
      return false; // 阻止自动上传
    };
    reader.readAsArrayBuffer(file);
    return false; // 阻止自动上传
  };

  // 计算交叉弹性
  const calculateCrossElasticity = () => {
    if (!product1 || !product2 || !data.length) {
      message.warning('请先上传数据并选择两种商品');
      return;
    }
    
    // 确保选择了不同的商品
    if (product1.price === product2.price || product1.quantity === product2.quantity) {
      message.error('请选择两种不同的商品');
      return;
    }
    
    // 计算平均价格和需求量
    const avgPrice1 = data.reduce((sum, item) => sum + Number(item[product1.price]), 0) / data.length;
    const avgPrice2 = data.reduce((sum, item) => sum + Number(item[product2.price]), 0) / data.length;
    const avgQuantity1 = data.reduce((sum, item) => sum + Number(item[product1.quantity]), 0) / data.length;
    const avgQuantity2 = data.reduce((sum, item) => sum + Number(item[product2.quantity]), 0) / data.length;
    
    // 计算价格和需求量的变化率
    const priceChanges2 = [];
    const quantityChanges1 = [];
    
    for (let i = 1; i < data.length; i++) {
      const prevPrice2 = Number(data[i-1][product2.price]);
      const currPrice2 = Number(data[i][product2.price]);
      const prevQuantity1 = Number(data[i-1][product1.quantity]);
      const currQuantity1 = Number(data[i][product1.quantity]);
      
      // 计算百分比变化
      const priceChange = (currPrice2 - prevPrice2) / ((currPrice2 + prevPrice2) / 2);
      const quantityChange = (currQuantity1 - prevQuantity1) / ((currQuantity1 + prevQuantity1) / 2);
      
      priceChanges2.push(priceChange);
      quantityChanges1.push(quantityChange);
    }
    
    // 计算交叉弹性（需求量1对价格2的弹性）
    let totalCrossElasticity = 0;
    const crossElasticityPoints = [];
    
    for (let i = 0; i < priceChanges2.length; i++) {
      if (priceChanges2[i] !== 0) {
        const pointElasticity = quantityChanges1[i] / priceChanges2[i];
        totalCrossElasticity += pointElasticity;
        
        crossElasticityPoints.push({
          index: i + 1,
          price2: data[i+1][product2.price],
          quantity1: data[i+1][product1.quantity],
          elasticity: pointElasticity.toFixed(2)
        });
      }
    }
    
    const avgCrossElasticity = totalCrossElasticity / priceChanges2.filter(change => change !== 0).length;
    
    setCrossElasticity({
      value: avgCrossElasticity.toFixed(2),
      interpretation: interpretCrossElasticity(avgCrossElasticity),
      points: crossElasticityPoints
    });
    
    // 准备图表数据
    prepareChartData();
  };
  
  // 解释交叉弹性
  const interpretCrossElasticity = (elasticity) => {
    if (elasticity > 0) return '替代品关系 (一种商品价格上升导致另一种商品需求量增加)';
    if (elasticity < 0) return '互补品关系 (一种商品价格上升导致另一种商品需求量减少)';
    return '无关联商品 (一种商品价格变化不影响另一种商品需求量)';
  };
  
  // 准备图表数据
  const prepareChartData = () => {
    if (!product1 || !product2 || !data.length) return;
    
    const chartPoints = data.map(item => [
      Number(item[product2.price]),  // X轴: 商品2价格
      Number(item[product1.quantity]) // Y轴: 商品1需求量
    ]);
    
    setChartData(chartPoints);
  };
  
  // 获取可选的价格和需求量列
  const getPriceOptions = () => {
    if (!data.length) return [];
    const firstRow = data[0];
    return Object.keys(firstRow)
      .filter(col => 
        col.toLowerCase().includes('价格') || 
        col.toLowerCase().includes('price')
      )
      .map(col => (
        <Option key={col} value={col}>{col}</Option>
      ));
  };
  
  const getQuantityOptions = () => {
    if (!data.length) return [];
    const firstRow = data[0];
    return Object.keys(firstRow)
      .filter(col => 
        col.toLowerCase().includes('需求量') || 
        col.toLowerCase().includes('quantity')
      )
      .map(col => (
        <Option key={col} value={col}>{col}</Option>
      ));
  };
  
  // 导出Excel文件
  const exportToExcel = () => {
    if (!data.length || !crossElasticity) {
      message.warning('没有数据可导出');
      return;
    }
    
    try {
      // 创建工作簿
      const workbook = XLSX.utils.book_new();
      
      // 创建原始数据工作表
      const originalDataWS = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, originalDataWS, '原始数据');
      
      // 创建交叉弹性分析结果工作表
      if (crossElasticity && crossElasticity.points && crossElasticity.points.length > 0) {
        const elasticityWS = XLSX.utils.json_to_sheet(crossElasticity.points);
        XLSX.utils.book_append_sheet(workbook, elasticityWS, '交叉弹性分析结果');
      }
      
      // 导出Excel文件
      XLSX.writeFile(workbook, '交叉弹性分析结果.xlsx');
      
      message.success('导出成功');
    } catch (error) {
      console.error('导出Excel文件出错:', error);
      message.error('导出失败，请重试');
    }
  };
  
  // 图表配置
  const getChartOption = () => {
    return {
      title: {
        text: `${product1.quantity.replace('需求量', '')}需求量 vs ${product2.price.replace('价格', '')}价格`,
        left: 'center'
      },
      tooltip: {
        trigger: 'axis',
        formatter: function(params) {
          return `${product2.price}: ${params[0].data[0]}<br/>${product1.quantity}: ${params[0].data[1]}`;
        }
      },
      xAxis: {
        type: 'value',
        name: product2.price,
        nameLocation: 'middle',
        nameGap: 30
      },
      yAxis: {
        type: 'value',
        name: product1.quantity,
        nameLocation: 'middle',
        nameGap: 30
      },
      series: [{
        data: chartData,
        type: 'scatter',
        symbolSize: 10,
        itemStyle: {
          color: '#1890ff'
        }
      }]
    };
  };

  return (
    <div>
      <Card className="instructions">
        <Title level={4}>使用说明</Title>
        <Paragraph>
          1. 上传包含至少两种商品价格和需求量数据的Excel文件
        </Paragraph>
        <Paragraph>
          2. 选择要分析的两种商品（分别选择它们的价格列和需求量列）
        </Paragraph>
        <Paragraph>
          3. 点击「计算交叉弹性」按钮查看分析结果
        </Paragraph>
      </Card>

      <Upload
        beforeUpload={handleFileUpload}
        accept=".xlsx,.xls"
        showUploadList={false}
      >
        <Button icon={<UploadOutlined />} type="primary" size="large">
          上传Excel文件
        </Button>
        <Tooltip title="Excel文件必须包含至少两种商品的价格和需求量列">
          <InfoCircleOutlined style={{ marginLeft: 8 }} />
        </Tooltip>
      </Upload>

      {data.length > 0 && (
        <div className="result-section">
          <Card title="选择要分析的商品" style={{ marginTop: 20 }}>
            <Row gutter={16}>
              <Col span={12}>
                <Title level={5}>商品1</Title>
                <div style={{ marginBottom: 16 }}>
                  <Text>价格列：</Text>
                  <Select 
                    style={{ width: 200 }} 
                    value={product1.price}
                    onChange={(value) => setProduct1({...product1, price: value})}
                  >
                    {getPriceOptions()}
                  </Select>
                </div>
                <div>
                  <Text>需求量列：</Text>
                  <Select 
                    style={{ width: 200 }} 
                    value={product1.quantity}
                    onChange={(value) => setProduct1({...product1, quantity: value})}
                  >
                    {getQuantityOptions()}
                  </Select>
                </div>
              </Col>
              <Col span={12}>
                <Title level={5}>商品2</Title>
                <div style={{ marginBottom: 16 }}>
                  <Text>价格列：</Text>
                  <Select 
                    style={{ width: 200 }} 
                    value={product2.price}
                    onChange={(value) => setProduct2({...product2, price: value})}
                  >
                    {getPriceOptions()}
                  </Select>
                </div>
                <div>
                  <Text>需求量列：</Text>
                  <Select 
                    style={{ width: 200 }} 
                    value={product2.quantity}
                    onChange={(value) => setProduct2({...product2, quantity: value})}
                  >
                    {getQuantityOptions()}
                  </Select>
                </div>
              </Col>
            </Row>
            <Button 
              type="primary" 
              onClick={calculateCrossElasticity}
              style={{ marginTop: 16 }}
            >
              计算交叉弹性
            </Button>
          </Card>

          {crossElasticity && (
            <>
              <Space style={{ marginTop: 20, marginBottom: 16 }}>
                <Button 
                  type="primary" 
                  icon={<DownloadOutlined />}
                  onClick={exportToExcel}
                >
                  导出结果
                </Button>
              </Space>
              {/* 移除了界面上显示的分析结果，只保留导出按钮 */}
            </>
          )}

          <Card title="原始数据" style={{ marginTop: 20 }}>
            <Table 
              dataSource={data} 
              columns={columns} 
              rowKey={(record, index) => index}
              pagination={{ 
                pageSize: 10, 
                showSizeChanger: true, 
                pageSizeOptions: ['5', '10', '20', '50', '100'],
                showTotal: (total) => `共 ${total} 条数据`
              }}
              scroll={{ x: 'max-content' }}
            />
          </Card>
        </div>
      )}
    </div>
  );
};

export default CrossElasticity;