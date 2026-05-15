<?php

require_once CAPTCHAX_PLUGIN_DIR . 'includes/class-captchax-api.php';

class CaptchaX_Public {
    
    private $plugin_name;
    private $version;
    private $api;
    private $verified_captchas = [];
    
    public function __construct($plugin_name, $version) {
        $this->plugin_name = $plugin_name;
        $this->version = $version;
        $this->api = new CaptchaX_API();
        
        add_filter('wpcf7_form_elements', [$this, 'cf7_compat'], 10);
        add_filter('wpcf7_validate', [$this, 'cf7_validate'], 10, 2);
    }
    
    public function enqueue_styles() {
        if (!get_option('captchax_enabled', '1')) return;
        
        wp_enqueue_style(
            $this->plugin_name,
            CAPTCHAX_PLUGIN_URL . 'public/css/captchax-public.css',
            [],
            $this->version
        );
    }
    
    public function enqueue_scripts() {
        if (!get_option('captchax_enabled', '1')) return;
        
        $script_url = $this->api->get_script_url();
        $app_id = $this->api->get_app_id();
        $server_url = get_option('captchax_server_url', CAPTCHAX_API_PROD_URL);
        
        wp_enqueue_script(
            'captchax-sdk',
            $script_url,
            [],
            $this->version,
            true
        );
        
        wp_localize_script('captchax-sdk', 'captchaxConfig', [
            'appId' => $app_id,
            'theme' => get_option('captchax_theme', 'light'),
            'captchaType' => get_option('captchax_captcha_type', 'slider'),
            'language' => get_option('captchax_language', 'zh-CN'),
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('captchax_verify'),
            'serverUrl' => $server_url
        ]);
        
        wp_enqueue_script(
            $this->plugin_name . '-public',
            CAPTCHAX_PLUGIN_URL . 'public/js/captchax-public.js',
            ['captchax-sdk', 'jquery'],
            $this->version,
            true
        );
    }
    
    public function add_captcha_to_comment_form() {
        if (!get_option('captchax_enabled', '1')) return;
        
        $enabled_forms = get_option('captchax_enabled_forms', []);
        if (!in_array('comment', $enabled_forms)) return;
        if (is_user_logged_in() && get_option('captchax_skip_logged_in', '1')) return;
        
        $this->render_captcha('comment');
    }
    
    public function add_captcha_to_login_form() {
        if (!get_option('captchax_enabled', '1')) return;
        
        $enabled_forms = get_option('captchax_enabled_forms', []);
        if (!in_array('login', $enabled_forms)) return;
        
        $this->render_captcha('login');
    }
    
    public function add_captcha_to_register_form() {
        if (!get_option('captchax_enabled', '1')) return;
        
        $enabled_forms = get_option('captchax_enabled_forms', []);
        if (!in_array('register', $enabled_forms)) return;
        
        $this->render_captcha('register');
    }
    
    public function add_captcha_to_lostpassword_form() {
        if (!get_option('captchax_enabled', '1')) return;
        
        $enabled_forms = get_option('captchax_enabled_forms', []);
        if (!in_array('lostpassword', $enabled_forms)) return;
        
        $this->render_captcha('lostpassword');
    }
    
    public function add_captcha_to_resetpass_form($user) {
        if (!get_option('captchax_enabled', '1')) return;
        
        $enabled_forms = get_option('captchax_enabled_forms', []);
        if (!in_array('resetpassword', $enabled_forms)) return;
        
        $this->render_captcha('resetpassword');
    }
    
    public function add_captcha_to_contact_form() {
        if (!get_option('captchax_enabled', '1')) return;
        if (!get_option('captchax_contact_form_enabled', '0')) return;
        
        $enabled_forms = get_option('captchax_enabled_forms', []);
        if (!in_array('contact', $enabled_forms)) return;
        
        $priority = get_option('captchax_contact_form_priority', '30');
        add_action('wpcf7_form_tag', function() use ($priority) {
            $this->render_captcha('contact');
        }, $priority);
    }
    
    public function verify_resetpass_captcha($user, $new_pass) {
        $enabled_forms = get_option('captchax_enabled_forms', []);
        if (in_array('resetpassword', $enabled_forms) && get_option('captchax_enabled', '1')) {
            $token = sanitize_text_field($_POST['captchax_token'] ?? '');
            if (!empty($token)) {
                $result = $this->api->verify($token, 'resetpassword');
                if (!$result['success']) {
                    wp_die(get_option('captchax_verify_failed_message', __('验证码验证失败', 'captchax')));
                }
            }
        }
    }
    
    private function render_captcha($scene) {
        $captcha_type = get_option('captchax_captcha_type', 'slider');
        $theme = get_option('captchax_theme', 'light');
        $error_message = get_option('captchax_error_message', __('请先完成验证', 'captchax'));
        
        $container_class = ($theme === 'dark') ? 'captchax-container theme-' . $theme : 'captchax-container';
        ?>
        <div class="<?php echo esc_attr($container_class); ?>" id="captchax-<?php echo esc_attr($scene); ?>">
            <div id="captchax-<?php echo esc_attr($scene); ?>-element"></div>
            <input type="hidden" name="captchax_token" id="captchax-token-<?php echo esc_attr($scene); ?>" value="">
            <p class="captchax-error" style="display:none;">
                <?php echo esc_html($error_message); ?>
            </p>
        </div>
        <?php if (defined('DOING_AJAX') && DOING_AJAX): ?>
        <script>
        jQuery(document).ready(function() {
            if (typeof CaptchaX !== 'undefined') {
                CaptchaX.init({
                    element: '#captchax-<?php echo esc_attr($scene); ?>-element',
                    scene: '<?php echo esc_attr($scene); ?>',
                    theme: '<?php echo esc_attr($theme); ?>',
                    type: '<?php echo esc_attr($captcha_type); ?>',
                    onSuccess: function(token) {
                        document.getElementById('captchax-token-<?php echo esc_attr($scene); ?>').value = token;
                        jQuery('#captchax-<?php echo esc_attr($scene); ?> .captchax-error').hide();
                    },
                    onError: function(error) {
                        console.error('CaptchaX Error:', error);
                    }
                });
            }
        });
        </script>
        <?php endif;
    }
    
    public function verify_comment_captcha($commentdata) {
        if (!get_option('captchax_enabled', '1')) return $commentdata;
        
        $enabled_forms = get_option('captchax_enabled_forms', []);
        if (!in_array('comment', $enabled_forms)) return $commentdata;
        if (is_user_logged_in() && get_option('captchax_skip_logged_in', '1')) return $commentdata;
        
        $token = sanitize_text_field($_POST['captchax_token'] ?? '');
        if (empty($token)) {
            wp_die(get_option('captchax_error_message', __('请先完成验证', 'captchax')));
        }
        
        $result = $this->api->verify($token, 'comment');
        if (!$result['success']) {
            wp_die(get_option('captchax_verify_failed_message', __('验证码验证失败', 'captchax')));
        }
        
        $this->verified_captchas['comment'] = true;
        return $commentdata;
    }
    
    public function verify_login_captcha($user, $username, $password) {
        if (!get_option('captchax_enabled', '1')) return $user;
        
        $enabled_forms = get_option('captchax_enabled_forms', []);
        if (!in_array('login', $enabled_forms)) return $user;
        
        if (is_wp_error($user)) return $user;
        
        $token = sanitize_text_field($_POST['captchax_token'] ?? '');
        if (empty($token)) {
            return new WP_Error('captchax_error', get_option('captchax_error_message', __('请先完成验证', 'captchax')));
        }
        
        $result = $this->api->verify($token, 'login');
        if (!$result['success']) {
            return new WP_Error('captchax_error', get_option('captchax_verify_failed_message', __('验证码验证失败', 'captchax')));
        }
        
        $this->verified_captchas['login'] = true;
        return $user;
    }
    
    public function verify_register_captcha($errors, $sanitized_user_login, $user_email) {
        if (!get_option('captchax_enabled', '1')) return $errors;
        
        $enabled_forms = get_option('captchax_enabled_forms', []);
        if (!in_array('register', $enabled_forms)) return $errors;
        
        $token = sanitize_text_field($_POST['captchax_token'] ?? '');
        if (empty($token)) {
            return new WP_Error('captchax_error', get_option('captchax_error_message', __('请先完成验证', 'captchax')));
        }
        
        $result = $this->api->verify($token, 'register');
        if (!$result['success']) {
            return new WP_Error('captchax_error', get_option('captchax_verify_failed_message', __('验证码验证失败', 'captchax')));
        }
        
        $this->verified_captchas['register'] = true;
        return $errors;
    }
    
    public function verify_lostpassword_captcha() {
        if (!get_option('captchax_enabled', '1')) return;
        
        $enabled_forms = get_option('captchax_enabled_forms', []);
        if (!in_array('lostpassword', $enabled_forms)) return;
        
        $token = sanitize_text_field($_POST['captchax_token'] ?? '');
        if (empty($token)) {
            wp_die(get_option('captchax_error_message', __('请先完成验证', 'captchax')));
        }
        
        $result = $this->api->verify($token, 'lostpassword');
        if (!$result['success']) {
            wp_die(get_option('captchax_verify_failed_message', __('验证码验证失败', 'captchax')));
        }
        
        $this->verified_captchas['lostpassword'] = true;
    }
    
    public function ajax_verify() {
        check_ajax_referer('captchax_verify', 'nonce');
        
        $token = sanitize_text_field($_POST['token'] ?? '');
        $scene = sanitize_text_field($_POST['scene'] ?? 'default');
        
        $result = $this->api->verify($token, $scene);
        
        if ($result['success']) {
            $this->verified_captchas[$scene] = true;
        }
        
        wp_send_json($result);
    }
    
    public function ajax_get_settings() {
        check_ajax_referer('captchax_verify', 'nonce');
        
        $settings = [
            'enabled' => (bool) get_option('captchax_enabled', '1'),
            'appId' => $this->api->get_app_id(),
            'scriptUrl' => $this->api->get_script_url(),
            'theme' => get_option('captchax_theme', 'light'),
            'captchaType' => get_option('captchax_captcha_type', 'slider'),
            'language' => get_option('captchax_language', 'zh-CN'),
            'enabledForms' => get_option('captchax_enabled_forms', [])
        ];
        
        wp_send_json($settings);
    }
    
    public function captcha_shortcode($atts) {
        $atts = shortcode_atts([
            'scene' => 'default',
            'theme' => '',
            'type' => ''
        ], $atts, 'captchax');
        
        if (!get_option('captchax_enabled', '1')) return '';
        
        ob_start();
        
        $scene = sanitize_text_field($atts['scene']);
        $theme = !empty($atts['theme']) ? sanitize_text_field($atts['theme']) : get_option('captchax_theme', 'light');
        $type = !empty($atts['type']) ? sanitize_text_field($atts['type']) : get_option('captchax_captcha_type', 'slider');
        $error_message = get_option('captchax_error_message', __('请先完成验证', 'captchax'));
        
        $container_class = ($theme === 'dark') ? 'captchax-container theme-' . $theme : 'captchax-container';
        ?>
        <div class="<?php echo esc_attr($container_class); ?>" id="captchax-<?php echo esc_attr($scene); ?>">
            <div id="captchax-<?php echo esc_attr($scene); ?>-element"></div>
            <input type="hidden" name="captchax_token" id="captchax-token-<?php echo esc_attr($scene); ?>" value="">
            <p class="captchax-error" style="display:none;">
                <?php echo esc_html($error_message); ?>
            </p>
        </div>
        <script>
        (function() {
            if (typeof jQuery !== 'undefined') {
                jQuery(document).ready(function() {
                    if (typeof CaptchaX !== 'undefined') {
                        CaptchaX.init({
                            element: '#captchax-<?php echo esc_attr($scene); ?>-element',
                            scene: '<?php echo esc_attr($scene); ?>',
                            theme: '<?php echo esc_attr($theme); ?>',
                            type: '<?php echo esc_attr($type); ?>',
                            onSuccess: function(token) {
                                document.getElementById('captchax-token-<?php echo esc_attr($scene); ?>').value = token;
                                jQuery('#captchax-<?php echo esc_attr($scene); ?> .captchax-error').hide();
                            },
                            onError: function(error) {
                                console.error('CaptchaX Error:', error);
                            }
                        });
                    }
                });
            }
        })();
        </script>
        <?php
        
        return ob_get_clean();
    }
    
    public function cf7_compat($html) {
        if (!get_option('captchax_contact_form_enabled', '0')) return $html;
        if (!get_option('captchax_enabled', '1')) return $html;
        
        $enabled_forms = get_option('captchax_enabled_forms', []);
        if (!in_array('contact', $enabled_forms)) return $html;
        
        ob_start();
        $this->render_captcha('contact');
        $captcha_html = ob_get_clean();
        
        return $html . $captcha_html;
    }
    
    public function cf7_validate($result, $tag) {
        if (!get_option('captchax_contact_form_enabled', '0')) return $result;
        if (!get_option('captchax_enabled', '1')) return $result;
        
        $enabled_forms = get_option('captchax_enabled_forms', []);
        if (!in_array('contact', $enabled_forms)) return $result;
        
        $token = sanitize_text_field($_POST['captchax_token'] ?? '');
        if (empty($token)) {
            $result->invalidate($tag, get_option('captchax_error_message', __('请先完成验证', 'captchax')));
            return $result;
        }
        
        $verify_result = $this->api->verify($token, 'contact');
        if (!$verify_result['success']) {
            $result->invalidate($tag, get_option('captchax_verify_failed_message', __('验证码验证失败', 'captchax')));
        }
        
        return $result;
    }
}
