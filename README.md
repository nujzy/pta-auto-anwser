# PTA 智能答题助手 (PTA Intelligent Exam Assistant)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/Version-1.0.1-blueviolet.svg)](#)

这是一个专为 PTA (拼题A) 平台研发的**全自动、智能化、自适应**答题插件。它基于原生 JavaScript 编写，完美绕过沙盒环境并无缝对接主流 React 底层框架，支持各种大语言模型，帮助你高效、自动化地完成 PTA 平台上的各类题型。

> ⚠️ **声明**：本脚本仅用于学术研究与个人习惯的定制化学习交流，请勿用于任何正式考试或违规作弊行为！

---

## 💝 致敬与版权声明 (Credits & Disclaimer)

- 本项目的诞生离不开开源社区的无私奉献。本脚本是基于原作者 **weishijie-detail** 在 Greasy Fork 上发布的 [**PTA 智能答题助手 (v2.1.2)**](https://greasyfork.org/zh-CN/scripts/567339-pta-%E6%99%BA%E8%83%BD%E7%AD%94%E9%A2%98%E5%8A%A9%E6%89%8B) 进行的二次开发、代码重构与个人习惯定制。
- 在此向原作者 **weishijie-detail** 表示最由衷的感谢！原脚本精妙的逻辑和实用的功能为本项目提供了极具价值的奠基。

## 🌿关于分叉（Fork）形式的特别说明：  
- 由于个人有**长期定制化修改**的需求，因此我选择将此定制版独立托管在 GitHub 仓库进行维护。

- **致原作者 (weishijie-detail)**：我非常尊重您的知识产权和精神权利。如果您作为原作者，不希望看到本脚本以这种独立 Fork 仓库的形式存在，或者对本项目的呈现方式有任何异议，**请随时通过 GitHub Issue 或其他渠道联系我，会在第一时间配合进行修改、隐藏或删除仓库处理。** 再次感谢您的开源成果！

---

## ✨ 核心特性

* **🤖 模型兼容（OpenAI 风格 API）**
  * 内置支持 **硅基流动、DeepSeek 官方、OpenAI、阿里云百炼、智谱AI** 等主流大模型服务。
  * 支持一键动态获取并自动刷新服务商提供的模型列表。
* **🧩 题型覆盖**
  * 目前自动答题仅能支持 **函数题和编程题**。
  * **编程语言自适应**：脚本能根据 PTA 答题框左上角所选的语言，自动切换并生成对应的代码。

---

## 🛠️ 安装与使用指引

### 1. 准备工作
确保你的浏览器已安装用户脚本管理器扩展（如 **Tampermonkey** / **Violentmonkey**）。

### 2. 一键安装
点击下方链接，油猴插件将自动捕获并提示安装最新版本：
👉 [**点击此处安装最新版脚本**](https://raw.githubusercontent.com/nujzy/pta-auto-anwser/main/auto-anwser.user.js)

### 3. 使用步骤
1. 打开进入任意 [PTA 题目页面](https://pintia.cn/)。
2. 按下 `Ctrl + Shift + A` 唤醒助手面板。
3. 在 **⚙️ 配置** 选项卡中，选择你的服务商（或手动填写 Base URL），输入你的 `API Key`。
4. 点击 **🔄 获取模型列表**，并在下拉框中选择你偏好的大模型。
5. 点击底部的 **💾 保存配置**。
6. 切换到 **📝 答题** 面板，点击 **▶️ 开始自动**，即可静观脚本进行一键分析、答题、填入、提交并自动跳转下一题的全自动化闭环流程。

---

## 📄 开源许可证

本项目基于 **[MIT License](LICENSE)** 协议开源。在此由衷感谢 PTA 平台优美的布局设计以及开源社区和大模型生态的贡献。