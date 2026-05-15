(function($) {
    'use strict';
    
    var CaptchaXFront = {
        initialized: false,
        captchas: {},
        
        init: function() {
            if (typeof CaptchaX === 'undefined') {
                console.warn('CaptchaX SDK not loaded');
                this.loadFallbackScript();
                return;
            }
            
            this.initialized = true;
            this.bindEvents();
            this.initializeAllCaptchas();
        },
        
        loadFallbackScript: function() {
            var scriptUrl = captchaxConfig.serverUrl + '/captcha.js';
            $.getScript(scriptUrl)
                .done(function() {
                    CaptchaXFront.initializeAllCaptchas();
                })
                .fail(function(jqxhr, settings, exception) {
                    console.error('Failed to load CaptchaX SDK:', exception);
                });
        },
        
        bindEvents: function() {
            var self = this;
            
            $(document).on('click', '.captchax-container input[type="submit"], .captchax-container button[type="submit"]', function(e) {
                var $form = $(this).closest('form');
                var scene = $form.find('[name="captchax_token"]').attr('id').replace('captchax-token-', '');
                
                if (scene && self.captchas[scene] && !self.captchas[scene].verified) {
                    e.preventDefault();
                    $form.find('.captchax-error').show();
                    return false;
                }
            });
            
            $(document).on('formsReady', function() {
                self.initializeAllCaptchas();
            });
        },
        
        initializeAllCaptchas: function() {
            var self = this;
            var config = window.captchaxConfig || {};
            
            $('.captchax-container, .captchax-woo-container').each(function() {
                var $container = $(this);
                var $element = $container.find('[id$="-element"]');
                
                if ($element.length && typeof CaptchaX !== 'undefined') {
                    var elementId = $element.attr('id');
                    var scene = elementId.replace('-element', '').replace('captchax-', '');
                    
                    if (!self.captchas[scene]) {
                        self.initializeCaptcha(scene, $element, config);
                    }
                }
            });
        },
        
        initializeCaptcha: function(scene, $element, config) {
            var self = this;
            
            CaptchaX.init({
                element: '#' + $element.attr('id'),
                scene: scene,
                theme: config.theme || 'light',
                type: config.captchaType || 'slider',
                language: config.language || 'zh-CN',
                onReady: function() {
                    self.captchas[scene] = { ready: true, verified: false };
                },
                onSuccess: function(token) {
                    self.captchas[scene] = { ready: true, verified: true };
                    $('#captchax-token-' + scene).val(token);
                    $element.closest('.captchax-container, .captchax-woo-container')
                        .find('.captchax-error').hide();
                    
                    $(document).trigger('captchaxVerified', [scene, token]);
                },
                onError: function(error) {
                    console.error('CaptchaX Error:', error);
                    self.captchas[scene] = { ready: true, verified: false };
                    
                    $(document).trigger('captchaxError', [scene, error]);
                },
                onClose: function() {
                    self.captchas[scene] = { ready: true, verified: false };
                    
                    $(document).trigger('captchaxClose', [scene]);
                }
            });
        },
        
        verifyManually: function(scene, callback) {
            var token = $('#captchax-token-' + scene).val();
            
            if (!token) {
                callback({ success: false, error: 'No token available' });
                return;
            }
            
            $.ajax({
                url: captchaxConfig.ajaxUrl,
                type: 'POST',
                data: {
                    action: 'captchax_verify',
                    nonce: captchaxConfig.nonce,
                    token: token,
                    scene: scene
                },
                success: function(response) {
                    callback(response);
                },
                error: function(xhr, status, error) {
                    callback({ success: false, error: error });
                }
            });
        },
        
        reset: function(scene) {
            if (this.captchas[scene]) {
                this.captchas[scene].verified = false;
                $('#captchax-token-' + scene).val('');
            }
        },
        
        resetAll: function() {
            for (var scene in this.captchas) {
                this.reset(scene);
            }
        }
    };
    
    $(document).ready(function() {
        CaptchaXFront.init();
        
        if (typeof ajaxurl === 'undefined') {
            window.ajaxurl = window.captchaxConfig.ajaxUrl;
        }
    });
    
    window.CaptchaXFront = CaptchaXFront;
    
})(jQuery);
