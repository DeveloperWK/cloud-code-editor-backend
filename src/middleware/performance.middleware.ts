import { NextFunction, Request, Response } from "express";
import PerformanceMonitor from "../monitor/performance-monitor";

class PerformanceMiddleware {
  constructor(private monitor: PerformanceMonitor) {}
  public trackRequest() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      const operation = `${req.method} ${req.path}`;

      const originalSend = res.send;
      res.send = (body: any): any => {
        const duration = Date.now() - startTime;
        this.monitor.trackOperation(operation, duration, {
          statusCode: res.statusCode,
          userAgent: req.get("User-Agent"),
          ip: req.ip,
          contentLength: body ? body.length : 0,
        });
        return originalSend.call(res, body);
      };
      next();
    };
  }
  public performanceHandler() {
    return (req: Request, res: Response): void => {
      const startTime = Date.now();

      const summary = this.monitor.getSummary();
      const stats = this.monitor.getAllStats();

      const duration = Date.now() - startTime;
      this.monitor.trackOperation("GET /performance", duration);

      res.json({
        summary,
        stats,
      });
    };
  }
  public healthHandler() {
    return (req: Request, res: Response): void => {
      const startTime = Date.now();

      const healthData = {
        uptime: process.uptime(),
        memory: this.monitor.memoryUsage(),
        cpu: this.monitor.cpuUsage(),
        timestamp: new Date().toISOString(),
      };

      const duration = Date.now() - startTime;
      this.monitor.trackOperation("GET /health", duration);

      res.json(healthData);
    };
  }
}
export default PerformanceMiddleware;
