const CONFIG = {
  dev: {
    apiBase: 'http://localhost:3000'
  },
  prod: {
    apiBase: 'https://captchax.example.com'
  },
  getApiBase() {
    const info = swan.getSystemInfo();
    const env = info.platform || 'dev';
    return env === 'production' ? this.prod.apiBase : this.dev.apiBase;
  }
};

module.exports = CONFIG;
