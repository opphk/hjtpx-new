import { defineNuxtModule, addPlugin, addComponent, addTemplate, createResolver } from '@nuxt/kit';
import type { CaptchaModuleOptions } from './types';

export default defineNuxtModule<CaptchaModuleOptions>({
  name: 'captchax',
  configKey: 'captcha',
  
  defaults: {
    apiKey: '',
    apiSecret: '',
    serverUrl: 'https://captchax.example.com',
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000,
    enabled: true,
    componentPrefix: 'Captcha',
    autoMount: true
  },
  
  setup(options, nuxt) {
    const resolver = createResolver(import.meta.url);
    
    if (!options.enabled) {
      return;
    }
    
    nuxt.options.runtimeConfig.captcha = {
      apiKey: options.apiKey,
      apiSecret: options.apiSecret,
      serverUrl: options.serverUrl,
      timeout: options.timeout,
      retryAttempts: options.retryAttempts,
      retryDelay: options.retryDelay
    };
    
    if (options.autoMount !== false) {
      addPlugin({
        src: resolver.resolve('./runtime/plugin.ts'),
        fileName: 'captchax/plugin.ts'
      });
    }
    
    const componentNames = [
      'CaptchaButton',
      'CaptchaDialog',
      'CaptchaSlider',
      'CaptchaClick',
      'CaptchaPuzzle',
      'CaptchaRotate',
      'CaptchaText',
      'CaptchaIcon'
    ];
    
    componentNames.forEach((name) => {
      const fileName = name.replace('Captcha', '');
      addComponent({
        name,
        filePath: resolver.resolve(`./runtime/components/${fileName}.vue`),
        prefix: options.componentPrefix
      });
    });
    
    nuxt.hook('components:dirs', (dirs) => {
      dirs.push({
        path: resolver.resolve('./runtime/components'),
        prefix: options.componentPrefix
      });
    });
    
    addTemplate({
      filename: 'captcha.config.mjs',
      getContents: () => `export const captchaConfig = ${JSON.stringify(options)}`
    });
  }
});
