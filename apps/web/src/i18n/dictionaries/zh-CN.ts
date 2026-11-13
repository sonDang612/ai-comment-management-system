/**
 * Simplified Chinese: the default language and the source of truth for the dictionary shape.
 * Every other language must implement `Dictionary` (TypeScript reports missing keys).
 * Placeholders use `{name}` and are filled with `format()` from `@/i18n/format`.
 */
const zhCN = {
  meta: {
    title: "AI 评论审核",
    description: "AI 评论审核服务管理后台",
  },
  common: {
    appName: "AI 评论审核",
    language: "语言",
    backToHome: "返回首页",
    tryAgain: "重试",
  },
  errorPage: {
    title: "出错了",
    description: "发生了意外错误，请重试。",
  },
  notFoundPage: {
    title: "页面不存在",
  },
  /** Messages for API error codes (`ErrorCode` in @acms/shared, plus `network_error`). */
  apiErrors: {
    bad_request: "请求无效",
    unauthorized: "请先登录",
    forbidden: "没有权限执行此操作",
    not_found: "请求的资源不存在",
    conflict: "资源冲突，请刷新后重试",
    validation_error: "提交的数据有误",
    rate_limited: "请求过于频繁，请稍后再试",
    service_unavailable: "服务暂时不可用",
    internal_error: "服务器内部错误",
    network_error: "无法连接到服务器",
  },
  health: {
    title: "API 状态",
    checking: "检查中…",
    unreachable: "API 无法访问：{message}",
    lastChecked: "最后检查：{time}",
    refresh: "刷新",
    refreshing: "刷新中…",
    status: {
      ok: "正常",
      degraded: "降级",
      error: "异常",
      down: "不可用",
    },
    checks: {
      database: "数据库",
      redis: "Redis",
      ai_service: "AI 服务",
      worker: "AI 任务处理",
    } as Record<string, string>,
  },
};

export type Dictionary = typeof zhCN;
export default zhCN;
