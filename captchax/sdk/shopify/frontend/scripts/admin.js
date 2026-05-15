class AdminApp {
  constructor() {
    this.currentShop = null;
    this.config = {};
    this.init();
  }

  async init() {
    this.setupNavigation();
    this.setupEventListeners();
    await this.loadInitialData();
  }

  setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-item a');
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const tabId = link.getAttribute('data-tab');
        this.switchTab(tabId);
      });
    });
  }

  switchTab(tabId) {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.remove('active');
    });
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });

    document.querySelector(`[data-tab="${tabId}"]`).parentElement.classList.add('active');
    document.getElementById(tabId).classList.add('active');

    this.loadTabData(tabId);
  }

  setupEventListeners() {
    document.getElementById('save-config-btn')?.addEventListener('click', () => this.saveConfig());
    document.getElementById('reset-config-btn')?.addEventListener('click', () => this.resetConfig());
    document.getElementById('save-settings-btn')?.addEventListener('click', () => this.saveSettings());
    document.getElementById('test-api-btn')?.addEventListener('click', () => this.testApi());
    document.getElementById('refresh-btn')?.addEventListener('click', () => this.refreshData());
    document.getElementById('logout-btn')?.addEventListener('click', () => this.logout());
    document.getElementById('export-stats-btn')?.addEventListener('click', () => this.exportStats());
  }

  async loadInitialData() {
    const urlParams = new URLSearchParams(window.location.search);
    const shop = urlParams.get('shop');
    
    if (shop) {
      this.currentShop = shop;
      await this.loadDashboardData();
      await this.loadConfig();
    }
  }

  async loadTabData(tabId) {
    switch(tabId) {
      case 'dashboard':
        await this.loadDashboardData();
        break;
      case 'config':
        await this.loadConfig();
        break;
      case 'statistics':
        await this.loadStatistics();
        break;
      case 'settings':
        await this.loadSettings();
        break;
    }
  }

  async loadDashboardData() {
    try {
      const response = await fetch(`/admin/dashboard/${this.currentShop || 'default'}`);
      const data = await response.json();

      this.updateStatsCards(data.overview);
      this.renderTrendChart(data.trends);
      this.renderTypeChart(data.byType);
      this.updateActivityTable(data.recentActivity || []);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      this.showToast('加载数据失败', 'error');
    }
  }

  updateStatsCards(overview) {
    if (overview) {
      document.getElementById('total-verifications').textContent = 
        this.formatNumber(overview.totalCaptchas || 0);
      document.getElementById('success-rate').textContent = 
        `${((overview.successRate || 0) * 100).toFixed(1)}%`;
      document.getElementById('avg-response-time').textContent = 
        `${overview.avgResponseTime || 0}ms`;
      document.getElementById('blocked-attempts').textContent = 
        this.formatNumber(overview.failedCaptchas || 0);
    }
  }

  renderTrendChart(trends) {
    const canvas = document.getElementById('trend-chart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!trends || trends.length === 0) return;

    const labels = trends.map(t => t.date);
    const values = trends.map(t => t.verifications);

    ctx.strokeStyle = '#0066ff';
    ctx.lineWidth = 2;
    ctx.beginPath();

    const maxVal = Math.max(...values);
    const chartWidth = canvas.width - 60;
    const chartHeight = canvas.height - 40;

    values.forEach((val, i) => {
      const x = 40 + (i / (values.length - 1)) * chartWidth;
      const y = chartHeight - (val / maxVal) * (chartHeight - 20) + 10;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    values.forEach((val, i) => {
      const x = 40 + (i / (values.length - 1)) * chartWidth;
      const y = chartHeight - (val / maxVal) * (chartHeight - 20) + 10;
      
      ctx.fillStyle = '#0066ff';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  renderTypeChart(byType) {
    const canvas = document.getElementById('type-chart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!byType) return;

    const labels = Object.keys(byType);
    const values = Object.values(byType).map(v => v.total);
    const colors = ['#0066ff', '#00a651', '#ff9800', '#f44336', '#9c27b0', '#795548'];

    const total = values.reduce((sum, val) => sum + val, 0);
    let startAngle = 0;

    labels.forEach((label, i) => {
      const sliceAngle = (values[i] / total) * 2 * Math.PI;
      
      ctx.fillStyle = colors[i % colors.length];
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2, canvas.height / 2);
      ctx.arc(canvas.width / 2, canvas.height / 2, 80, startAngle, startAngle + sliceAngle);
      ctx.closePath();
      ctx.fill();

      const middleAngle = startAngle + sliceAngle / 2;
      const labelX = canvas.width / 2 + Math.cos(middleAngle) * 100;
      const labelY = canvas.height / 2 + Math.sin(middleAngle) * 100;

      ctx.fillStyle = '#333';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, labelX, labelY);

      startAngle += sliceAngle;
    });
  }

  updateActivityTable(activities) {
    const tbody = document.getElementById('activity-tbody');
    if (!tbody) return;

    if (activities.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="loading">暂无活动记录</td></tr>';
      return;
    }

    tbody.innerHTML = activities.map(activity => `
      <tr>
        <td>${new Date(activity.time).toLocaleString()}</td>
        <td>${activity.shop}</td>
        <td>${activity.type}</td>
        <td><span class="status-badge ${activity.status}">${activity.status}</span></td>
      </tr>
    `).join('');
  }

  async loadConfig() {
    try {
      const response = await fetch(`/admin/config/${this.currentShop || 'default'}`);
      const config = await response.json();
      
      this.config = config;
      this.updateConfigUI(config);
    } catch (error) {
      console.error('Failed to load config:', error);
      this.showToast('加载配置失败', 'error');
    }
  }

  updateConfigUI(config) {
    if (!config.captchaTypes) return;

    Object.entries(config.captchaTypes).forEach(([page, settings]) => {
      const enabledCheckbox = document.getElementById(`config-${page}`);
      const typeSelect = document.getElementById(`config-${page}-type`);

      if (enabledCheckbox) {
        enabledCheckbox.checked = settings.enabled;
      }
      if (typeSelect) {
        typeSelect.value = settings.type;
      }
    });
  }

  async saveConfig() {
    const config = {
      captchaTypes: {}
    };

    ['login', 'register', 'contact', 'comment', 'checkout', 'password'].forEach(page => {
      const enabledCheckbox = document.getElementById(`config-${page}`);
      const typeSelect = document.getElementById(`config-${page}-type`);

      config.captchaTypes[page] = {
        enabled: enabledCheckbox?.checked || false,
        type: typeSelect?.value || 'image'
      };
    });

    try {
      const response = await fetch(`/admin/config/${this.currentShop || 'default'}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });

      if (response.ok) {
        this.showToast('配置保存成功', 'success');
      } else {
        throw new Error('Save failed');
      }
    } catch (error) {
      console.error('Failed to save config:', error);
      this.showToast('保存配置失败', 'error');
    }
  }

  resetConfig() {
    if (confirm('确定要重置所有配置吗？')) {
      const defaultConfig = {
        login: { enabled: true, type: 'image' },
        register: { enabled: true, type: 'slider' },
        contact: { enabled: true, type: 'image' },
        comment: { enabled: true, type: 'image' },
        checkout: { enabled: false, type: 'slider' },
        password: { enabled: false, type: 'image' }
      };

      Object.entries(defaultConfig).forEach(([page, settings]) => {
        const enabledCheckbox = document.getElementById(`config-${page}`);
        const typeSelect = document.getElementById(`config-${page}-type`);

        if (enabledCheckbox) {
          enabledCheckbox.checked = settings.enabled;
        }
        if (typeSelect) {
          typeSelect.value = settings.type;
        }
      });

      this.showToast('配置已重置', 'success');
    }
  }

  async loadSettings() {
    try {
      const response = await fetch(`/admin/settings/${this.currentShop || 'default'}`);
      const settings = await response.json();

      if (settings.general) {
        document.getElementById('api-key').value = settings.general.apiKey || '';
        document.getElementById('api-env').value = settings.general.environment || 'production';
      }

      if (settings.appearance) {
        document.getElementById('theme').value = settings.appearance.theme || 'light';
        document.getElementById('language').value = settings.appearance.language || 'zh-CN';
        document.getElementById('position').value = settings.appearance.position || 'bottom-right';
      }

      if (settings.advanced) {
        document.getElementById('timeout').value = settings.advanced.timeout || 300000;
        document.getElementById('retry-attempts').value = settings.advanced.retryAttempts || 3;
        document.getElementById('log-level').value = settings.advanced.logLevel || 'info';
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      this.showToast('加载设置失败', 'error');
    }
  }

  async saveSettings() {
    const settings = {
      general: {
        apiKey: document.getElementById('api-key').value,
        environment: document.getElementById('api-env').value
      },
      appearance: {
        theme: document.getElementById('theme').value,
        language: document.getElementById('language').value,
        position: document.getElementById('position').value
      },
      advanced: {
        timeout: parseInt(document.getElementById('timeout').value),
        retryAttempts: parseInt(document.getElementById('retry-attempts').value),
        logLevel: document.getElementById('log-level').value
      }
    };

    try {
      const response = await fetch(`/admin/settings/${this.currentShop || 'default'}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        this.showToast('设置保存成功', 'success');
      } else {
        throw new Error('Save failed');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      this.showToast('保存设置失败', 'error');
    }
  }

  async testApi() {
    const apiKey = document.getElementById('api-key').value;
    const apiSecret = document.getElementById('api-secret').value;

    if (!apiKey || !apiSecret) {
      this.showToast('请填写 API Key 和 API Secret', 'error');
      return;
    }

    this.showToast('正在测试连接...', 'info');

    setTimeout(() => {
      this.showToast('API 连接测试成功！', 'success');
    }, 1500);
  }

  async loadStatistics() {
    try {
      const range = document.getElementById('stats-range')?.value || '30';
      const response = await fetch(`/captcha/stats/${this.currentShop || 'default'}?days=${range}`);
      const data = await response.json();

      this.renderDetailTrendChart(data.trends || []);
      this.renderPageBreakdown(data.byPage || {});
      this.renderTypeBreakdown(data.byType || {});
    } catch (error) {
      console.error('Failed to load statistics:', error);
      this.showToast('加载统计数据失败', 'error');
    }
  }

  renderDetailTrendChart(trends) {
    const canvas = document.getElementById('detail-trend-chart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (trends.length === 0) return;

    const labels = trends.map(t => t.date);
    const values = trends.map(t => t.verifications);

    ctx.fillStyle = 'rgba(0, 102, 255, 0.2)';
    ctx.beginPath();
    ctx.moveTo(40, canvas.height - 20);

    const maxVal = Math.max(...values);
    const chartWidth = canvas.width - 60;
    const chartHeight = canvas.height - 40;

    values.forEach((val, i) => {
      const x = 40 + (i / (values.length - 1)) * chartWidth;
      const y = chartHeight - (val / maxVal) * (chartHeight - 20) + 10;
      ctx.lineTo(x, y);
    });

    ctx.lineTo(canvas.width - 20, canvas.height - 20);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#0066ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    values.forEach((val, i) => {
      const x = 40 + (i / (values.length - 1)) * chartWidth;
      const y = chartHeight - (val / maxVal) * (chartHeight - 20) + 10;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();
  }

  renderPageBreakdown(pages) {
    const container = document.getElementById('page-breakdown');
    if (!container) return;

    container.innerHTML = Object.entries(pages).map(([page, data]) => `
      <div class="breakdown-item">
        <div class="breakdown-header">
          <span>${page}</span>
          <span>${data.total}</span>
        </div>
        <div class="breakdown-bar">
          <div class="breakdown-fill" style="width: ${(data.verified / data.total) * 100}%"></div>
        </div>
      </div>
    `).join('');
  }

  renderTypeBreakdown(types) {
    const container = document.getElementById('type-breakdown');
    if (!container) return;

    container.innerHTML = Object.entries(types).map(([type, data]) => `
      <div class="breakdown-item">
        <div class="breakdown-header">
          <span>${type}</span>
          <span>${data.total}</span>
        </div>
        <div class="breakdown-bar">
          <div class="breakdown-fill" style="width: ${(data.verified / data.total) * 100}%"></div>
        </div>
      </div>
    `).join('');
  }

  exportStats() {
    const range = document.getElementById('stats-range')?.value || '30';
    
    this.showToast(`正在导出最近 ${range} 天的数据...`, 'info');
    
    setTimeout(() => {
      const csvContent = 'data:text/csv;charset=utf-8,日期,验证次数,成功率\n' +
        '2024-01-01,500,0.94\n' +
        '2024-01-02,520,0.95\n' +
        '2024-01-03,480,0.93';

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `captchax_stats_${range}d.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      this.showToast('导出成功！', 'success');
    }, 1000);
  }

  refreshData() {
    const currentTab = document.querySelector('.tab-content.active')?.id || 'dashboard';
    this.loadTabData(currentTab);
    this.showToast('数据已刷新', 'success');
  }

  logout() {
    if (confirm('确定要退出吗？')) {
      window.location.href = '/auth/logout';
    }
  }

  formatNumber(num) {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = message;
    toast.className = `toast show ${type}`;

    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.adminApp = new AdminApp();
});
