<?php
/**
 * Plugin Name: CaptchaX - 行为验证码
 * Plugin URI: https://github.com/opphk/hjtpx
 * Description: CaptchaX 现代化行为验证码系统，支持滑块、点选、拼图等多种验证方式，全面保护 WordPress 网站安全
 * Version: 1.1.0
 * Author: CaptchaX Team
 * Author URI: https://captchax.com
 * License: GPL v2 or later
 * Text Domain: captchax
 * Domain Path: /languages
 * Requires at least: 5.0
 * Requires PHP: 7.4
 */

if (!defined('ABSPATH')) {
    exit;
}

define('CAPTCHAX_VERSION', '1.1.0');
define('CAPTCHAX_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('CAPTCHAX_PLUGIN_URL', plugin_dir_url(__FILE__));
define('CAPTCHAX_PLUGIN_BASENAME', plugin_basename(__FILE__));
define('CAPTCHAX_API_DEV_URL', 'http://localhost:3000');
define('CAPTCHAX_API_PROD_URL', 'https://captchax.example.com');

class CaptchaX {
    
    protected $loader;
    protected $plugin_name;
    protected $version;
    protected $woo_enabled;
    
    public function __construct() {
        $this->version = CAPTCHAX_VERSION;
        $this->plugin_name = 'captchax';
        $this->woo_enabled = class_exists('WooCommerce');
        
        $this->load_dependencies();
        $this->set_locale();
        $this->define_admin_hooks();
        $this->define_public_hooks();
        $this->define_rest_api_hooks();
        
        if ($this->woo_enabled) {
            $this->define_woocommerce_hooks();
        }
    }
    
    private function load_dependencies() {
        require_once CAPTCHAX_PLUGIN_DIR . 'includes/class-captchax-loader.php';
        require_once CAPTCHAX_PLUGIN_DIR . 'admin/class-captchax-admin.php';
        require_once CAPTCHAX_PLUGIN_DIR . 'includes/class-captchax-public.php';
        require_once CAPTCHAX_PLUGIN_DIR . 'includes/class-captchax-rest-api.php';
        
        if ($this->woo_enabled) {
            require_once CAPTCHAX_PLUGIN_DIR . 'includes/class-captchax-woocommerce.php';
        }
        
        $this->loader = new CaptchaX_Loader();
    }
    
    private function set_locale() {
        $plugin_i18n = new CaptchaX_i18n();
        $this->loader->add_action('plugins_loaded', $plugin_i18n, 'load_plugin_textdomain');
    }
    
    private function define_admin_hooks() {
        $admin = new CaptchaX_Admin($this->get_plugin_name(), $this->get_version());
        
        $this->loader->add_action('admin_menu', $admin, 'add_plugin_admin_menu');
        $this->loader->add_action('admin_enqueue_scripts', $admin, 'enqueue_styles');
        $this->loader->add_action('admin_enqueue_scripts', $admin, 'enqueue_scripts');
        $this->loader->add_action('admin_init', $admin, 'register_settings');
    }
    
    private function define_public_hooks() {
        $public = new CaptchaX_Public($this->get_plugin_name(), $this->get_version());
        
        $this->loader->add_action('comment_form_after_fields', $public, 'add_captcha_to_comment_form');
        $this->loader->add_filter('preprocess_comment', $public, 'verify_comment_captcha', 5);
        
        $this->loader->add_action('login_form', $public, 'add_captcha_to_login_form');
        $this->loader->add_filter('authenticate', $public, 'verify_login_captcha', 30, 3);
        
        $this->loader->add_action('register_form', $public, 'add_captcha_to_register_form');
        $this->loader->add_filter('registration_errors', $public, 'verify_register_captcha', 10, 3);
        
        $this->loader->add_action('lostpassword_form', $public, 'add_captcha_to_lostpassword_form');
        $this->loader->add_action('lostpassword_post', $public, 'verify_lostpassword_captcha');
        
        $this->loader->add_action('resetpass_form', $public, 'add_captcha_to_resetpass_form');
        $this->loader->add_action('password_reset', $public, 'verify_resetpass_captcha', 10, 2);
        
        $this->loader->add_action('wp_enqueue_scripts', $public, 'enqueue_styles');
        $this->loader->add_action('wp_enqueue_scripts', $public, 'enqueue_scripts');
        
        $this->loader->add_action('wp_ajax_captchax_verify', $public, 'ajax_verify');
        $this->loader->add_action('wp_ajax_nopriv_captchax_verify', $public, 'ajax_verify');
        $this->loader->add_action('wp_ajax_captchax_get_settings', $public, 'ajax_get_settings');
        $this->loader->add_action('wp_ajax_nopriv_captchax_get_settings', $public, 'ajax_get_settings');
        
        $this->loader->add_shortcode('captchax', $public, 'captcha_shortcode');
    }
    
    private function define_rest_api_hooks() {
        $rest = new CaptchaX_REST_API($this->get_plugin_name(), $this->get_version());
        
        $this->loader->add_action('rest_api_init', $rest, 'register_routes');
    }
    
    private function define_woocommerce_hooks() {
        $woo = new CaptchaX_WooCommerce($this->get_plugin_name(), $this->get_version());
        
        $this->loader->add_action('woocommerce_login_form', $woo, 'add_captcha_to_woo_login');
        $this->loader->add_filter('woocommerce_process_login_errors', $woo, 'verify_woo_login', 10, 3);
        
        $this->loader->add_action('woocommerce_register_form', $woo, 'add_captcha_to_woo_register');
        $this->loader->add_filter('woocommerce_registration_errors', $woo, 'verify_woo_register', 10, 3);
        
        $this->loader->add_action('woocommerce_checkout_before_customer_details', $woo, 'add_captcha_to_woo_checkout');
        $this->loader->add_filter('woocommerce_after_checkout_validation', $woo, 'verify_woo_checkout', 10, 2);
        
        $this->loader->add_action('woocommerce_review_order_before_submit', $woo, 'add_captcha_to_woo_checkout_short');
        $this->loader->add_action('woocommerce_after_checkout_validation', $woo, 'verify_woo_checkout_short', 10, 2);
        
        $this->loader->add_action('woocommerce_lostpassword_form', $woo, 'add_captcha_to_woo_lostpassword');
        $this->loader->add_action('woocommerce_resetpassword_form', $woo, 'add_captcha_to_woo_resetpassword');
    }
    
    public function run() {
        $this->loader->run();
    }
    
    public function get_plugin_name() {
        return $this->plugin_name;
    }
    
    public function get_version() {
        return $this->version;
    }
    
    public function is_woocommerce_active() {
        return $this->woo_enabled;
    }
}

class CaptchaX_i18n {
    public function load_plugin_textdomain() {
        load_plugin_textdomain(
            'captchax',
            false,
            dirname(CAPTCHAX_PLUGIN_BASENAME) . '/languages/'
        );
    }
}

function run_captchax() {
    $plugin = new CaptchaX();
    $plugin->run();
}
run_captchax();

register_activation_hook(__FILE__, 'captchax_activate');
function captchax_activate() {
    if (!get_option('captchax_activated_once')) {
        add_option('captchax_api_key', '');
        add_option('captchax_api_secret', '');
        add_option('captchax_server_url', CAPTCHAX_API_PROD_URL);
        add_option('captchax_enabled_forms', ['comment', 'login', 'register', 'lostpassword', 'resetpassword']);
        add_option('captchax_theme', 'light');
        add_option('captchax_captcha_type', 'slider');
        add_option('captchax_language', 'zh-CN');
        add_option('captchax_error_message', __('请先完成验证', 'captchax'));
        add_option('captchax_verify_failed_message', __('验证码验证失败', 'captchax'));
        add_option('captchax_enabled', '1');
        add_option('captchax_contact_form_enabled', '0');
        add_option('captchax_contact_form_priority', '30');
        add_option('captchax_woo_checkout_enabled', '1');
        add_option('captchax_woo_login_enabled', '1');
        add_option('captchax_woo_register_enabled', '1');
        add_option('captchax_activated_once', '1');
    }
    
    flush_rewrite_rules();
}

register_deactivation_hook(__FILE__, 'captchax_deactivate');
function captchax_deactivate() {
    flush_rewrite_rules();
}
