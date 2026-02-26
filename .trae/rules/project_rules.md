---
alwaysApply: true
---
# Vibe Template CF

## 技术栈
- **核心**: Monorepo (Frontend + Functions + Shared)
- **前端**: Next.js 16 (App Router), React 19, TypeScript
- **后端**: Cloudflare Pages Functions, Hono
- **样式**: Tailwind CSS v4, shadcn/ui
- **状态**: Zustand (+ persist)
- **其他**: Lucide React, next-themes, Sonner

## 目录结构
- `frontend/`: Next.js 前端应用
  - `app/`: 页面布局
  - `components/`: UI 组件 (`ui/`) 与业务组件
  - `lib/`: 工具函数 (`utils/`) 与 API 客户端 (`api/`)
  - `stores/`: Zustand 状态管理
- `functions/`: Cloudflare 后端服务 (Hono)
  - `routes/`: API 路由
  - `middleware/`: 中间件 (Auth, CORS)
  - `utils/`: 后端工具函数
- `shared/`: 前后端共享代码
  - `src/types/`: 共享类型定义
