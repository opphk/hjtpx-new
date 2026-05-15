const CONFIG = {
  dev: {
    apiBase: 'http://localhost:3000'
  },
  prod: {
    apiBase: 'https://captchax.example.com'
  },
  getApiBase() {
    const env = my.getSystemInfoSync().env;
    return env === 'production' ? this.prod.apiBase : this.dev.apiBase;
  }
};

module.exports = CONFIG;
