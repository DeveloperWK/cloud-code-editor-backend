import { WorkerOptions } from "worker_threads";
interface projects {
  project_id: string;
  user_id: string;
  team_id: string;
  name: string;
  description: string;
  language_template: languageTemplate;
  status:
    | "running"
    | "stopped"
    | "removed"
    | "saving"
    | "loading"
    | "active"
    | "inactive";
  container_id: string;
  last_active_at: string;
  created_at: Date;
  updated_at: Date;
  initialized_with_template: boolean;
}
interface projectsRow {
  project_id?: string;
  user_id: string;
  team_id: string;
  name: string;
  description: string;
  language_template_id: string;
  created_at: Date;
}
interface refreshToken {
  user_id?: string;
  token: string;
  expires_at: Date;
}

interface languageTemplate {
  id: string;
  name: string;
  docker_image: string;
  default_files_path: string | null; // Path in Supabase Storage for template files
  description: string | null;
  created_at: string;
  icon: string | null;
}
interface runWorkerOptions {
  timeout?: number;
  workerOptions?: WorkerOptions;
}
declare global {
  namespace Express {
    interface Request {
      project: projects;
      user?: {
        id: string;
        email: string;
        name: string;
      };
      access_token?: string;
    }
  }
}
interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: string;
  metadata: Record<string, any>;
}
interface MemoryUsage {
  rss: string;
  heapTotal: string;
  heapUsed: string;
  external: string;
  arrayBuffers: string;
}
interface CpuUsage {
  user: number;
  system: number;
}
interface PerformanceSummary {
  totalOperations: number;
  averageDuration: number;
  recentOperations: PerformanceMetric[];
}
interface Alert {
  type: "SLOW_OPERATION" | "HIGH_MEMORY" | "HIGH_ERROR_RATE" | "CUSTOM";
  operation?: string;
  duration?: number;
  threshold?: number;
  usage?: number;
  message?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}
interface MonitorConfig {
  enableLogging?: boolean;
  logToFile?: boolean;
  logFilePath?: string;
  alertThresholds?: {
    responseTime?: number;
    memoryUsage?: number;
    errorRate?: number;
  };
  cleanupInterval?: number;
  maxMetricsAge?: number;
}

interface Stats {
  operation: string;
  count: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  last10: number[];
}

export {
  projects,
  projectsRow,
  refreshToken,
  languageTemplate,
  runWorkerOptions,
  PerformanceMetric,
  MemoryUsage,
  CpuUsage,
  PerformanceSummary,
  Alert,
  MonitorConfig,
  Stats,
};
