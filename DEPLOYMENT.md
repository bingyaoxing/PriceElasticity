# 价格弹性分析助手部署指南

本文档提供了将价格弹性分析助手部署到网络上的多种方法，让所有人都能访问。

## 前提条件

- 已完成项目构建（`npm run build`）
- 生成的`dist`目录包含所有静态资源

## 部署选项

### 1. GitHub Pages（推荐，免费）

1. 在GitHub上创建一个新仓库
2. 修改`vite.config.js`，添加base配置（如果部署到非根目录）：
   ```js
   export default defineConfig({
     plugins: [react()],
     base: '/your-repo-name/', // 如果部署到根目录，可以省略此行
     // 其他配置...
   })
   ```
3. 重新构建项目：`npm run build`
4. 将代码推送到GitHub仓库：
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/your-username/your-repo-name.git
   git push -u origin main
   ```
5. 在GitHub仓库设置中启用GitHub Pages，选择从`main`分支的`/docs`文件夹或使用GitHub Actions部署

### 2. Vercel（推荐，有免费计划）

1. 注册[Vercel](https://vercel.com/)账号
2. 安装Vercel CLI或直接使用网页界面
3. 通过CLI部署：
   ```bash
   npm install -g vercel
   vercel login
   vercel
   ```
4. 或者将代码推送到GitHub，然后在Vercel中导入该仓库

### 3. Netlify（推荐，有免费计划）

1. 注册[Netlify](https://www.netlify.com/)账号
2. 通过拖放`dist`文件夹到Netlify部署界面进行快速部署
3. 或者将代码推送到GitHub，然后在Netlify中导入该仓库

### 4. 传统Web服务器（Apache/Nginx）

1. 将`dist`目录中的所有文件上传到Web服务器的根目录或子目录
2. 配置服务器支持单页应用（SPA）路由：

   **Apache**（.htaccess文件）：
   ```
   <IfModule mod_rewrite.c>
     RewriteEngine On
     RewriteBase /
     RewriteRule ^index\.html$ - [L]
     RewriteCond %{REQUEST_FILENAME} !-f
     RewriteCond %{REQUEST_FILENAME} !-d
     RewriteRule . /index.html [L]
   </IfModule>
   ```

   **Nginx**（nginx.conf）：
   ```
   location / {
     try_files $uri $uri/ /index.html;
   }
   ```

## 自定义域名设置

1. 购买域名（如Namecheap、GoDaddy等）
2. 在DNS提供商处添加记录，指向你的部署平台
3. 在部署平台（GitHub Pages、Vercel、Netlify等）配置自定义域名

## 注意事项

- 确保构建时的`base`路径配置正确
- 如果应用有API调用，确保API端点可以从公网访问
- 考虑设置HTTPS以提高安全性（大多数现代部署平台默认提供）

## 部署后检查

1. 验证所有功能是否正常工作
2. 测试在不同设备和浏览器上的兼容性
3. 确认上传Excel文件和数据处理功能正常