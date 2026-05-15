const { logError, logWarn, logInfo } = require('../../utils/productionLogger');

class ServerManagementService {
  constructor() {
    this.servers = new Map();
    this.serverGroups = new Map();
    this.commandHistory = [];
    this.maxHistorySize = 100;
    this.initialized = false;
  }

  initialize() {
    if (this.initialized) return;
    
    this.registerDefaultServers();
    this.initialized = true;
    logInfo('Server management service initialized');
  }

  registerDefaultServers() {
    const defaultServers = [
      {
        id: 'srv-001',
        name: 'Production Web Server 1',
        ip: '192.168.1.101',
        status: 'online',
        type: 'web',
        environment: 'production',
        cpu: 45,
        memory: 62,
        disk: 58,
        uptime: '45d 12h 30m',
        lastCheck: new Date().toISOString(),
        tags: ['web', 'frontend']
      },
      {
        id: 'srv-002',
        name: 'Production Web Server 2',
        ip: '192.168.1.102',
        status: 'online',
        type: 'web',
        environment: 'production',
        cpu: 38,
        memory: 55,
        disk: 52,
        uptime: '45d 12h 30m',
        lastCheck: new Date().toISOString(),
        tags: ['web', 'frontend']
      },
      {
        id: 'srv-003',
        name: 'Production Database Server',
        ip: '192.168.1.201',
        status: 'online',
        type: 'database',
        environment: 'production',
        cpu: 72,
        memory: 78,
        disk: 65,
        uptime: '120d 8h 15m',
        lastCheck: new Date().toISOString(),
        tags: ['database', 'mysql']
      },
      {
        id: 'srv-004',
        name: 'Staging Server',
        ip: '192.168.2.101',
        status: 'online',
        type: 'web',
        environment: 'staging',
        cpu: 25,
        memory: 40,
        disk: 35,
        uptime: '30d 4h 20m',
        lastCheck: new Date().toISOString(),
        tags: ['web', 'staging']
      },
      {
        id: 'srv-005',
        name: 'Development Server',
        ip: '192.168.3.101',
        status: 'maintenance',
        type: 'web',
        environment: 'development',
        cpu: 15,
        memory: 30,
        disk: 45,
        uptime: '15d 2h 10m',
        lastCheck: new Date().toISOString(),
        tags: ['web', 'dev']
      }
    ];

    defaultServers.forEach(server => this.registerServer(server));
  }

  registerServer(serverData) {
    const server = {
      id: serverData.id || `srv-${Date.now()}`,
      name: serverData.name,
      ip: serverData.ip,
      port: serverData.port || 22,
      status: serverData.status || 'offline',
      type: serverData.type || 'generic',
      environment: serverData.environment || 'development',
      cpu: serverData.cpu || 0,
      memory: serverData.memory || 0,
      disk: serverData.disk || 0,
      uptime: serverData.uptime || '0h',
      lastCheck: serverData.lastCheck || new Date().toISOString(),
      tags: serverData.tags || [],
      sshKey: serverData.sshKey || null,
      username: serverData.username || 'root',
      metadata: serverData.metadata || {},
      createdAt: new Date().toISOString()
    };

    this.servers.set(server.id, server);
    logInfo('Server registered', { serverId: server.id, name: server.name });

    return server;
  }

  updateServer(serverId, updates) {
    const server = this.servers.get(serverId);
    if (!server) return null;

    Object.assign(server, updates, { lastCheck: new Date().toISOString() });
    this.servers.set(serverId, server);

    logInfo('Server updated', { serverId });

    return server;
  }

  removeServer(serverId) {
    const server = this.servers.get(serverId);
    if (!server) return false;

    this.servers.delete(serverId);
    logInfo('Server removed', { serverId });

    return true;
  }

  getServer(serverId) {
    return this.servers.get(serverId);
  }

  getServers(filters = {}) {
    let servers = Array.from(this.servers.values());

    if (filters.status && filters.status !== 'all') {
      servers = servers.filter(s => s.status === filters.status);
    }

    if (filters.environment && filters.environment !== 'all') {
      servers = servers.filter(s => s.environment === filters.environment);
    }

    if (filters.type && filters.type !== 'all') {
      servers = servers.filter(s => s.type === filters.type);
    }

    if (filters.tags && filters.tags.length > 0) {
      servers = servers.filter(s => 
        filters.tags.some(tag => s.tags.includes(tag))
      );
    }

    return servers;
  }

  getServerStats() {
    const servers = Array.from(this.servers.values());

    return {
      total: servers.length,
      online: servers.filter(s => s.status === 'online').length,
      offline: servers.filter(s => s.status === 'offline').length,
      warning: servers.filter(s => s.status === 'warning').length,
      maintenance: servers.filter(s => s.status === 'maintenance').length,
      avgCpu: this.calculateAverage(servers.map(s => s.cpu)),
      avgMemory: this.calculateAverage(servers.map(s => s.memory)),
      avgDisk: this.calculateAverage(servers.map(s => s.disk)),
      byEnvironment: this.groupBy(servers, 'environment'),
      byType: this.groupBy(servers, 'type')
    };
  }

  calculateAverage(values) {
    const validValues = values.filter(v => typeof v === 'number');
    if (validValues.length === 0) return 0;
    return Math.round(validValues.reduce((a, b) => a + b, 0) / validValues.length);
  }

  groupBy(array, key) {
    return array.reduce((result, item) => {
      const group = item[key];
      result[group] = (result[group] || 0) + 1;
      return result;
    }, {});
  }

  async executeCommand(serverId, command) {
    const server = this.servers.get(serverId);
    if (!server) {
      throw new Error('Server not found');
    }

    if (server.status !== 'online') {
      throw new Error('Server is not online');
    }

    logInfo('Executing command on server', { serverId, command });

    const result = {
      id: `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      serverId,
      serverName: server.name,
      command,
      status: 'running',
      output: '',
      error: null,
      startedAt: new Date().toISOString(),
      completedAt: null,
      duration: null
    };

    this.commandHistory.unshift(result);
    if (this.commandHistory.length > this.maxHistorySize) {
      this.commandHistory.pop();
    }

    try {
      const output = await this.simulateCommandExecution(command);
      
      result.status = 'success';
      result.output = output;
      result.completedAt = new Date().toISOString();
      result.duration = new Date(result.completedAt) - new Date(result.startedAt);

      logInfo('Command executed successfully', { commandId: result.id, serverId });
    } catch (error) {
      result.status = 'failed';
      result.error = error.message;
      result.completedAt = new Date().toISOString();
      result.duration = new Date(result.completedAt) - new Date(result.startedAt);

      logError(error, null, { context: `Command execution on ${serverId}` });
    }

    const index = this.commandHistory.findIndex(r => r.id === result.id);
    if (index !== -1) {
      this.commandHistory[index] = result;
    }

    return result;
  }

  async simulateCommandExecution(command) {
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

    const commandLower = command.toLowerCase();

    if (commandLower.includes('uptime')) {
      return ` ${new Date().toISOString()}\n load average: 0.52, 0.58, 0.59`;
    }

    if (commandLower.includes('df -h')) {
      return `Filesystem      Size  Used Avail Use% Mounted on\n/dev/sda1       100G   45G   55G  45% /`;
    }

    if (commandLower.includes('free -m')) {
      return `              total        used        free\nMem:          16384        8192        8192\nSwap:          4096         512        3584`;
    }

    if (commandLower.includes('ps aux')) {
      return `USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND\nroot         1  0.0  0.0    2320   1404 ?        Ss   08:00   0:05 /sbin/init`;
    }

    if (commandLower.includes('nginx')) {
      return `nginx: the configuration file /etc/nginx/nginx.conf syntax is ok\nnginx: configuration file /etc/nginx/nginx.conf test is successful`;
    }

    if (commandLower.includes('systemctl')) {
      return 'active (running)';
    }

    return `Command executed successfully at ${new Date().toISOString()}`;
  }

  getCommandHistory(serverId = null, limit = 20) {
    let history = this.commandHistory;

    if (serverId) {
      history = history.filter(cmd => cmd.serverId === serverId);
    }

    return history.slice(0, limit);
  }

  createServerGroup(groupData) {
    const group = {
      id: `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: groupData.name,
      description: groupData.description || '',
      servers: groupData.servers || [],
      tags: groupData.tags || [],
      createdAt: new Date().toISOString()
    };

    this.serverGroups.set(group.id, group);
    logInfo('Server group created', { groupId: group.id, name: group.name });

    return group;
  }

  addServerToGroup(groupId, serverId) {
    const group = this.serverGroups.get(groupId);
    if (!group) return null;

    const server = this.servers.get(serverId);
    if (!server) return null;

    if (!group.servers.includes(serverId)) {
      group.servers.push(serverId);
      this.serverGroups.set(groupId, group);
    }

    return group;
  }

  removeServerFromGroup(groupId, serverId) {
    const group = this.serverGroups.get(groupId);
    if (!group) return null;

    group.servers = group.servers.filter(id => id !== serverId);
    this.serverGroups.set(groupId, group);

    return group;
  }

  getServerGroup(groupId) {
    return this.serverGroups.get(groupId);
  }

  getServerGroups() {
    return Array.from(this.serverGroups.values());
  }

  async executeCommandOnGroup(groupId, command) {
    const group = this.serverGroups.get(groupId);
    if (!group) {
      throw new Error('Server group not found');
    }

    const results = [];
    for (const serverId of group.servers) {
      try {
        const result = await this.executeCommand(serverId, command);
        results.push(result);
      } catch (error) {
        results.push({
          serverId,
          status: 'failed',
          error: error.message
        });
      }
    }

    return {
      groupId,
      groupName: group.name,
      totalServers: group.servers.length,
      results
    };
  }

  async performHealthCheck(serverId) {
    const server = this.servers.get(serverId);
    if (!server) {
      throw new Error('Server not found');
    }

    logInfo('Performing health check', { serverId });

    await new Promise(resolve => setTimeout(resolve, 1000));

    const isOnline = Math.random() > 0.1;

    server.status = isOnline ? 'online' : 'offline';
    server.cpu = Math.round(20 + Math.random() * 60);
    server.memory = Math.round(30 + Math.random() * 50);
    server.disk = Math.round(30 + Math.random() * 40);
    server.lastCheck = new Date().toISOString();

    this.servers.set(serverId, server);

    return {
      serverId,
      status: server.status,
      cpu: server.cpu,
      memory: server.memory,
      disk: server.disk,
      timestamp: server.lastCheck
    };
  }

  async performHealthCheckAll() {
    const servers = Array.from(this.servers.values());
    const results = [];

    for (const server of servers) {
      try {
        const result = await this.performHealthCheck(server.id);
        results.push(result);
      } catch (error) {
        results.push({
          serverId: server.id,
          status: 'error',
          error: error.message
        });
      }
    }

    return results;
  }

  getServerTags() {
    const tags = new Set();
    for (const server of this.servers.values()) {
      server.tags.forEach(tag => tags.add(tag));
    }
    return Array.from(tags);
  }
}

const serverManagementService = new ServerManagementService();
serverManagementService.initialize();

module.exports = {
  ServerManagementService,
  serverManagementService
};
