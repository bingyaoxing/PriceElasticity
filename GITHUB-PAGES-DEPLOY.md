# GitHub Pages 部署指南

本文档提供了将价格弹性分析助手部署到GitHub Pages的详细步骤。

## 准备工作

1. 确保您已经有一个GitHub账号
2. 安装了Git命令行工具
3. 已经执行了`deploy-gh-pages.sh`脚本，生成了`gh-pages`目录

## 部署步骤

### 1. 创建GitHub仓库

1. 登录您的GitHub账号
2. 点击右上角的"+"按钮，选择"New repository"
3. 仓库名称设置为`PriceElasticity-web`
4. 选择公开(Public)仓库
5. 点击"Create repository"按钮创建仓库

### 2. 初始化本地Git仓库并推送代码

```bash
# 在项目根目录下初始化Git仓库
git init

# 添加所有文件到暂存区
git add .

# 提交更改
git commit -m "Initial commit"

# 添加远程仓库
git remote add origin https://github.com/您的用户名/PriceElasticity-web.git

# 推送到主分支
git push -u origin main
```

### 3. 创建并推送gh-pages分支

```bash
# 创建一个新的gh-pages分支
git checkout --orphan gh-pages

# 删除所有文件（不用担心，我们会添加gh-pages目录中的文件）
git rm -rf .

# 添加gh-pages目录中的所有文件
cp -r gh-pages/* .
cp gh-pages/.nojekyll .

# 添加所有文件到暂存区
git add .

# 提交更改
git commit -m "Add gh-pages content"

# 推送到gh-pages分支
git push -u origin gh-pages
```

### 4. 配置GitHub Pages

1. 在GitHub上打开您的仓库
2. 点击"Settings"选项卡
3. 在左侧菜单中点击"Pages"
4. 在"Source"部分，选择"Deploy from a branch"
5. 在"Branch"下拉菜单中选择"gh-pages"分支，文件夹选择"/ (root)"
6. 点击"Save"按钮

### 5. 访问您的网站

部署完成后，您可以通过以下URL访问您的网站：

```
https://您的用户名.github.io/PriceElasticity-web/
```

部署可能需要几分钟时间才能生效。

## 更新网站

当您对代码进行更改后，需要重新部署：

1. 执行`deploy-gh-pages.sh`脚本生成新的部署文件
2. 将更改推送到main分支
3. 切换到gh-pages分支并更新部署文件

```bash
# 提交main分支的更改
git add .
git commit -m "Update code"
git push origin main

# 切换到gh-pages分支
git checkout gh-pages

# 删除旧文件
git rm -rf .

# 添加新的部署文件
cp -r gh-pages/* .
cp gh-pages/.nojekyll .

# 提交并推送更改
git add .
git commit -m "Update deployment files"
git push origin gh-pages
```

## 使用GitHub Actions自动部署（可选）

如果您希望自动化部署过程，可以参考DEPLOYMENT.md中关于GitHub Actions的说明。