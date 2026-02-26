---
alwaysApply: false
globs: *.tsx
---
* 图标：lucide-react按需导入
* 移动端：useIsMobile hook判断
* useEffect 内禁止同步调用 setState，仅允许异步回调中设置状态，同步场景应直接初始化/计算状态