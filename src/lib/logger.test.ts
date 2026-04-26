import { afterEach, describe, expect, it, vi } from "vitest";

import { createConsoleLogger, parseLogLevel } from "./logger.ts";

describe("logger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("defaults to silent logging", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const debug = vi.spyOn(console, "debug").mockImplementation(() => {});

    const logger = createConsoleLogger();

    logger.debug("debug");
    logger.info("info");
    logger.warn("warn");
    logger.error("error");

    expect(debug).not.toHaveBeenCalled();
    expect(info).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it("logs messages at or above the configured level", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const debug = vi.spyOn(console, "debug").mockImplementation(() => {});

    const logger = createConsoleLogger("test", { level: "warn" });

    logger.debug("debug");
    logger.info("info");
    logger.warn("warn");
    logger.error("error");

    expect(debug).not.toHaveBeenCalled();
    expect(info).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith("[test] warn");
    expect(error).toHaveBeenCalledWith("[test] error");
  });

  it("parses blank and disabled log levels as silent", () => {
    expect(parseLogLevel(undefined)).toBe("silent");
    expect(parseLogLevel("")).toBe("silent");
    expect(parseLogLevel("off")).toBe("silent");
    expect(parseLogLevel("none")).toBe("silent");
  });
});
