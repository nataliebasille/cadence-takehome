export type LogContext = Record<string, unknown>;

export type LogLevel = "silent" | "error" | "warn" | "info" | "debug";

export type Logger = {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
};

export type ConsoleLoggerOptions = {
  level?: LogLevel;
};

const logLevelPriority = {
  silent: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
} satisfies Record<LogLevel, number>;

export function parseLogLevel(value: unknown): LogLevel {
  if (value === undefined || value === null || value === "") {
    return "silent";
  }

  const normalized = String(value).toLowerCase();

  if (normalized === "none" || normalized === "off") {
    return "silent";
  }

  if (isLogLevel(normalized)) {
    return normalized;
  }

  throw new Error(
    `Invalid log level "${String(value)}". Expected silent, error, warn, info, or debug.`,
  );
}

export function createConsoleLogger(
  prefix = "cadence",
  { level = "silent" }: ConsoleLoggerOptions = {},
): Logger {
  return {
    debug: (message, context) => log("debug", level, prefix, message, context),
    info: (message, context) => log("info", level, prefix, message, context),
    warn: (message, context) => log("warn", level, prefix, message, context),
    error: (message, context) => log("error", level, prefix, message, context),
  };
}

type ConsoleLogLevel = Exclude<LogLevel, "silent">;

function isLogLevel(value: string): value is LogLevel {
  return value in logLevelPriority;
}

function log(
  messageLevel: ConsoleLogLevel,
  configuredLevel: LogLevel,
  prefix: string,
  message: string,
  context?: LogContext,
) {
  if (logLevelPriority[messageLevel] > logLevelPriority[configuredLevel]) {
    return;
  }

  const formattedMessage = `[${prefix}] ${message}`;

  if (context && Object.keys(context).length > 0) {
    console[messageLevel](formattedMessage, context);
    return;
  }

  console[messageLevel](formattedMessage);
}
