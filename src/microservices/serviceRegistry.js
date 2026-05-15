const EventEmitter = require('events');

class ServiceRegistry extends EventEmitter {
  constructor(options = {}) {
    super();
    this.services = new Map();
    this.heartbeatInterval = options.heartbeatInterval || 5000;
    this.serviceTimeout = options.serviceTimeout || 15000;
    this.cleanupInterval = null;
    this.heartbeats = new Map();
  }

  register(serviceInfo) {
    const { name, version, host, port, healthCheck, metadata = {} } = serviceInfo;

    if (!name || !host || !port) {
      throw new Error('Service name, host, and port are required');
    }

    const serviceId = `${name}:${version || '1.0.0'}:${host}:${port}`;

    const service = {
      id: serviceId,
      name,
      version: version || '1.0.0',
      host,
      port,
      httpPort: serviceInfo.httpPort || port,
      grpcPort: serviceInfo.grpcPort,
      healthCheck: healthCheck || `/health`,
      metadata,
      status: 'healthy',
      registeredAt: new Date().toISOString(),
      lastHeartbeat: Date.now(),
      instances: 1
    };

    this.services.set(serviceId, service);
    this.startHeartbeat(serviceId);

    this.emit('service:registered', service);
    console.log(`Service registered: ${name}@${service.version} at ${host}:${port}`);

    return serviceId;
  }

  unregister(serviceId) {
    const service = this.services.get(serviceId);
    if (!service) {
      return false;
    }

    this.stopHeartbeat(serviceId);
    this.services.delete(serviceId);

    this.emit('service:unregistered', service);
    console.log(`Service unregistered: ${service.name}`);

    return true;
  }

  startHeartbeat(serviceId) {
    const interval = setInterval(() => {
      const service = this.services.get(serviceId);
      if (!service) {
        clearInterval(interval);
        this.heartbeats.delete(serviceId);
        return;
      }

      service.lastHeartbeat = Date.now();
      this.emit('service:heartbeat', service);
    }, this.heartbeatInterval);

    this.heartbeats.set(serviceId, interval);
  }

  stopHeartbeat(serviceId) {
    const interval = this.heartbeats.get(serviceId);
    if (interval) {
      clearInterval(interval);
      this.heartbeats.delete(serviceId);
    }
  }

  getService(serviceId) {
    return this.services.get(serviceId);
  }

  getServicesByName(name) {
    const result = [];
    for (const service of this.services.values()) {
      if (service.name === name) {
        result.push(service);
      }
    }
    return result;
  }

  findHealthyService(name) {
    const services = this.getServicesByName(name);
    const healthy = services.filter(s => s.status === 'healthy');

    if (healthy.length === 0) {
      return null;
    }

    return healthy[Math.floor(Math.random() * healthy.length)];
  }

  updateStatus(serviceId, status) {
    const service = this.services.get(serviceId);
    if (service) {
      const previousStatus = service.status;
      service.status = status;

      this.emit('service:statusChanged', {
        service,
        previousStatus,
        currentStatus: status
      });

      if (status === 'unhealthy') {
        this.emit('service:unhealthy', service);
      }
    }
  }

  updateHeartbeat(serviceId) {
    const service = this.services.get(serviceId);
    if (service) {
      service.lastHeartbeat = Date.now();

      if (service.status === 'unhealthy') {
        service.status = 'healthy';
        this.emit('service:statusChanged', {
          service,
          previousStatus: 'unhealthy',
          currentStatus: 'healthy'
        });
      }
    }
  }

  getAllServices() {
    return Array.from(this.services.values());
  }

  getHealthyServices() {
    return Array.from(this.services.values()).filter(s => s.status === 'healthy');
  }

  getServiceStats() {
    const services = Array.from(this.services.values());
    const byName = {};
    const byStatus = { healthy: 0, unhealthy: 0 };

    for (const service of services) {
      if (!byName[service.name]) {
        byName[service.name] = { instances: 0, healthy: 0 };
      }
      byName[service.name].instances++;
      byStatus[service.status]++;

      if (service.status === 'healthy') {
        byName[service.name].healthy++;
      }
    }

    return {
      totalServices: services.length,
      totalInstances: services.reduce((sum, s) => sum + s.instances, 0),
      byName,
      byStatus
    };
  }

  startCleanup() {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();

      for (const [serviceId, service] of this.services.entries()) {
        if (now - service.lastHeartbeat > this.serviceTimeout) {
          console.warn(`Service ${service.name} timed out`);
          this.updateStatus(serviceId, 'unhealthy');

          if (now - service.lastHeartbeat > this.serviceTimeout * 3) {
            this.unregister(serviceId);
            this.emit('service:timeout', service);
          }
        }
      }
    }, this.serviceTimeout);
  }

  stopCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  clear() {
    this.stopCleanup();

    for (const interval of this.heartbeats.values()) {
      clearInterval(interval);
    }
    this.heartbeats.clear();
    this.services.clear();

    console.log('Service registry cleared');
  }
}

const registry = new ServiceRegistry();
registry.startCleanup();

module.exports = registry;
module.exports.ServiceRegistry = ServiceRegistry;
