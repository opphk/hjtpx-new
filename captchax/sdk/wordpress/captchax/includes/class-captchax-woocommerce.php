<?php

if (!defined('ABSPATH')) {
    exit;
}

require_once CAPTCHAX_PLUGIN_DIR . 'includes/class-captchax-api.php';

class CaptchaX_WooCommerce {
    
    private $plugin_name;
    private $version;
    private $api;
    
    public function __construct($plugin_name, $version) {
        $this->plugin_name = $plugin_name;
        $this->version = $version;
        $this->api = new CaptchaX_API();
    }
    
    public function add_captcha_to_woo_login() {
        if (!get_option('captchax_woo_login_enabled', '1')) return;
        if (!get_option('captchax_enabled', '1')) return;
        
        $enabled_forms = get_option('captchax_enabled_forms', []);
        if (!in_array('login', $enabled_forms)) return;
        
        $this->render_captcha('woo_login');
    }
    
    public function add_captcha_to_woo_register() {
        if (!get_option('captchax_woo_register_enabled', '1')) return;
        if (!get_option('captchax_enabled', '1')) return;
        
        $enabled_forms = get_option('captchax_enabled_forms', []);
        if (!in_array('register', $enabled_forms)) return;
        
        $this->render_captcha('woo_register');
    }
    
    public function add_captcha_to_woo_checkout() {
        if (!get_option('captchax_woo_checkout_enabled', '1')) return;
        if (!get_option('captchax_enabled', '1')) return;
        
        $this->render_captcha('woo_checkout');
    }
    
    public function add_captcha_to_woo_checkout_short() {
        if (get_option('captchax_woo_checkout_enabled', '1') && get_option('captchax_enabled', '1')) {
            $this->render_captcha('woo_checkout_short');
        }
    }
    
    public function add_captcha_to_woo_lostpassword() {
        if (!get_option('captchax_enabled', '1')) return;
        
        $enabled_forms = get_option('captchax_enabled_forms', []);
        if (!in_array('lostpassword', $enabled_forms)) return;
        
        $this->render_captcha('woo_lostpassword');
    }
    
    public function add_captcha_to_woo_resetpassword() {
        if (!get_option('captchax_enabled', '1')) return;
        
        $enabled_forms = get_option('captchax_enabled_forms', []);
        if (!in_array('resetpassword', $enabled_forms)) return;
        
        $this->render_captcha('woo_resetpassword');
    }
    
    private function render_captcha($scene) {
        $captcha_type = get_option('captchax_captcha_type', 'slider');
        ?>
        <div class="captchax-woo-container" id="captchax-<?php echo esc_attr($scene); ?>">
            <div id="captchax-<?php echo esc_attr($scene); ?>-element"></div>
            <input type="hidden" name="captchax_token" id="captchax-token-<?php echo esc_attr($scene); ?>" value="">
            <p class="captchax-error" style="display:none;color:#e2401c;margin:10px 0;">
                <?php echo esc_html(get_option('captchax_error_message', __('请先完成验证', 'captchax'))); ?>
            </p>
        </div>
        <script>
            if (typeof CaptchaX !== 'undefined') {
                CaptchaX.init({
                    element: '#captchax-<?php echo esc_attr($scene); ?>-element',
                    scene: '<?php echo esc_attr($scene); ?>',
                    theme: '<?php echo esc_attr(get_option('captchax_theme', 'light')); ?>',
                    type: '<?php echo esc_attr($captcha_type); ?>',
                    onSuccess: function(token) {
                        document.getElementById('captchax-token-<?php echo esc_attr($scene); ?>').value = token;
                        jQuery('.captchax-error', '#captchax-<?php echo esc_attr($scene); ?>').hide();
                    },
                    onError: function(error) {
                        console.error('CaptchaX Error:', error);
                    }
                });
            }
        </script>
        <?php
    }
    
    public function verify_woo_login($errors, $username, $password) {
        if (!get_option('captchax_woo_login_enabled', '1')) return $errors;
        if (!get_option('captchax_enabled', '1')) return $errors;
        
        $enabled_forms = get_option('captchax_enabled_forms', []);
        if (!in_array('login', $enabled_forms)) return $errors;
        
        $token = sanitize_text_field($_POST['captchax_token'] ?? '');
        if (empty($token)) {
            return new WP_Error('captchax_error', get_option('captchax_error_message', __('请先完成验证', 'captchax')));
        }
        
        $result = $this->api->verify($token, 'woo_login');
        if (!$result['success']) {
            return new WP_Error('captchax_error', get_option('captchax_verify_failed_message', __('验证码验证失败', 'captchax')));
        }
        
        return $errors;
    }
    
    public function verify_woo_register($errors, $username, $email) {
        if (!get_option('captchax_woo_register_enabled', '1')) return $errors;
        if (!get_option('captchax_enabled', '1')) return $errors;
        
        $enabled_forms = get_option('captchax_enabled_forms', []);
        if (!in_array('register', $enabled_forms)) return $errors;
        
        $token = sanitize_text_field($_POST['captchax_token'] ?? '');
        if (empty($token)) {
            return new WP_Error('captchax_error', get_option('captchax_error_message', __('请先完成验证', 'captchax')));
        }
        
        $result = $this->api->verify($token, 'woo_register');
        if (!$result['success']) {
            return new WP_Error('captchax_error', get_option('captchax_verify_failed_message', __('验证码验证失败', 'captchax')));
        }
        
        return $errors;
    }
    
    public function verify_woo_checkout($data, $errors) {
        if (!get_option('captchax_woo_checkout_enabled', '1')) return;
        if (!get_option('captchax_enabled', '1')) return;
        
        $token = sanitize_text_field($_POST['captchax_token'] ?? '');
        if (empty($token)) {
            wc_add_notice(get_option('captchax_error_message', __('请先完成验证', 'captchax')), 'error');
            return;
        }
        
        $result = $this->api->verify($token, 'woo_checkout');
        if (!$result['success']) {
            wc_add_notice(get_option('captchax_verify_failed_message', __('验证码验证失败', 'captchax')), 'error');
        }
    }
    
    public function verify_woo_checkout_short($data, $errors) {
        $this->verify_woo_checkout($data, $errors);
    }
}
