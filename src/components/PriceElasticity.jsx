import React, { useState, useEffect, useRef } from 'react';
import { Upload, Button, Table, Card, Typography, message, Tooltip, Space } from 'antd';
import { UploadOutlined, InfoCircleOutlined, DownloadOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';
import ReactECharts from 'echarts-for-react';

const { Title, Paragraph, Text } = Typography;

const PriceElasticity = () => {
  const [data, setData] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [currentElasticity, setCurrentElasticity] = useState(null);
  const [hoveredPrice, setHoveredPrice] = useState(null);
  const [elasticityData, setElasticityData] = useState([]);
  const chartRef = useRef(null);

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

        // 检查是否包含必要的列
        const firstRow = jsonData[0];
        const columnNames = Object.keys(firstRow);
        
        // 使用更宽松的匹配方式，检查列名是否包含关键词（不区分大小写）
        const priceColumns = columnNames.filter(col => 
          col.toLowerCase().includes('价格') || 
          col.toLowerCase().includes('price')
        );
        const quantityColumns = columnNames.filter(col => 
          col.toLowerCase().includes('需求量') || 
          col.toLowerCase().includes('quantity')
        );
        
        if (priceColumns.length === 0 || quantityColumns.length === 0) {
          message.error('Excel文件必须包含「价格」和「需求量」列，或包含英文price和quantity关键词的列');
          return false;
        }
        
        // 确定实际使用的列名（使用找到的第一个匹配列）
        const priceColumn = priceColumns[0];
        const quantityColumn = quantityColumns[0];

        // 按价格排序
        const sortedData = jsonData.sort((a, b) => a[priceColumn] - b[priceColumn]);
        setData(sortedData);

        // 计算弹性并准备图表数据
        processData(sortedData, priceColumn, quantityColumn);
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

  // 处理数据并计算弹性
  const processData = (data, priceColumn, quantityColumn) => {
    if (data.length < 2) {
      message.warning('数据点不足，无法计算弹性');
      return;
    }

    const chartPoints = data.map(item => [item[priceColumn], item[quantityColumn]]);
    setChartData(chartPoints);

    // 计算每个点的弧弹性
    const elasticityPoints = [];
    for (let i = 0; i < data.length - 1; i++) {
      const p1 = data[i][priceColumn];
      const q1 = data[i][quantityColumn];
      const p2 = data[i + 1][priceColumn];
      const q2 = data[i + 1][quantityColumn];

      // 计算弧弹性: ((Q2-Q1)/((Q2+Q1)/2))/((P2-P1)/((P2+P1)/2))
      const avgP = (p1 + p2) / 2;
      const avgQ = (q1 + q2) / 2;
      const percentChangeQ = (q2 - q1) / avgQ;
      const percentChangeP = (p2 - p1) / avgP;
      const arcElasticity = Math.abs(percentChangeQ / percentChangeP);

      elasticityPoints.push({
        priceRange: `${p1} - ${p2}`,
        midPrice: avgP,
        elasticity: arcElasticity.toFixed(2),
        interpretation: interpretElasticity(arcElasticity)
      });
    }
    
    setElasticityData(elasticityPoints);

  };

  // 解释弹性值
  const interpretElasticity = (elasticity) => {
    if (elasticity > 1) return '富有弹性 (需求量变化比例大于价格变化比例)';
    if (elasticity < 1) return '缺乏弹性 (需求量变化比例小于价格变化比例)';
    return '单位弹性 (需求量变化比例等于价格变化比例)';
  };
  
  // 导出Excel文件
  const exportToExcel = () => {
    if (!data.length || !elasticityData.length) {
      message.warning('没有数据可导出');
      return;
    }
    
    try {
      // 创建工作簿
      const workbook = XLSX.utils.book_new();
      
      // 创建原始数据工作表
      const originalDataWS = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, originalDataWS, '原始数据');
      
      // 创建弹性分析结果工作表
      const elasticityWS = XLSX.utils.json_to_sheet(elasticityData);
      XLSX.utils.book_append_sheet(workbook, elasticityWS, '弹性分析结果');
      
      // 导出Excel文件
      XLSX.writeFile(workbook, '价格弹性分析结果.xlsx');
      
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
        text: '价格-需求曲线',
        left: 'center'
      },
      tooltip: {
        trigger: 'axis',
        formatter: function(params) {
          const price = params[0].data[0];
          const quantity = params[0].data[1];
          let elasticityInfo = '';
          
          // 查找当前价格对应的弹性
          for (let i = 0; i < elasticityData.length; i++) {
            const [min, max] = elasticityData[i].priceRange.split(' - ').map(Number);
            if (price >= min && price <= max) {
              elasticityInfo = `<br/>弧弹性: ${elasticityData[i].elasticity}<br/>${elasticityData[i].interpretation}`;
              break;
            }
          }
          
          return `价格: ${price}<br/>需求量: ${quantity}${elasticityInfo}`;
        }
      },
      xAxis: {
        type: 'value',
        name: '价格',
        nameLocation: 'middle',
        nameGap: 30
      },
      yAxis: {
        type: 'value',
        name: '需求量',
        nameLocation: 'middle',
        nameGap: 30
      },
      series: [{
        data: chartData,
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        itemStyle: {
          color: '#1890ff'
        },
        lineStyle: {
          width: 3
        }
      }]
    };
  };

  // 监听图表鼠标移动事件
  useEffect(() => {
    if (chartRef.current && chartRef.current.getEchartsInstance()) {
      const chart = chartRef.current.getEchartsInstance();
      
      chart.on('mouseover', (params) => {
        const price = params.data[0];
        setHoveredPrice(price);
        
        // 查找当前价格对应的弹性
        for (let i = 0; i < elasticityData.length; i++) {
          const [min, max] = elasticityData[i].priceRange.split(' - ').map(Number);
          if (price >= min && price <= max) {
            setCurrentElasticity(elasticityData[i]);
            break;
          }
        }
      });
      
      chart.on('mouseout', () => {
        setHoveredPrice(null);
        setCurrentElasticity(null);
      });
    }
  }, [chartData, elasticityData]);

  // 表格列定义
  const columns = [
    {
      title: '价格区间',
      dataIndex: 'priceRange',
      key: 'priceRange',
    },
    {
      title: '弧弹性',
      dataIndex: 'elasticity',
      key: 'elasticity',
      render: (text) => <Text strong>{text}</Text>
    },
    {
      title: '解释',
      dataIndex: 'interpretation',
      key: 'interpretation',
    },
  ];

  return (
    <div>
      <Card className="instructions">
        <Title level={4}>使用说明</Title>
        <Paragraph>
          1. 上传包含价格和需求量数据的Excel文件（必须包含「价格」/「price」和「需求量」/「quantity」列）
        </Paragraph>
        <Paragraph>
          2. 系统将自动计算价格弧弹性并生成价格-需求曲线
        </Paragraph>
        <Paragraph>
          3. 将鼠标悬停在曲线上可查看该价格点的弹性值
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
        <Tooltip title="Excel文件必须包含「价格」/「price」和「需求量」/「quantity」列">
          <InfoCircleOutlined style={{ marginLeft: 8 }} />
        </Tooltip>
      </Upload>

      {chartData.length > 0 && (
        <div className="result-section">
          <Space style={{ marginBottom: 16 }}>
            <Button 
              type="primary" 
              icon={<DownloadOutlined />}
              onClick={exportToExcel}
            >
              导出结果
            </Button>
          </Space>
          <div className="chart-container">
            <ReactECharts 
              option={getChartOption()} 
              style={{ height: '400px' }} 
              ref={chartRef}
            />
          </div>
          
          {/* 移除了界面上显示的分析结果，只保留导出按钮 */}
        </div>
      )}
    </div>
  );
};

export default PriceElasticity;