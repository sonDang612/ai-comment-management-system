import type { Dictionary } from "./zh-CN";

const en: Dictionary = {
  meta: {
    title: "AI Comment Moderation",
    description: "Admin console for the AI Comment Moderation service",
  },
  common: {
    appName: "AI Comment Moderation",
    appShortName: "AICM",
    language: "Language",
    backToHome: "Back to home",
    tryAgain: "Try again",
  },
  nav: {
    label: "Main navigation",
    comments: "Comments",
    status: "API status",
    open: "Open navigation menu",
    close: "Close navigation menu",
  },
  theme: {
    switchToDark: "Switch to dark mode",
    switchToLight: "Switch to light mode",
  },
  errorPage: {
    title: "Something went wrong",
    description: "An unexpected error occurred. Please try again.",
  },
  notFoundPage: {
    title: "Page not found",
  },
  apiErrors: {
    bad_request: "Invalid request",
    unauthorized: "Please sign in",
    forbidden: "You do not have permission to do this",
    not_found: "The requested resource does not exist",
    conflict: "Conflict, please refresh and try again",
    validation_error: "The submitted data is invalid",
    rate_limited: "Too many requests, please try again later",
    service_unavailable: "Service temporarily unavailable",
    internal_error: "Internal server error",
    network_error: "Cannot reach the server",
  },
  comments: {
    title: "Comment management",
    formTitle: "Post a comment",
    contentLabel: "Comment",
    contentPlaceholder: "Write a comment…",
    create: "Post a comment",
    submit: "Submit",
    cancel: "Cancel",
    submitted: "Comment submitted. Moderation result: {status}",
    refresh: "Refresh",
    empty: "No comments yet",
    searchLabel: "Search comments",
    searchPlaceholder: "Search comment content",
    filterLabel: "Filter by status",
    filterAll: "All",
    total: "{total} in total",
    loadFailed: "Failed to load comments: {message}",
    columns: {
      content: "Content",
      status: "Status",
      reason: "Reason",
      createdAt: "Submitted at",
    },
    status: {
      approved: "Approved",
      pending: "Pending",
      disabled: "Disabled",
    },
  },
  health: {
    title: "API status",
    checking: "Checking…",
    unreachable: "API unreachable: {message}",
    lastChecked: "Last checked: {time}",
    refresh: "Refresh",
    refreshing: "Refreshing…",
    status: {
      ok: "OK",
      degraded: "Degraded",
      error: "Error",
      down: "Down",
    },
    checks: {
      database: "Database",
      redis: "Redis",
      ai_service: "AI service",
      worker: "AI worker",
    },
  },
};

export default en;
