var config = {
    map: {
        '*': {
            captchax: 'CaptchaX_Captcha/js/captchax',
            captchaxInitializer: 'CaptchaX_Captcha/js/initializer',
            captchaxValidator: 'CaptchaX_Captcha/js/validator'
        }
    },
    shim: {
        'captchax': {
            deps: ['jquery']
        }
    },
    config: {
        mixins: {
            'Magento_Customer/js/view/form-login': {
                'CaptchaX_Captcha/js/plugin/customer-login-mixin': true
            },
            'Magento_Customer/js/view/form-register': {
                'CaptchaX_Captcha/js/plugin/customer-register-mixin': true
            }
        }
    }
};
