import { EventEmitter } from "events";
import fs from "node:fs";
import path from "node:path";
import type {
  PerformanceMetric,
  MemoryUsage,
  CpuUsage,
  PerformanceSummary,
  Alert,
  MonitorConfig,
  Stats,
} from "../types";

class PerformanceMonitor extends EventEmitter {
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private alerts: Alert[] = [];
  private config: Required<MonitorConfig>;
  private cleanupIntervalId?: NodeJS.Timeout;
  constructor(config: MonitorConfig = {}) {
    super();
    this.config = {
      enableLogging: config.enableLogging ?? true,
      logToFile: config.logToFile ?? false,
      logFilePath: config.logFilePath ?? "./performance-logs.log",
      alertThresholds: {
        responseTime: config.alertThresholds?.responseTime ?? 1000,
        memoryUsage: config.alertThresholds?.memoryUsage ?? 80,
        errorRate: config.alertThresholds?.errorRate ?? 5,
      },
      cleanupInterval: config.cleanupInterval ?? 3600000,
      maxMetricsAge: config.maxMetricsAge ?? 86400000,
    };
    this.setupCleanup();
  }
  public trackOperation(
    operation: string,
    duration: number,
    metadata: Record<string, any> = {},
  ) {
    const metric: PerformanceMetric = {
      operation,
      duration,
      timestamp: new Date().toISOString(),
      metadata,
    };
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }
    this.metrics.get(operation)?.push(metric);
    if (this.config.enableLogging) {
      console.log(
        `📊 Operation: ${operation}, Duration: ${duration}ms`,
        metadata,
      );
    }
    if (this.config.logToFile) {
      this.saveMetricsToFile(metric);
    }
    this.checkAlerts(metric);
    this.emit("metric", metric);
    return metric;
  }
  public memoryUsage(): MemoryUsage {
    const usage = process.memoryUsage();
    const formattedUsage: MemoryUsage = {
      rss: this.formatBytes(usage.rss),
      heapTotal: this.formatBytes(usage.heapTotal),
      heapUsed: this.formatBytes(usage.heapUsed),
      external: this.formatBytes(usage.external),
      arrayBuffers: this.formatBytes(usage.arrayBuffers),
    };
    if (this.config.enableLogging) {
      console.log("💾 Memory Usage:", formattedUsage);
    }
    return formattedUsage;
  }
  private previousCpuUsage = process.cpuUsage();
  public cpuUsage(): CpuUsage {
    const usage = process.cpuUsage(this.previousCpuUsage);
    this.previousCpuUsage = process.cpuUsage();
    const cpuUsage: CpuUsage = {
      user: usage.user,
      system: usage.system,
    };
    if (this.config.enableLogging) {
      console.log("⚡ CPU Usage:", cpuUsage);
    }

    return cpuUsage;
  }
  public getSummary(): PerformanceSummary {
    const allMetrics = Array.from(this.metrics.values()).flat();
    const recentMetrics = allMetrics.slice(-100); // Last 100 operations

    const avgDuration =
      recentMetrics.length > 0
        ? recentMetrics.reduce((sum, m) => sum + m.duration, 0) /
          recentMetrics.length
        : 0;

    return {
      totalOperations: allMetrics.length,
      averageDuration: Math.round(avgDuration * 100) / 100,
      recentOperations: recentMetrics.slice(-10),
    };
  }

  public getStats(operation: string): Stats | null {
    const metrics = this.metrics.get(operation);
    if (!metrics || metrics.length === 0) return null;

    const durations = metrics.map((m) => m.duration);
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    const min = Math.min(...durations);
    const max = Math.max(...durations);

    return {
      operation,
      count: metrics.length,
      avgDuration: Math.round(avg * 100) / 100,
      minDuration: min,
      maxDuration: max,
      last10: durations.slice(-10),
    };
  }

  public getAllStats(): Stats[] {
    return Array.from(this.metrics.keys())
      .map((op) => this.getStats(op))
      .filter((stat): stat is Stats => stat !== null);
  }

  public clearMetrics(): void {
    this.metrics.clear();
    if (this.config.enableLogging) {
      console.log("🧹 Metrics cleared");
    }
  }

  public addAlert(alert: Omit<Alert, "timestamp">): Alert {
    const fullAlert: Alert = {
      ...alert,
      timestamp: new Date().toISOString(),
    };

    this.alerts.push(fullAlert);
    this.emit("alert", fullAlert);

    if (this.config.enableLogging) {
      console.warn(`⚠️ Alert: ${alert.type}`, alert);
    }

    return fullAlert;
  }

  public getAlerts(limit: number = 50): Alert[] {
    return this.alerts.slice(-limit);
  }

  public cleanup(): void {
    const cutoffTime = Date.now() - this.config.maxMetricsAge;

    for (const [operation, metrics] of this.metrics.entries()) {
      const filtered = metrics.filter(
        (m) => new Date(m.timestamp).getTime() > cutoffTime,
      );

      if (filtered.length === 0) {
        this.metrics.delete(operation);
      } else {
        this.metrics.set(operation, filtered);
      }
    }
  }

  public destroy(): void {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
    }
    this.removeAllListeners();
  }

  private formatBytes(bytes: number): string {
    const sizes = ["Bytes", "KB", "MB", "GB"];
    if (bytes === 0) return "0 Bytes";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
  }

  private saveMetricsToFile(metric: PerformanceMetric): void {
    try {
      const dir = path.dirname(this.config.logFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const logEntry = JSON.stringify(metric) + "\n";
      fs.appendFileSync(this.config.logFilePath, logEntry);
    } catch (error) {
      console.error("Failed to save metrics to file:", error);
    }
  }

  private checkAlerts(metric: PerformanceMetric): void {
    if (metric.duration > this?.config?.alertThresholds?.responseTime!) {
      const alert: Alert = {
        type: "SLOW_OPERATION",
        operation: metric.operation,
        duration: metric.duration,
        threshold: this.config.alertThresholds.responseTime,
        timestamp: new Date().toISOString(),
        metadata: metric.metadata,
      };

      this.alerts.push(alert);
      this.emit("alert", alert);

      if (this.config.enableLogging) {
        console.warn(
          `⚠️ Alert: ${metric.operation} took ${metric.duration}ms (threshold: ${this.config.alertThresholds.responseTime}ms)`,
        );
      }
    }

    if (Math.random() < 0.1) {
      const memoryUsage = process.memoryUsage();
      const memoryPercent =
        (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

      if (memoryPercent > this?.config?.alertThresholds?.memoryUsage!) {
        const alert: Alert = {
          type: "HIGH_MEMORY",
          usage: memoryPercent,
          threshold: this.config.alertThresholds.memoryUsage,
          timestamp: new Date().toISOString(),
        };

        this.alerts.push(alert);
        this.emit("alert", alert);

        if (this.config.enableLogging) {
          console.warn(
            `⚠️ Alert: High memory usage ${memoryPercent.toFixed(2)}%`,
          );
        }
      }
    }
  }

  private setupCleanup(): void {
    this.cleanupIntervalId = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }
}
export default PerformanceMonitor;
