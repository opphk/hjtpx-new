const Sentry = require('@sentry/node');
const { nodeProfilingIntegration } = require('@sentry/profiling-node');

function initSentry(app) {
  if (!process.env.SENTRY_DSN) {
    console.log('⚠️ SENTRY_DSN 未配置，Sentry 将不会启动');
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
    release: process.env.SENTRY_RELEASE || 'hjtpx@1.0.0',
    
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Express({ app }),
      nodeProfilingIntegration(),
    ],
    
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE) || 1.0,
    profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE) || 1.0,
    
    maxBreadcrumbs: 50,
    debug: process.env.SENTRY_DEBUG === 'true',
    
    beforeSend(event, hint) {
      const error = hint.originalException;
      if (error && error.message) {
        if (error.message.includes('Network Error') || 
            error.message.includes('timeout') ||
            error.message.includes('ECONNREFUSED')) {
          event.tags = event.tags || {};
          event.tags.network_error = 'true';
        }
      }
      return event;
    },
    
    beforeSendTransaction(event) {
      if (event.transaction && event.transaction.includes('/health')) {
        return null;
      }
      return event;
    }
  });

  console.log('✅ Sentry 已初始化');
}

module.exports = {
  initSentry,
  Sentry
};
