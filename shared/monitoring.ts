// Système de monitoring simple et efficace
import { performance } from 'perf_hooks';

export interface MetricData {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  tags?: Record<string, string>;
}

export interface HealthMetrics {
  uptime: number;
  memory: NodeJS.MemoryUsage;
  cpu: number;
  requests: {
    total: number;
    success: number;
    errors: number;
    avgResponseTime: number;
  };
  database: {
    connections: number;
    avgQueryTime: number;
  };
}

class MonitoringService {
  private metrics: Map<string, MetricData[]> = new Map();
  private requestCount = { total: 0, success: 0, errors: 0 };
  private responseTimes: number[] = [];
  private startTime = Date.now();

  // Collecter une métrique
  collect(name: string, value: number, unit = 'count', tags?: Record<string, string>) {
    const metric: MetricData = {
      name,
      value,
      unit,
      timestamp: Date.now(),
      tags
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    this.metrics.get(name)!.push(metric);
    
    // Garder seulement les 1000 dernières métriques
    if (this.metrics.get(name)!.length > 1000) {
      this.metrics.get(name)!.shift();
    }
  }

  // Mesurer le temps d'exécution d'une fonction
  async measure<T>(name: string, fn: () => Promise<T>, tags?: Record<string, string>): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      this.collect(`${name}.duration`, duration, 'ms', { ...tags, status: 'success' });
      this.requestCount.success++;
      this.responseTimes.push(duration);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.collect(`${name}.duration`, duration, 'ms', { ...tags, status: 'error' });
      this.requestCount.errors++;
      this.collect(`${name}.error`, 1, 'count', { ...tags, error: error.message });
      throw error;
    } finally {
      this.requestCount.total++;
    }
  }

  // Middleware Fastify pour monitoring automatique
  createFastifyMiddleware() {
    return async (request: any, reply: any) => {
      const start = performance.now();
      
      reply.addHook('onSend', async () => {
        const duration = performance.now() - start;
        const route = request.routerPath || request.url;
        const method = request.method;
        const status = reply.statusCode;
        
        this.collect('http.request', 1, 'count', {
          method,
          route,
          status: status.toString()
        });
        
        this.collect('http.response_time', duration, 'ms', {
          method,
          route
        });

        if (status >= 400) {
          this.requestCount.errors++;
        } else {
          this.requestCount.success++;
        }
        this.requestCount.total++;
        this.responseTimes.push(duration);
      });
    };
  }

  // Obtenir les métriques de santé
  getHealthMetrics(): HealthMetrics {
    const uptime = Date.now() - this.startTime;
    const memory = process.memoryUsage();
    
    // Calcul CPU approximatif
    const cpu = process.cpuUsage();
    const cpuPercent = (cpu.user + cpu.system) / 1000000 / (uptime / 1000) * 100;

    // Temps de réponse moyen
    const avgResponseTime = this.responseTimes.length > 0 
      ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length 
      : 0;

    return {
      uptime,
      memory,
      cpu: cpuPercent,
      requests: {
        ...this.requestCount,
        avgResponseTime
      },
      database: {
        connections: 1, // À adapter selon votre DB
        avgQueryTime: 0 // À implémenter
      }
    };
  }

  // Obtenir des métriques spécifiques
  getMetrics(name: string, since?: number): MetricData[] {
    const metrics = this.metrics.get(name) || [];
    if (since) {
      return metrics.filter(m => m.timestamp >= since);
    }
    return metrics;
  }

  // Export Prometheus format (optionnel)
  exportPrometheus(): string {
    let output = '';
    
    for (const [name, metrics] of this.metrics.entries()) {
      if (metrics.length > 0) {
        const latest = metrics[metrics.length - 1];
        output += `# TYPE ${name.replace(/\./g, '_')} gauge\n`;
        output += `${name.replace(/\./g, '_')} ${latest.value}\n`;
      }
    }
    
    return output;
  }

  // Logs structurés
  log(level: 'info' | 'warn' | 'error', message: string, data?: any) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(data && { data })
    };
    
    console.log(JSON.stringify(logEntry));
    
    // Collecter comme métrique
    this.collect(`log.${level}`, 1, 'count');
  }
}

// Instance singleton
export const monitoring = new MonitoringService();

// Helper pour mesurer facilement
export const measure = monitoring.measure.bind(monitoring);
export const collect = monitoring.collect.bind(monitoring);
export const log = monitoring.log.bind(monitoring);
