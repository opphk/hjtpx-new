const VERSIONS = {
  v1: {
    version: 'v1',
    status: 'stable',
    deprecated: true,
    deprecationDate: '2026-01-01',
    sunsetDate: '2026-07-01',
    routes: require('../routes/v1')
  },
  v2: {
    version: 'v2',
    status: 'stable',
    deprecated: false,
    deprecationDate: null,
    sunsetDate: null,
    routes: require('../routes/v2')
  }
};

const DEFAULT_VERSION = 'v2';
const SUPPORTED_VERSIONS = Object.keys(VERSIONS);

const versionNegotiator = (req, res, next) => {
  let version = null;

  const urlMatch = req.path.match(/^\/api\/(v\d+)/);
  if (urlMatch && SUPPORTED_VERSIONS.includes(urlMatch[1])) {
    version = urlMatch[1];
  }

  if (!version) {
    const acceptHeader = req.headers.accept;
    if (acceptHeader) {
      const acceptMatch = acceptHeader.match(/application\/vnd\.hjtpx\.(v\d+)\+json/);
      if (acceptMatch && SUPPORTED_VERSIONS.includes(acceptMatch[1])) {
        version = acceptMatch[1];
      }
    }
  }

  if (!version) {
    const customHeader = req.headers['x-api-version'];
    if (customHeader && SUPPORTED_VERSIONS.includes(customHeader)) {
      version = customHeader;
    }
  }

  req.apiVersion = version || DEFAULT_VERSION;
  req.apiVersionInfo = VERSIONS[req.apiVersion];

  res.setHeader('X-API-Version', req.apiVersion);

  next();
};

const deprecationWarning = (req, res, next) => {
  const versionInfo = req.apiVersionInfo;

  if (versionInfo.deprecated) {
    const warningMessage = `API ${versionInfo.version} is deprecated. Please upgrade to the latest version.`;
    res.setHeader('Warning', `299 - "${warningMessage}"`);
    
    if (versionInfo.deprecationDate) {
      res.setHeader('X-API-Deprecation-Date', versionInfo.deprecationDate);
    }
    
    if (versionInfo.sunsetDate) {
      res.setHeader('X-API-Sunset-Date', versionInfo.sunsetDate);
    }
  }

  next();
};

const versionRouter = (req, res, next) => {
  const versionInfo = req.apiVersionInfo;
  if (versionInfo && versionInfo.routes) {
    return versionInfo.routes(req, res, next);
  } else {
    res.notFound(`API version ${req.apiVersion} not found`);
  }
};

module.exports = {
  versionNegotiator,
  deprecationWarning,
  versionRouter,
  VERSIONS,
  DEFAULT_VERSION,
  SUPPORTED_VERSIONS
};
