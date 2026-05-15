<?php

class CaptchaX_Admin {
    
    private $plugin_name;
    private $version;
    
    public function __construct($plugin_name, $version) {
        $this->plugin_name = $plugin_name;
        $this->version = $version;
    }
    
    public function add_plugin_admin_menu() {
        add_options_page(
            __('CaptchaX 设置', 'captchax'),
            'CaptchaX',
            'manage_options',
            'captchax',
            [$this, 'display_admin_page']
        );
    }
    
    public function register_settings() {
        register_setting('captchax_settings_group', 'captchax_api_key');
        register_setting('captchax_settings_group', 'captchax_api_secret');
        register_setting('captchax_settings_group', 'captchax_server_url');
        register_setting('captchax_settings_group', 'captchax_theme');
        register_setting('captchax_settings_group', 'captchax_captcha_type');
        register_setting('captchax_settings_group', 'captchax_language');
        register_setting('captchax_settings_group', 'captchax_enabled_forms');
        register_setting('captchax_settings_group', 'captchax_enabled');
        register_setting('captchax_settings_group', 'captchax_skip_logged_in');
        register_setting('captchax_settings_group', 'captchax_error_message');
        register_setting('captchax_settings_group', 'captchax_verify_failed_message');
        register_setting('captchax_settings_group', 'captchax_contact_form_enabled');
        register_setting('captchax_settings_group', 'captchax_woo_checkout_enabled');
        register_setting('captchax_settings_group', 'captchax_woo_login_enabled');
        register_setting('captchax_settings_group', 'captchax_woo_register_enabled');
        
        add_settings_section(
            'captchax_api_section',
            __('API 配置', 'captchax'),
            [$this, 'api_section_callback'],
            'captchax'
        );
        
        add_settings_field(
            'captchax_api_key',
            __('API Key', 'captchax'),
            [$this, 'api_key_callback'],
            'captchax',
            'captchax_api_section'
        );
        
        add_settings_field(
            'captchax_api_secret',
            __('API Secret', 'captchax'),
            [$this, 'api_secret_callback'],
            'captchax',
            'captchax_api_section'
        );
        
        add_settings_field(
            'captchax_server_url',
            __('服务器地址', 'captchax'),
            [$this, 'server_url_callback'],
            'captchax',
            'captchax_api_section'
        );
        
        add_settings_section(
            'captchax_captcha_section',
            __('验证码设置', 'captchax'),
            [$this, 'captcha_section_callback'],
            'captchax'
        );
        
        add_settings_field(
            'captchax_captcha_type',
            __('验证码类型', 'captchax'),
            [$this, 'captcha_type_callback'],
            'captchax',
            'captchax_captcha_section'
        );
        
        add_settings_field(
            'captchax_theme',
            __('主题', 'captchax'),
            [$this, 'theme_callback'],
            'captchax',
            'captchax_captcha_section'
        );
        
        add_settings_field(
            'captchax_language',
            __('语言', 'captchax'),
            [$this, 'language_callback'],
            'captchax',
            'captchax_captcha_section'
        );
        
        add_settings_section(
            'captchax_forms_section',
            __('表单设置', 'captchax'),
            [$this, 'forms_section_callback'],
            'captchax'
        );
        
        add_settings_field(
            'captchax_enabled_forms',
            __('启用表单', 'captchax'),
            [$this, 'enabled_forms_callback'],
            'captchax',
            'captchax_forms_section'
        );
        
        add_settings_field(
            'captchax_contact_form_enabled',
            __('联系表单集成', 'captchax'),
            [$this, 'contact_form_callback'],
            'captchax',
            'captchax_forms_section'
        );
        
        add_settings_section(
            'captchax_general_section',
            __('常规设置', 'captchax'),
            [$this, 'general_section_callback'],
            'captchax'
        );
        
        add_settings_field(
            'captchax_enabled',
            __('启用验证', 'captchax'),
            [$this, 'enabled_callback'],
            'captchax',
            'captchax_general_section'
        );
        
        add_settings_field(
            'captchax_skip_logged_in',
            __('已登录用户跳过验证', 'captchax'),
            [$this, 'skip_logged_in_callback'],
            'captchax',
            'captchax_general_section'
        );
        
        add_settings_field(
            'captchax_error_message',
            __('错误消息', 'captchax'),
            [$this, 'error_message_callback'],
            'captchax',
            'captchax_general_section'
        );
        
        add_settings_field(
            'captchax_verify_failed_message',
            __('验证失败消息', 'captchax'),
            [$this, 'verify_failed_message_callback'],
            'captchax',
            'captchax_general_section'
        );
        
        if (class_exists('WooCommerce')) {
            add_settings_section(
                'captchax_woo_section',
                __('WooCommerce 设置', 'captchax'),
                [$this, 'woo_section_callback'],
                'captchax'
            );
            
            add_settings_field(
                'captchax_woo_checkout_enabled',
                __('结账页面', 'captchax'),
                [$this, 'woo_checkout_callback'],
                'captchax',
                'captchax_woo_section'
            );
            
            add_settings_field(
                'captchax_woo_login_enabled',
                __('登录页面', 'captchax'),
                [$this, 'woo_login_callback'],
                'captchax',
                'captchax_woo_section'
            );
            
            add_settings_field(
                'captchax_woo_register_enabled',
                __('注册页面', 'captchax'),
                [$this, 'woo_register_callback'],
                'captchax',
                'captchax_woo_section'
            );
        }
    }
    
    public function api_section_callback() {
        echo '<p>' . __('配置 CaptchaX API 凭证以连接验证服务器', 'captchax') . '</p>';
    }
    
    public function api_key_callback() {
        $value = get_option('captchax_api_key', '');
        echo '<input type="text" name="captchax_api_key" value="' . esc_attr($value) . '" class="regular-text" placeholder="输入您的 API Key">';
        echo '<p class="description">在 CaptchaX 控制台获取您的 App ID</p>';
    }
    
    public function api_secret_callback() {
        $value = get_option('captchax_api_secret', '');
        echo '<input type="password" name="captchax_api_secret" value="' . esc_attr($value) . '" class="regular-text" placeholder="输入您的 API Secret">';
        echo '<p class="description">API Secret 用于签名验证，请妥善保管</p>';
    }
    
    public function server_url_callback() {
        $value = get_option('captchax_server_url', 'https://captchax.example.com');
        echo '<input type="url" name="captchax_server_url" value="' . esc_attr($value) . '" class="regular-text">';
        echo '<p class="description">开发环境: <code>http://localhost:3000</code> | 生产环境: <code>https://captchax.example.com</code></p>';
    }
    
    public function captcha_section_callback() {
        echo '<p>' . __('配置验证码的外观和行为', 'captchax') . '</p>';
    }
    
    public function captcha_type_callback() {
        $value = get_option('captchax_captcha_type', 'slider');
        ?>
        <select name="captchax_captcha_type">
            <option value="slider" <?php selected($value, 'slider'); ?>><?php _e('滑块验证', 'captchax'); ?></option>
            <option value="click" <?php selected($value, 'click'); ?>><?php _e('点选验证', 'captchax'); ?></option>
            <option value="puzzle" <?php selected($value, 'puzzle'); ?>><?php _e('拼图验证', 'captchax'); ?></option>
            <option value="rotate" <?php selected($value, 'rotate'); ?>><?php _e('旋转验证', 'captchax'); ?></option>
            <option value="text" <?php selected($value, 'text'); ?>><?php _e('文字验证', 'captchax'); ?></option>
        </select>
        <?php
    }
    
    public function theme_callback() {
        $value = get_option('captchax_theme', 'light');
        ?>
        <select name="captchax_theme">
            <option value="light" <?php selected($value, 'light'); ?>><?php _e('浅色', 'captchax'); ?></option>
            <option value="dark" <?php selected($value, 'dark'); ?>><?php _e('深色', 'captchax'); ?></option>
        </select>
        <?php
    }
    
    public function language_callback() {
        $value = get_option('captchax_language', 'zh-CN');
        ?>
        <select name="captchax_language">
            <option value="zh-CN" <?php selected($value, 'zh-CN'); ?>>简体中文</option>
            <option value="en-US" <?php selected($value, 'en-US'); ?>>English</option>
        </select>
        <?php
    }
    
    public function forms_section_callback() {
        echo '<p>' . __('选择哪些表单需要启用验证码保护', 'captchax') . '</p>';
    }
    
    public function enabled_forms_callback() {
        $enabled_forms = get_option('captchax_enabled_forms', ['comment', 'login', 'register', 'lostpassword', 'resetpassword']);
        $forms = [
            'comment' => __('评论表单', 'captchax'),
            'login' => __('登录表单', 'captchax'),
            'register' => __('注册表单', 'captchax'),
            'lostpassword' => __('找回密码表单', 'captchax'),
            'resetpassword' => __('重置密码表单', 'captchax'),
            'contact' => __('联系表单', 'captchax')
        ];
        
        foreach ($forms as $key => $label) {
            echo '<label style="margin-right: 15px;">';
            echo '<input type="checkbox" name="captchax_enabled_forms[]" value="' . esc_attr($key) . '"';
            checked(in_array($key, $enabled_forms));
            echo '> ' . esc_html($label);
            echo '</label>';
        }
    }
    
    public function contact_form_callback() {
        $value = get_option('captchax_contact_form_enabled', '0');
        echo '<label>';
        echo '<input type="checkbox" name="captchax_contact_form_enabled" value="1"';
        checked($value, '1');
        echo '> ' . __('启用 Contact Form 7 集成', 'captchax');
        echo '</label>';
        echo '<p class="description">启用后，验证码会自动附加到所有 Contact Form 7 表单</p>';
    }
    
    public function general_section_callback() {
        echo '<p>' . __('插件的常规设置', 'captchax') . '</p>';
    }
    
    public function enabled_callback() {
        $value = get_option('captchax_enabled', '1');
        echo '<label>';
        echo '<input type="checkbox" name="captchax_enabled" value="1"';
        checked($value, '1');
        echo '> ' . __('启用验证码功能', 'captchax');
        echo '</label>';
    }
    
    public function skip_logged_in_callback() {
        $value = get_option('captchax_skip_logged_in', '1');
        echo '<label>';
        echo '<input type="checkbox" name="captchax_skip_logged_in" value="1"';
        checked($value, '1');
        echo '> ' . __('已登录用户提交表单时跳过验证码', 'captchax');
        echo '</label>';
    }
    
    public function error_message_callback() {
        $value = get_option('captchax_error_message', __('请先完成验证', 'captchax'));
        echo '<input type="text" name="captchax_error_message" value="' . esc_attr($value) . '" class="regular-text">';
        echo '<p class="description">用户未完成验证时显示的消息</p>';
    }
    
    public function verify_failed_message_callback() {
        $value = get_option('captchax_verify_failed_message', __('验证码验证失败', 'captchax'));
        echo '<input type="text" name="captchax_verify_failed_message" value="' . esc_attr($value) . '" class="regular-text">';
        echo '<p class="description">验证失败时显示的消息</p>';
    }
    
    public function woo_section_callback() {
        echo '<p>' . __('WooCommerce 集成设置', 'captchax') . '</p>';
    }
    
    public function woo_checkout_callback() {
        $value = get_option('captchax_woo_checkout_enabled', '1');
        echo '<label>';
        echo '<input type="checkbox" name="captchax_woo_checkout_enabled" value="1"';
        checked($value, '1');
        echo '> ' . __('在结账页面启用验证码', 'captchax');
        echo '</label>';
    }
    
    public function woo_login_callback() {
        $value = get_option('captchax_woo_login_enabled', '1');
        echo '<label>';
        echo '<input type="checkbox" name="captchax_woo_login_enabled" value="1"';
        checked($value, '1');
        echo '> ' . __('在账户登录页面启用验证码', 'captchax');
        echo '</label>';
    }
    
    public function woo_register_callback() {
        $value = get_option('captchax_woo_register_enabled', '1');
        echo '<label>';
        echo '<input type="checkbox" name="captchax_woo_register_enabled" value="1"';
        checked($value, '1');
        echo '> ' . __('在账户注册页面启用验证码', 'captchax');
        echo '</label>';
    }
    
    public function display_admin_page() {
        if (!current_user_can('manage_options')) {
            return;
        }
        
        if (isset($_POST['captchax_save'])) {
            check_admin_referer('captchax_settings');
            
            update_option('captchax_api_key', sanitize_text_field($_POST['captchax_api_key'] ?? ''));
            update_option('captchax_api_secret', sanitize_text_field($_POST['captchax_api_secret'] ?? ''));
            update_option('captchax_server_url', esc_url_raw($_POST['captchax_server_url'] ?? ''));
            update_option('captchax_theme', sanitize_text_field($_POST['captchax_theme'] ?? 'light'));
            update_option('captchax_captcha_type', sanitize_text_field($_POST['captchax_captcha_type'] ?? 'slider'));
            update_option('captchax_language', sanitize_text_field($_POST['captchax_language'] ?? 'zh-CN'));
            update_option('captchax_enabled_forms', array_map('sanitize_text_field', $_POST['captchax_enabled_forms'] ?? []));
            update_option('captchax_enabled', isset($_POST['captchax_enabled']) ? '1' : '0');
            update_option('captchax_skip_logged_in', isset($_POST['captchax_skip_logged_in']) ? '1' : '0');
            update_option('captchax_error_message', sanitize_text_field($_POST['captchax_error_message'] ?? ''));
            update_option('captchax_verify_failed_message', sanitize_text_field($_POST['captchax_verify_failed_message'] ?? ''));
            update_option('captchax_contact_form_enabled', isset($_POST['captchax_contact_form_enabled']) ? '1' : '0');
            update_option('captchax_woo_checkout_enabled', isset($_POST['captchax_woo_checkout_enabled']) ? '1' : '0');
            update_option('captchax_woo_login_enabled', isset($_POST['captchax_woo_login_enabled']) ? '1' : '0');
            update_option('captchax_woo_register_enabled', isset($_POST['captchax_woo_register_enabled']) ? '1' : '0');
            
            echo '<div class="updated"><p>' . __('设置已保存', 'captchax') . '</p></div>';
        }
        
        include CAPTCHAX_PLUGIN_DIR . 'admin/partials/captchax-admin-display.php';
    }
    
    public function enqueue_styles($hook) {
        if (strpos($hook, 'captchax') === false) {
            return;
        }
        
        wp_enqueue_style(
            $this->plugin_name . '-admin',
            CAPTCHAX_PLUGIN_URL . 'admin/css/captchax-admin.css',
            [],
            $this->version
        );
    }
    
    public function enqueue_scripts($hook) {
        if (strpos($hook, 'captchax') === false) {
            return;
        }
        
        wp_enqueue_script(
            $this->plugin_name . '-admin',
            CAPTCHAX_PLUGIN_URL . 'admin/js/captchax-admin.js',
            ['jquery'],
            $this->version,
            true
        );
        
        wp_localize_script($this->plugin_name . '-admin', 'captchaxAdmin', [
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('captchax_admin_nonce')
        ]);
    }
}
