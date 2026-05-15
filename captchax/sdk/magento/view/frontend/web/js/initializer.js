/**
 * CaptchaX Form Initializer
 */

define([
    'jquery',
    'CaptchaX_Captcha/js/captchax'
], function ($, CaptchaX) {
    'use strict';

    $.widget('captchax.formInitializer', {
        options: {
            formSelector: '',
            captchaType: 'image',
            tokenName: 'captcha_token',
            validateBeforeSubmit: true
        },

        /**
         * Initialize captcha for form
         *
         * @private
         */
        _create: function () {
            this._bindEvents();
            this._initCaptcha();
        },

        /**
         * Bind form events
         *
         * @private
         */
        _bindEvents: function () {
            var self = this;

            $(this.options.formSelector).on('submit', function (e) {
                if (self.options.validateBeforeSubmit) {
                    return self._validateForm(e);
                }
            });

            $(document).on('captchax:verified', function () {
                self.enableSubmitButton();
            });

            $(document).on('captchax:failed', function () {
                self.disableSubmitButton();
            });
        },

        /**
         * Initialize captcha
         *
         * @private
         */
        _initCaptcha: function () {
            var config = this.element.data('captchax-config');
            if (config) {
                CaptchaX.init(config);
            }
        },

        /**
         * Validate form before submission
         *
         * @param {Event} e
         * @returns {boolean}
         * @private
         */
        _validateForm: function (e) {
            var token = CaptchaX.getToken();
            if (!token) {
                e.preventDefault();
                alert($.mage.__('Please complete the captcha verification first.'));
                return false;
            }
            return true;
        },

        /**
         * Enable submit button
         */
        enableSubmitButton: function () {
            var $form = $(this.options.formSelector);
            var $submitBtn = $form.find('button[type="submit"], input[type="submit"]');
            $submitBtn.prop('disabled', false).removeClass('disabled');
        },

        /**
         * Disable submit button
         */
        disableSubmitButton: function () {
            var $form = $(this.options.formSelector);
            var $submitBtn = $form.find('button[type="submit"], input[type="submit"]');
            $submitBtn.prop('disabled', true).addClass('disabled');
        }
    });

    return $.captchax.formInitializer;
});
