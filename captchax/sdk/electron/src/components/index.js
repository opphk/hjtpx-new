const SliderCaptcha = require('./slider-captcha');
const ClickCaptcha = require('./click-captcha');
const PuzzleCaptcha = require('./puzzle-captcha');
const RotateCaptcha = require('./rotate-captcha');
const TextCaptcha = require('./text-captcha');
const IconCaptcha = require('./icon-captcha');

const CaptchaComponents = {
  SliderCaptcha,
  ClickCaptcha,
  PuzzleCaptcha,
  RotateCaptcha,
  TextCaptcha,
  IconCaptcha
};

function createCaptcha(type, container, options = {}) {
  const ComponentClass = CaptchaComponents[`${type.charAt(0).toUpperCase() + type.slice(1)}Captcha`];
  
  if (!ComponentClass) {
    throw new Error(`Unknown captcha type: ${type}`);
  }
  
  return new ComponentClass(container, options);
}

module.exports = {
  CaptchaComponents,
  createCaptcha,
  SliderCaptcha,
  ClickCaptcha,
  PuzzleCaptcha,
  RotateCaptcha,
  TextCaptcha,
  IconCaptcha
};
