/**
 * Customer Login Form Mixin
 */

define([
    'jquery',
    'CaptchaX_Captcha/js/captchax'
], function ($, CaptchaX) {
    'use strict';

    return function (target) {
        return target.extend({
            /**
             * Initialize captcha after form initialization
             *
             * @returns {*}
             */
            initialize: function () {
                var result = this._super();
                this._initCaptchaX();
                return result;
            },

            /**
             * Initialize CaptchaX widget
             *
             * @private
             */
            _initCaptchaX: function () {
                var config = this.element.data('captchax-config');
                if (config && config.isEnabled) {
                    CaptchaX.init(config);
                }
            },

            /**
             * Validate form with captcha
             *
             * @returns {boolean}
             */
            validate: function () {
                var baseValidation = this._super();
                var token = CaptchaX.getToken();

                if (!token || token.length === 0) {
                    return false;
                }

                return baseValidation;
            }
        });
    };
});
