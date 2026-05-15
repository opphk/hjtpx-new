/**
 * CaptchaX Token Validator
 */

define([
    'jquery',
    'mage/translate'
], function ($, $t) {
    'use strict';

    return {
        /**
         * Validate captcha token
         *
         * @param {string} token
         * @returns {boolean}
         */
        validate: function (token) {
            if (!token || token.length === 0) {
                this.showError($t('Captcha verification is required'));
                return false;
            }

            if (token.length < 10) {
                this.showError($t('Invalid captcha token'));
                return false;
            }

            return true;
        },

        /**
         * Show validation error
         *
         * @param {string} message
         */
        showError: function (message) {
            var messageContainer = document.querySelector('.messages');
            if (messageContainer) {
                messageContainer.innerHTML = '<div class="message message-error error">' + message + '</div>';
            } else {
                alert(message);
            }
        },

        /**
         * Clear error messages
         */
        clearErrors: function () {
            var messageContainer = document.querySelector('.messages');
            if (messageContainer) {
                messageContainer.innerHTML = '';
            }
        }
    };
});
