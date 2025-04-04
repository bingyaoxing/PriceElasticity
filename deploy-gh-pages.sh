#!/bin/bash

# 价格弹性分析助手 - GitHub Pages部署脚本

echo "===== 开始部署到GitHub Pages ====="

# 确保已安装依赖
echo "正在检查依赖..."
npm install

# 构建项目
echo "正在构建项目..."
npm run build

# 创建部署目录
echo "准备部署文件..."
rm -rf gh-pages
mkdir gh-pages
cp -r dist/* gh-pages/

# 创建.nojekyll文件（防止GitHub Pages忽略以下划线开头的文件）
touch gh-pages/.nojekyll

echo "===== 部署文件已准备完成 ====="
echo "现在您可以将gh-pages目录中的内容推送到GitHub仓库的gh-pages分支"
echo "或者直接将这些文件上传到您的Web服务器"
echo ""
echo "如果您使用GitHub Actions自动部署，请参考DEPLOYMENT.md中的说明"