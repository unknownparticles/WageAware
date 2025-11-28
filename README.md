# WageAware - 打工人计算器

这是一个帮助"打工人"实时追踪薪资、工时和加班情况的计算器应用。

## 功能特点

- **实时薪资追踪**: 根据设定的月薪和工作时间，实时计算当前已赚取的薪资。
- **工时统计**: 记录每日工作时长，自动计算加班时间。
- **多种视图**:
    - **打卡**: 每日上下班打卡，实时显示今日收益。
    - **日历**: 查看历史打卡记录，补卡或记录请假。
    - **统计**: 可视化展示收入和工时趋势。
- **隐私安全**: 所有数据仅保存在本地浏览器中，不会上传到任何服务器。

## 部署说明

本项目采用预构建静态文件的方式部署到 GitHub Pages，无需在 GitHub 上运行构建命令。

1. **本地构建**:
   在本地运行以下命令生成 `docs` 目录：
   ```bash
   npm run build
   ```
   确保 `docs` 目录包含 `index.html` 和 `assets` 文件夹。

2. **提交代码**:
   将 `docs` 目录及其内容提交并推送到 GitHub 仓库。

3. **配置 GitHub Pages**:
   - 进入仓库的 `Settings` > `Pages`。
   - 在 `Build and deployment` 部分，`Source` 选择 `Deploy from a branch`。
   - 在 `Branch` 部分，选择 `main` (或 `master`) 分支，文件夹选择 `/docs`。
   - 点击 `Save`。

GitHub Pages 将会自动部署 `docs` 目录中的内容。

## 本地运行

**前置要求:** Node.js

1. 安装依赖:
   ```bash
   npm install
   ```
2. 启动开发服务器:
   ```bash
   npm run dev
   ```
3. 构建生产版本:
   ```bash
   npm run build
   ```
