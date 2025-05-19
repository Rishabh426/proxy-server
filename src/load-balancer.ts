import { Worker } from 'node:cluster';

export type LoadBalancingAlgorithm = 'random' | 'round-robin' | 'least-connections' | 'ip-hash';

export interface LoadBalancerConfig {
  algorithm: LoadBalancingAlgorithm;
  workers: Worker[];
}

interface WorkerStats {
  worker: Worker;
  activeConnections: number;
  lastUsed?: number;
}

export class LoadBalancer {
  private algorithm: LoadBalancingAlgorithm;
  private workers: Worker[];
  private workerStats: Map<number, WorkerStats>;
  private currentIndex = 0;

  constructor(config: LoadBalancerConfig) {
    this.algorithm = config.algorithm;
    this.workers = config.workers;
    this.workerStats = new Map();
    
    this.workers.forEach(worker => {
      this.workerStats.set(worker.id, {
        worker,
        activeConnections: 0
      });
    });

    this.workers.forEach(worker => {
      worker.on('message', (message) => {
        try {
          const parsed = JSON.parse(message);
          if (parsed.connectionClosed === true) {
            const stats = this.workerStats.get(worker.id);
            if (stats && stats.activeConnections > 0) {
              stats.activeConnections--;
            }
          }
        } catch (err) {

        }
      });
    });
  }

  getNextWorker(clientIp?: string): Worker {
    if (this.workers.length === 0) {
      throw new Error('No workers available');
    }

    const stats = this.workerStats.get(this.workers[0].id);
    if (!stats) {
      throw new Error('Worker stats not initialized');
    }
    
    let selectedWorker: Worker;

    switch (this.algorithm) {
      case 'random':
        selectedWorker = this.getRandomWorker();
        break;
      case 'round-robin':
        selectedWorker = this.getRoundRobinWorker();
        break;
      case 'least-connections':
        selectedWorker = this.getLeastConnectionsWorker();
        break;
      case 'ip-hash':
        selectedWorker = this.getIpHashWorker(clientIp || '');
        break;
      default:
        selectedWorker = this.getRandomWorker();
    }

    const selectedStats = this.workerStats.get(selectedWorker.id);
    if (selectedStats) {
      selectedStats.activeConnections++;
      selectedStats.lastUsed = Date.now();
    }

    return selectedWorker;
  }

  private getRandomWorker(): Worker {
    const index = Math.floor(Math.random() * this.workers.length);
    return this.workers[index];
  }

  private getRoundRobinWorker(): Worker {
    const worker = this.workers[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.workers.length;
    return worker;
  }

  private getLeastConnectionsWorker(): Worker {
    let minConnections = Infinity;
    let selectedWorker = this.workers[0];

    for (const stats of this.workerStats.values()) {
      if (stats.activeConnections < minConnections) {
        minConnections = stats.activeConnections;
        selectedWorker = stats.worker;
      }
    }

    return selectedWorker;
  }

  private getIpHashWorker(clientIp: string): Worker {
    const hash = clientIp.split('.').reduce((sum, octet) => sum + parseInt(octet, 10), 0);
    const index = hash % this.workers.length;
    return this.workers[index];
  }
}