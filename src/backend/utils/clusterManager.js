const cluster = require('cluster');
const os = require('os');

class ClusterManager {
  constructor() {
    this.workers = [];
    this.numCPUs = process.env.WORKERS 
      ? parseInt(process.env.WORKERS) 
      : Math.max(os.cpus().length - 1, 1);
  }

  async setupCluster(workerCallback) {
    if (cluster.isMaster || cluster.isPrimary) {
      console.log(`Master ${process.pid} is running`);
      console.log(`Starting ${this.numCPUs} workers...`);

      for (let i = 0; i < this.numCPUs; i++) {
        this.spawnWorker(workerCallback);
      }

      cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died (code: ${code}, signal: ${signal})`);
        console.log('Starting a new worker...');
        this.spawnWorker(workerCallback);
      });

      cluster.on('online', (worker) => {
        console.log(`Worker ${worker.process.pid} is online`);
      });

      this.setupMasterSignals();
    } else {
      await workerCallback();
    }
  }

  spawnWorker(workerCallback) {
    const worker = cluster.fork();
    this.workers.push(worker);
    return worker;
  }

  setupMasterSignals() {
    process.on('SIGUSR2', () => {
      console.log('Received SIGUSR2, reloading workers...');
      this.reloadWorkers();
    });

    process.on('SIGTERM', () => {
      console.log('Received SIGTERM, shutting down gracefully...');
      this.shutdown();
    });
  }

  async reloadWorkers() {
    console.log('Starting zero-downtime reload...');
    
    const oldWorkers = [...this.workers];
    
    for (const worker of oldWorkers) {
      const newWorker = cluster.fork();
      this.workers.push(newWorker);
      
      newWorker.on('listening', () => {
        console.log(`New worker ${newWorker.process.pid} is ready`);
        worker.send('shutdown');
      });
    }

    setTimeout(() => {
      for (const worker of oldWorkers) {
        if (!worker.isDead()) {
          worker.kill('SIGTERM');
        }
      }
      this.workers = this.workers.filter(w => !oldWorkers.includes(w) && !w.isDead());
      console.log('Reload complete');
    }, 5000);
  }

  async shutdown() {
    console.log('Shutting down workers...');
    
    const shutdownPromises = this.workers.map(worker => {
      return new Promise((resolve) => {
        worker.on('exit', () => resolve());
        if (!worker.isDead()) {
          worker.send('shutdown');
          setTimeout(() => {
            if (!worker.isDead()) {
              worker.kill('SIGTERM');
            }
            resolve();
          }, 5000);
        }
      });
    });

    await Promise.all(shutdownPromises);
    console.log('All workers shut down');
    process.exit(0);
  }

  getWorkerStats() {
    if (cluster.isMaster || cluster.isPrimary) {
      return {
        type: 'master',
        pid: process.pid,
        workers: this.workers.map(w => ({
          id: w.id,
          pid: w.process.pid,
          state: w.state
        }))
      };
    } else {
      return {
        type: 'worker',
        pid: process.pid,
        id: cluster.worker?.id
      };
    }
  }
}

const clusterManager = new ClusterManager();

module.exports = clusterManager;
