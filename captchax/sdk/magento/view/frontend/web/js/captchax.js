/**
 * CaptchaX Main JavaScript Module
 */

define([
    'jquery',
    'mage/loader',
    'mage/translate'
], function ($, loader, $t) {
    'use strict';

    var CaptchaX = {
        config: {},
        initialized: false,

        /**
         * Initialize CaptchaX widget
         *
         * @param {Object} config
         */
        init: function (config) {
            this.config = config;
            this.loadScript().then(function () {
                this.renderWidget();
                this.bindEvents();
            }.bind(this));
        },

        /**
         * Load CaptchaX script dynamically
         *
         * @returns {Promise}
         */
        loadScript: function () {
            var self = this;
            return new Promise(function (resolve, reject) {
                if (window.CaptchaXSDK) {
                    resolve();
                    return;
                }

                var script = document.createElement('script');
                script.src = self.config.apiUrl + '/sdk/captchax.js';
                script.async = true;
                script.onload = function () {
                    resolve();
                };
                script.onerror = function () {
                    console.error('Failed to load CaptchaX SDK');
                    reject(new Error('Failed to load CaptchaX SDK'));
                };
                document.head.appendChild(script);

                var link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = self.config.apiUrl + '/sdk/styles.css';
                document.head.appendChild(link);
            });
        },

        /**
         * Render captcha widget
         */
        renderWidget: function () {
            var container = document.getElementById('captchax-container');
            if (!container || !window.CaptchaXSDK) {
                return;
            }

            var options = {
                siteKey: this.config.siteKey,
                type: this.config.defaultType,
                theme: 'light',
                onSuccess: this.handleSuccess.bind(this),
                onError: this.handleError.bind(this)
            };

            window.CaptchaXSDK.render(container, options);
        },

        /**
         * Handle successful verification
         *
         * @param {Object} result
         */
        handleSuccess: function (result) {
            var tokenInput = document.querySelector('input[name="captcha_token"]');
            if (tokenInput) {
                tokenInput.value = result.token;
            }
            this.showMessage($t('Verification successful!'), 'success');
        },

        /**
         * Handle verification error
         *
         * @param {Object} error
         */
        handleError: function (error) {
            this.showMessage($t('Verification failed. Please try again.'), 'error');
            console.error('CaptchaX Error:', error);
        },

        /**
         * Bind event listeners
         */
        bindEvents: function () {
            var self = this;
            $(document).on('captchax:verify', function (event, token) {
                self.verifyToken(token);
            });
        },

        /**
         * Verify token with backend
         *
         * @param {string} token
         */
        verifyToken: function (token) {
            $.ajax({
                url: this.config.apiUrl + '/api/verify',
                type: 'POST',
                data: {
                    secret: this.config.siteKey,
                    response: token
                },
                success: function (response) {
                    if (response.success) {
                        $(document).trigger('captchax:verified');
                    } else {
                        $(document).trigger('captchax:failed', [response.error]);
                    }
                },
                error: function () {
                    $(document).trigger('captchax:failed', ['Verification request failed']);
                }
            });
        },

        /**
         * Show message to user
         *
         * @param {string} message
         * @param {string} type
         */
        showMessage: function (message, type) {
            var messageContainer = document.querySelector('.messages');
            if (messageContainer) {
                var messageHtml = '<div class="message message-' + type + ' ' + type + '"><div>' + message + '</div></div>';
                messageContainer.innerHTML = messageHtml;
            }
        },

        /**
         * Reset captcha widget
         */
        reset: function () {
            var container = document.getElementById('captchax-container');
            if (container && window.CaptchaXSDK) {
                window.CaptchaXSDK.reset(container);
            }
        },

        /**
         * Get current token
         *
         * @returns {string|null}
         */
        getToken: function () {
            var tokenInput = document.querySelector('input[name="captcha_token"]');
            return tokenInput ? tokenInput.value : null;
        }
    };

    return CaptchaX;
});
