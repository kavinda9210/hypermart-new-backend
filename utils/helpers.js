exports.getJwtSecret = () => process.env.JWT_SECRET || 'hypermart_secret';

exports.normalizeBcryptHash = (hash) =>
  typeof hash === 'string' ? hash.replace(/^\$2y\$/, '$2a$') : '';
