<?php
/**
 * Admin CaptchaX JavaScript Module
 */

define([
    'jquery',
    'mage/translate'
], function ($, $t) {
    'use strict';

    return {
        /**
         * Initialize admin configuration validation
         */
        init: function () {
            this.bindEvents();
            this.validateConfiguration();
        },

        /**
         * Bind event listeners
         */
        bindEvents: function () {
            $(document).on('change', '#captchax_general_environment', function () {
                this.toggleApiUrlFields();
            }.bind(this));

            $(document).on('click', '#captchax_test_connection', function (e) {
                e.preventDefault();
                this.testConnection();
            }.bind(this));
        },

        /**
         * Toggle API URL fields based on environment
         */
        toggleApiUrlFields: function () {
            var environment = $('#captchax_general_environment').val();
            if (environment === 'production') {
                $('#captchax_general_api_url_dev').closest('.field').hide();
                $('#captchax_general_api_url_prod').closest('.field').show();
            } else {
                $('#captchax_general_api_url_dev').closest('.field').show();
                $('#captchax_general_api_url_prod').closest('.field').hide();
            }
        },

        /**
         * Validate configuration
         */
        validateConfiguration: function () {
            var siteKey = $('#captchax_general_site_key').val();
            var secretKey = $('#captchax_general_secret_key').val();

            if (!siteKey || !secretKey) {
                this.showNotice($t('Please configure Site Key and Secret Key'));
            }
        },

        /**
         * Test API connection
         */
        testConnection: function () {
            var apiUrl = $('#captchax_general_api_url_dev').val() || $('#captchax_general_api_url_prod').val();

            $.ajax({
                url: apiUrl + '/api/health',
                type: 'GET',
                success: function (response) {
                    if (response.status === 'ok') {
                        this.showSuccess($t('Connection successful!'));
                    } else {
                        this.showError($t('Connection failed. Please check your configuration.'));
                    }
                }.bind(this),
                error: function () {
                    this.showError($t('Connection failed. Please check your configuration.'));
                }.bind(this)
            });
        },

        /**
         * Show success message
         *
         * @param {string} message
         */
        showSuccess: function (message) {
            this.showMessage(message, 'success');
        },

        /**
         * Show error message
         *
         * @param {string} message
         */
        showError: function (message) {
            this.showMessage(message, 'error');
        },

        /**
         * Show notice message
         *
         * @param {string} message
         */
        showNotice: function (message) {
            this.showMessage(message, 'notice');
        },

        /**
         * Show message to user
         *
         * @param {string} message
         * @param {string} type
         */
        showMessage: function (message, type) {
            require(['Magento_Ui/js/messenger'], function (Messenger) {
                Messenger().addMessage(message, type);
            });
        }
    };
});
