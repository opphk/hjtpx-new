const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const messageQueue = require('./messageQueue');

class GrpcService {
  constructor(options = {}) {
    this.port = options.port || 50051;
    this.server = new grpc.Server();
    this.services = new Map();
    this.protoPath = options.protoPath || path.join(__dirname, 'protos');
    this.packageDefinition = {};
  }

  loadProto(protoName) {
    try {
      const packageDefinition = protoLoader.loadSync(
        path.join(this.protoPath, protoName),
        {
          keepCase: true,
          longs: String,
          enums: String,
          defaults: true,
          oneofs: true
        }
      );
      this.packageDefinition[protoName] = packageDefinition;
      return packageDefinition;
    } catch (error) {
      console.error(`Failed to load proto ${protoName}:`, error.message);
      throw error;
    }
  }

  registerService(serviceName, implementation) {
    this.services.set(serviceName, implementation);
  }

  addProtoService(protoName, packageName, serviceDefinition) {
    const packageDef = this.packageDefinition[protoName];
    if (!packageDef) {
      throw new Error(`Proto ${protoName} not loaded`);
    }

    const protoDescriptor = grpc.loadPackageDefinition(packageDef);
    const serviceProto = protoDescriptor[packageName];

    if (!serviceProto || !serviceProto[serviceDefinition]) {
      throw new Error(`Service ${serviceDefinition} not found in ${packageName}`);
    }

    const implementation = this.services.get(serviceDefinition);
    if (!implementation) {
      throw new Error(`Implementation for ${serviceDefinition} not found`);
    }

    this.server.addService(serviceProto[serviceDefinition], implementation);
    console.log(`gRPC service registered: ${serviceDefinition}`);
  }

  start() {
    return new Promise((resolve, reject) => {
      this.server.bindAsync(
        `0.0.0.0:${this.port}`,
        grpc.ServerCredentials.createInsecure(),
        (error, port) => {
          if (error) {
            reject(error);
            return;
          }

          console.log(`gRPC server running on port ${port}`);
          resolve(port);
        }
      );
    });
  }

  async stop() {
    return new Promise((resolve) => {
      this.server.tryShutdown(() => {
        console.log('gRPC server stopped');
        resolve();
      });
    });
  }
}

class GrpcClient {
  constructor(options = {}) {
    this.host = options.host || 'localhost';
    this.port = options.port || 50051;
    this.clients = new Map();
    this.channel = null;
  }

  connect() {
    const address = `${this.host}:${this.port}`;
    this.channel = grpc.newChannel(address, grpc.credentials.createInsecure());
  }

  createClient(serviceDefinition, packageDef) {
    const Client = grpc.makeClientConstructor(packageDef[serviceDefinition]);
    const client = new Client(this.channel);

    this.clients.set(serviceDefinition, client);
    return client;
  }

  getClient(serviceName) {
    return this.clients.get(serviceName);
  }

  async unaryCall(serviceName, methodName, request) {
    const client = this.clients.get(serviceName);
    if (!client) {
      throw new Error(`Client ${serviceName} not found`);
    }

    return new Promise((resolve, reject) => {
      client[methodName](request, (error, response) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(response);
      });
    });
  }

  async serverStreamingCall(serviceName, methodName, request, onMessage) {
    const client = this.clients.get(serviceName);
    if (!client) {
      throw new Error(`Client ${serviceName} not found`);
    }

    const stream = client[methodName](request);
    stream.on('data', onMessage);
    stream.on('end', () => {});
    stream.on('error', (err) => {
      console.error(`Stream error: ${err.message}`);
    });

    return stream;
  }

  async clientStreamingCall(serviceName, methodName, requests) {
    const client = this.clients.get(serviceName);
    if (!client) {
      throw new Error(`Client ${serviceName} not found`);
    }

    return new Promise((resolve, reject) => {
      const stream = client[methodName]((error, response) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(response);
      });

      for (const request of requests) {
        stream.write(request);
      }
      stream.end();
    });
  }

  async bidirectionalStreamingCall(serviceName, methodName, requests, onMessage) {
    const client = this.clients.get(serviceName);
    if (!client) {
      throw new Error(`Client ${serviceName} not found`);
    }

    const stream = client[methodName]((error, response) => {
      if (error) {
        console.error(`Bidirectional stream error: ${error.message}`);
        return;
      }
      onMessage(response);
    });

    for (const request of requests) {
      stream.write(request);
    }
    stream.end();

    return stream;
  }

  close() {
    if (this.channel) {
      this.channel.close();
    }
  }
}

class EventBus {
  constructor() {
    this.handlers = new Map();
    this.eventQueue = messageQueue;
    this.eventQueue.createQueue('events', { durable: true });
  }

  on(eventType, handler) {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType).push(handler);
  }

  off(eventType, handler) {
    if (!this.handlers.has(eventType)) return;

    const handlers = this.handlers.get(eventType);
    const index = handlers.indexOf(handler);
    if (index !== -1) {
      handlers.splice(index, 1);
    }
  }

  emit(eventType, payload) {
    const event = {
      type: eventType,
      payload,
      timestamp: new Date().toISOString()
    };

    this.eventQueue.publish('events', event);

    const handlers = this.handlers.get(eventType) || [];
    for (const handler of handlers) {
      try {
        handler(event);
      } catch (error) {
        console.error(`Event handler error for ${eventType}:`, error);
      }
    }

    return event;
  }

  subscribe(eventType, handler) {
    this.eventQueue.subscribe('events', async (message) => {
      if (message.payload.type === eventType) {
        handler(message.payload);
      }
    });
  }
}

class ServiceCommunicator {
  constructor(options = {}) {
    this.grpcPort = options.grpcPort || 50051;
    this.eventBus = new EventBus();
    this.grpcServer = new GrpcService({ port: this.grpcPort });
    this.grpcClients = new Map();
    this.serviceRegistry = new Map();
  }

  registerService(serviceName, serviceInfo) {
    this.serviceRegistry.set(serviceName, {
      ...serviceInfo,
      registeredAt: new Date().toISOString()
    });
  }

  getService(serviceName) {
    return this.serviceRegistry.get(serviceName);
  }

  async createGrpcClient(serviceName, protoName, packageName, serviceDefinition) {
    const serviceInfo = this.serviceRegistry.get(serviceName);
    if (!serviceInfo) {
      throw new Error(`Service ${serviceName} not registered`);
    }

    const client = new GrpcClient({
      host: serviceInfo.host,
      port: serviceInfo.grpcPort || 50051
    });

    client.loadProto = (name) => this.grpcServer.loadProto(name);
    client.connect();

    const proto = client.loadProto(protoName);
    const grpcClient = client.createClient(serviceDefinition, proto);

    this.grpcClients.set(serviceName, grpcClient);
    return grpcClient;
  }

  async publishEvent(eventType, payload) {
    return this.eventBus.emit(eventType, payload);
  }

  subscribeToEvent(eventType, handler) {
    this.eventBus.subscribe(eventType, handler);
  }

  async startGrpcServer() {
    await this.grpcServer.start();
  }

  async stop() {
    await this.grpcServer.stop();

    for (const client of this.grpcClients.values()) {
      client.close();
    }

    console.log('Service communicator stopped');
  }
}

const communicator = new ServiceCommunicator();

module.exports = communicator;
module.exports.GrpcService = GrpcService;
module.exports.GrpcClient = GrpcClient;
module.exports.EventBus = EventBus;
module.exports.ServiceCommunicator = ServiceCommunicator;
