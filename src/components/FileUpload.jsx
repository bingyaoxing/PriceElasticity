import React, { useState } from 'react';
import './FileUpload.css';

const FileUpload = () => {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // 检查文件类型是否为Excel文件
      if (selectedFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
          selectedFile.type === 'application/vnd.ms-excel' ||
          selectedFile.name.endsWith('.xlsx') ||
          selectedFile.name.endsWith('.xls')) {
        setFile(selectedFile);
        setFileName(selectedFile.name);
        setUploadStatus('');
      } else {
        setFile(null);
        setFileName('');
        setUploadStatus('错误：请上传Excel文件（.xlsx或.xls格式）');
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setUploadStatus('请先选择一个Excel文件');
      return;
    }

    setIsUploading(true);
    setUploadStatus('正在上传...');

    try {
      // 这里是模拟上传过程，实际应用中应替换为真实的API调用
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // 模拟上传成功
      setUploadStatus('上传成功！');
      // 实际应用中，这里应该处理服务器返回的数据
    } catch (error) {
      console.error('上传文件时出错:', error);
      setUploadStatus('上传失败，请重试');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="file-upload-container">
      <div className="file-upload-box">
        <div className="file-input-wrapper">
          <input
            type="file"
            id="excel-file"
            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            onChange={handleFileChange}
            disabled={isUploading}
            className="file-input"
          />
          <label htmlFor="excel-file" className="file-label">
            选择Excel文件
          </label>
          {fileName && <span className="file-name">{fileName}</span>}
        </div>
        
        <button 
          className="upload-button" 
          onClick={handleUpload} 
          disabled={!file || isUploading}
        >
          {isUploading ? '上传中...' : '上传Excel文件'}
        </button>
      </div>
      
      {uploadStatus && (
        <div className={`upload-status ${uploadStatus.includes('错误') || uploadStatus.includes('失败') ? 'error' : ''}`}>
          {uploadStatus}
        </div>
      )}
    </div>
  );
};

export default FileUpload;