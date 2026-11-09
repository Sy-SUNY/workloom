# 调研与方案记录

检索日期：2026-11-09。搜索公开作品集集合、作者本人网站和 GitHub 同类仓库后，阅读下列一手页面。无法确认作者当前求职状态，故作为专业展示页面参考。

## 作品集

| 来源 | 观察 | 应用 |
| --- | --- | --- |
| https://brittanychiang.com/ | 身份、经历、项目、技术标签可快速浏览 | 首页清晰定位与可验证项目入口 |
| https://leerob.com/ | 简短简介、写作呈现专业思考 | 单独的项目复盘与取舍说明 |
| https://www.developerportfolios.com/ | 多个开发者作品集的检索入口 | 扩展样本 |
| https://www.portfoliogallery.dev/ | 作品集与代码集合 | 扩展样本 |

## GitHub 同类项目

| 项目 | 官方来源 | 可借鉴能力 | 本项目优化方向 |
| --- | --- | --- | --- |
| Onyx FOSS | https://github.com/onyx-dot-app/onyx-foss | 团队资料、权限与自定义 Agent | 可解释的岗位资料范围、引用、执行步骤 |
| AnythingLLM | https://github.com/Mintplex-Labs/anything-llm | 工作空间、知识与自托管 | 减少依赖，围绕单个员工的闭环 |
| Dify | https://github.com/langgenius/dify | 模型、RAG 和工作流 | 从员工任务出发，不做通用流程画布 |
| LangGraph | https://github.com/langchain-ai/langgraph | 状态化智能体编排 | 固定、可观察链路优先，再按需求引入图框架 |

## 实现决策

当前采用独立实现，不 Fork 完整平台，避免将大平台的部署复杂度带入面试演示。这里的“在同类项目基础上优化”指以调研结果为产品与架构基线，不表示源码复用。若后续要求基于某个具体开源仓库二次开发，应明确选择上游、固定提交与许可证，再增加本项目的员工配置和评测层。

已经实现：无第三方依赖的后端、岗位与个人范围过滤、片段检索、原文来源、个人配置版本、反馈和历史。未实现：生产账号认证、向量召回、模型微调、自动业务工具调用。

## 许可核验

- AnythingLLM：MIT，https://raw.githubusercontent.com/Mintplex-Labs/anything-llm/master/LICENSE
- Onyx FOSS：MIT，https://raw.githubusercontent.com/onyx-dot-app/onyx-foss/main/LICENSE
- LangGraph：仓库标示 MIT。
- Dify：有独立许可条款，不视作无条件可复制的 MIT 上游。本项目未复制其代码。

## 评测原则

按岗位建立脱敏任务集，检查：知识是否命中、引用是否相关、无依据时是否说明不足、资料是否越权、结果是否可操作。当前自动化测试验证工程行为，不等同于真实模型准确率评测，不填写未测量的提升比例。
