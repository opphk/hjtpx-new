<?php

require_once CAPTCHAX_PLUGIN_DIR . 'includes/class-captchax-api.php';

class CaptchaX_REST_API {
    
    private $plugin_name;
    private $version;
    private $namespace = 'captchax/v1';
    private $api;
    
    public function __construct($plugin_name, $version) {
        $this->plugin_name = $plugin_name;
        $this->version = $version;
        $this->api = new CaptchaX_API();
    }
    
    public function register_routes() {
        register_rest_route($this->namespace, '/verify', [
            'methods' => 'POST',
            'callback' => [$this, 'verify_captcha'],
            'permission_callback' => '__return_true',
            'args' => [
                'token' => [
                    'required' => true,
                    'sanitize_callback' => 'sanitize_text_field'
                ],
                'scene' => [
                    'required' => false,
                    'sanitize_callback' => 'sanitize_text_field',
                    'default' => 'default'
                ]
            ]
        ]);
        
        register_rest_route($this->namespace, '/settings', [
            'methods' => 'GET',
            'callback' => [$this, 'get_settings'],
            'permission_callback' => '__return_true'
        ]);
        
        register_rest_route($this->namespace, '/script', [
            'methods' => 'GET',
            'callback' => [$this, 'get_script_url'],
            'permission_callback' => '__return_true'
        ]);
        
        register_rest_route($this->namespace, '/status', [
            'methods' => 'GET',
            'callback' => [$this, 'get_status'],
            'permission_callback' => '__return_true'
        ]);
    }
    
    public function verify_captcha(WP_REST_Request $request) {
        $token = $request->get_param('token');
        $scene = $request->get_param('scene') ?: 'default';
        
        $result = $this->api->verify($token, $scene);
        
        return new WP_REST_Response($result, $result['success'] ? 200 : 400);
    }
    
    public function get_settings(WP_REST_Request $request) {
        $enabled_forms = get_option('captchax_enabled_forms', []);
        
        $settings = [
            'enabled' => (bool) get_option('captchax_enabled', '1'),
            'appId' => $this->api->get_app_id(),
            'scriptUrl' => $this->api->get_script_url(),
            'theme' => get_option('captchax_theme', 'light'),
            'captchaType' => get_option('captchax_captcha_type', 'slider'),
            'language' => get_option('captchax_language', 'zh-CN'),
            'enabledForms' => $enabled_forms,
            'errorMessage' => get_option('captchax_error_message', __('请先完成验证', 'captchax')),
            'verifyFailedMessage' => get_option('captchax_verify_failed_message', __('验证码验证失败', 'captchax'))
        ];
        
        return new WP_REST_Response($settings, 200);
    }
    
    public function get_script_url(WP_REST_Request $request) {
        return new WP_REST_Response([
            'url' => $this->api->get_script_url(),
            'appId' => $this->api->get_app_id()
        ], 200);
    }
    
    public function get_status(WP_REST_Request $request) {
        $api_key = get_option('captchax_api_key', '');
        $api_secret = get_option('captchax_api_secret', '');
        
        $status = [
            'configured' => !empty($api_key) && !empty($api_secret),
            'enabled' => (bool) get_option('captchax_enabled', '1'),
            'woocommerce_active' => class_exists('WooCommerce'),
            'version' => CAPTCHAX_VERSION,
            'server_url' => get_option('captchax_server_url')
        ];
        
        return new WP_REST_Response($status, 200);
    }
}
