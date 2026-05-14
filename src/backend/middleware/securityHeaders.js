const helmet = require('helmet');

const isProduction = process.env.NODE_ENV === 'production';

const crypto = require('crypto');

const nonceMiddleware = (req, res, next) => {
  res.locals.nonce = crypto.randomBytes(16).toString('base64');
  next();
};

const getCSPWithNonce = (nonce) => ({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", `'nonce-${nonce}'`, "'unsafe-inline'", 'cdn.jsdelivr.net'],
    styleSrc: ["'self'", "'unsafe-inline'", 'fonts.googleapis.com'],
    fontSrc: ["'self'", 'fonts.gstatic.com'],
    imgSrc: ["'self'", 'data:', 'https:'],
    connectSrc: ["'self'", 'https://api.hjtpx.com'],
    mediaSrc: ["'self'"],
    objectSrc: ["'none'"],
    frameSrc: ["'none'"],
    frameAncestors: ["'none'"],
    formAction: ["'self'"],
    baseUri: ["'self'"],
    upgradeInsecureRequests: isProduction ? [] : null,
    reportUri: '/api/v1/security/csp-report'
  }
});

const securityHeaders = (req, res, next) => {
  const nonce = crypto.randomBytes(16).toString('base64');
  res.locals.cspNonce = nonce;

  helmet.contentSecurityPolicy(getCSPWithNonce(nonce))(req, res, () => {
    helmet.crossOriginEmbedderPolicy(isProduction ? { policy: 'require-corp' } : false)(req, res, () => {
      helmet.crossOriginOpenerPolicy(isProduction ? { policy: 'same-origin' } : false)(req, res, () => {
        helmet.crossOriginResourcePolicy({ policy: 'same-origin' })(req, res, () => {
          helmet.dnsPrefetchControl({ allow: false })(req, res, () => {
            helmet.frameguard({ action: isProduction ? 'deny' : 'sameorigin' })(req, res, () => {
              helmet.hidePoweredBy()(req, res, () => {
                helmet.hsts({
                  maxAge: 31536000,
                  includeSubDomains: true,
                  preload: true
                })(req, res, () => {
                  helmet.ieNoOpen()(req, res, () => {
                    helmet.noSniff()(req, res, () => {
                      helmet.originAgentCluster()(req, res, () => {
                        helmet.permittedCrossDomainPolicies({ permittedPolicies: 'none' })(req, res, () => {
                          helmet.referrerPolicy({ policy: 'strict-origin-when-cross-origin' })(req, res, () => {
                            helmet.xssFilter()(req, res, next);
                          });
                        });
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });
};

const additionalSecurityHeaders = (req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': isProduction ? 'DENY' : 'SAMEORIGIN',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()',
    'X-Download-Options': 'noopen',
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
    'Pragma': 'no-cache',
    'X-Request-ID': req.requestId || `req_${Date.now()}`
  });

  if (isProduction) {
    res.set({
      'Vary': 'Origin',
      'X-Permitted-Cross-Domain-Policies': 'none'
    });
  }

  next();
};

module.exports = {
  securityHeaders,
  additionalSecurityHeaders,
  nonceMiddleware
};
