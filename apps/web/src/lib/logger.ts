/* Minimal structured logger. Swap the sink (e.g. an error tracker) here without touching call sites. */
type Level = "debug" | "info" | "warn" | "error";
type Context = Record<string, unknown>;

function log(level: Level, message: string, context?: Context) {
  if (level === "debug" && process.env.NODE_ENV === "production") return;
  const entry = { level, message, ...context, ts: new Date().toISOString() };
  const sink = level === "debug" ? console.log : console[level];
  sink(`[web] ${message}`, entry);
}

export const logger = {
  debug: (message: string, context?: Context) => log("debug", message, context),
  info: (message: string, context?: Context) => log("info", message, context),
  warn: (message: string, context?: Context) => log("warn", message, context),
  error: (message: string, context?: Context) => log("error", message, context),
};
