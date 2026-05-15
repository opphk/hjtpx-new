function validateCaptchaType(type) {
  const validTypes = ['slider', 'click', 'puzzle', 'rotate', 'text', 'icon'];
  return validTypes.includes(type);
}

function validateCaptchaId(captchaId) {
  return captchaId && typeof captchaId === 'string' && captchaId.length > 0;
}

function validatePosition(position) {
  return typeof position === 'number' && position >= 0;
}

function validateTrack(track) {
  return Array.isArray(track);
}

function validateClickPositions(positions) {
  if (!Array.isArray(positions)) return false;
  
  return positions.every(pos => {
    return typeof pos.x === 'number' && 
           typeof pos.y === 'number' &&
           typeof pos.timestamp === 'number';
  });
}

function validateRotationAngle(angle) {
  return typeof angle === 'number';
}

function validateTextInput(text) {
  return typeof text === 'string' && text.length > 0;
}

function validateIconSelection(icons) {
  return Array.isArray(icons) && icons.every(icon => {
    return typeof icon === 'number' || typeof icon === 'string';
  });
}

function validateOptions(options) {
  if (!options || typeof options !== 'object') {
    return { valid: false, error: 'Options must be an object' };
  }

  const { type, captchaId } = options;

  if (!validateCaptchaType(type)) {
    return { valid: false, error: `Invalid captcha type: ${type}` };
  }

  if (!validateCaptchaId(captchaId)) {
    return { valid: false, error: 'Invalid captcha ID' };
  }

  return { valid: true };
}

module.exports = {
  validateCaptchaType,
  validateCaptchaId,
  validatePosition,
  validateTrack,
  validateClickPositions,
  validateRotationAngle,
  validateTextInput,
  validateIconSelection,
  validateOptions
};
