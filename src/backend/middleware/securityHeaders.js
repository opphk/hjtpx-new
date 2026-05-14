const crypto = require('crypto');

const isProduction = process.env.NODE_ENV === 'production';
const isStaging = process.env.NODE_ENV === 'staging';

const nonceMiddleware = (req, res, next) => {
  res.locals.nonce = crypto.randomBytes(16).toString('base64');
  next();
};

const getCSPDirectives = (nonce) => {
  const directives = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' cdn.jsdelivr.net cdnjs.cloudflare.com unpkg.com`,
    `style-src 'self' 'unsafe-inline' fonts.googleapis.com cdn.jsdelivr.net cdnjs.cloudflare.com`,
    `font-src 'self' fonts.gstatic.com cdn.jsdelivr.net cdnjs.cloudflare.com`,
    `img-src 'self' data: https: blob:`,
    `connect-src 'self' wss: https:`,
    `media-src 'self'`,
    `object-src 'none'`,
    `frame-src 'none'`,
    `frame-ancestors 'none'`,
    `form-action 'self'`,
    `base-uri 'self'`,
    `report-uri /api/v1/security/csp-report`
  ];

  if (isProduction || isStaging) {
    directives.push('upgrade-insecure-requests');
  }

  return directives.join('; ');
};

const securityHeaders = (req, res, next) => {
  const nonce = crypto.randomBytes(16).toString('base64');
  res.locals.cspNonce = nonce;

  const cspHeader = getCSPDirectives(nonce);

  res.set({
    'Content-Security-Policy': cspHeader,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': isProduction ? 'DENY' : 'SAMEORIGIN',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=(), fullscreen=(self), picture-in-picture=(self)',
    'X-Download-Options': 'noopen',
    'X-Permitted-Cross-Domain-Policies': 'none',
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
    'Pragma': 'no-cache',
    'X-Request-ID': req.requestId || `req_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`,
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'X-DNS-Prefetch-Control': 'off',
    'Origin-Agent-Cluster': '?1'
  });

  if (isProduction) {
    res.set({
      'Vary': 'Origin, X-Requested-With, Content-Type, Accept',
      'X-Powered-By': ''
    });
  }

  next();
};

const additionalSecurityHeaders = (req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': isProduction ? 'DENY' : 'SAMEORIGIN',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=(), fullscreen=(self), picture-in-picture=(self)',
    'X-Download-Options': 'noopen',
    'X-Permitted-Cross-Domain-Policies': 'none',
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
    'Pragma': 'no-cache',
    'X-Request-ID': req.requestId || `req_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`
  });

  if (isProduction) {
    res.set({
      'Vary': 'Origin, X-Requested-With, Content-Type, Accept'
    });
  }

  next();
};

const createCSPReportEndpoint = () => (req, res) => {
  const cspReport = req.body || req['csp-report'];
  console.warn('CSP Violation Report:', JSON.stringify(cspReport, null, 2));
  res.status(204).send();
};

module.exports = {
  securityHeaders,
  additionalSecurityHeaders,
  nonceMiddleware,
  createCSPReportEndpoint
};
