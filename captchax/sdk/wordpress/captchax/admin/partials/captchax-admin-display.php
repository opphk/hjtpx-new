<div class="wrap captchax-admin-wrap">
    <h1><?php echo esc_html(get_admin_page_title()); ?></h1>
    
    <div class="captchax-header">
        <div class="captchax-logo">
            <h2>CaptchaX</h2>
            <p><?php _e('现代化行为验证码系统', 'captchax'); ?></p>
        </div>
        <div class="captchax-version">
            <span><?php _e('版本', 'captchax'); ?>: <?php echo esc_html(CAPTCHAX_VERSION); ?></span>
        </div>
    </div>
    
    <div class="captchax-status">
        <?php
        $is_configured = !empty(get_option('captchax_api_key')) && !empty(get_option('captchax_api_secret'));
        $is_enabled = get_option('captchax_enabled', '1');
        $woo_active = class_exists('WooCommerce');
        ?>
        
        <div class="captchax-status-item <?php echo $is_configured ? 'active' : 'inactive'; ?>">
            <span class="dashicons <?php echo $is_configured ? 'dashicons-yes-alt' : 'dashicons-dismiss'; ?>"></span>
            <span><?php _e('API 配置', 'captchax'); ?></span>
        </div>
        
        <div class="captchax-status-item <?php echo $is_enabled ? 'active' : 'inactive'; ?>">
            <span class="dashicons <?php echo $is_enabled ? 'dashicons-yes-alt' : 'dashicons-dismiss'; ?>"></span>
            <span><?php _e('验证码功能', 'captchax'); ?></span>
        </div>
        
        <?php if ($woo_active): ?>
        <div class="captchax-status-item active">
            <span class="dashicons dashicons-yes-alt"></span>
            <span><?php _e('WooCommerce 已检测', 'captchax'); ?></span>
        </div>
        <?php else: ?>
        <div class="captchax-status-item">
            <span class="dashicons dashicons-minus"></span>
            <span><?php _e('WooCommerce 未检测', 'captchax'); ?></span>
        </div>
        <?php endif; ?>
    </div>
    
    <form method="post" action="options.php" class="captchax-settings-form">
        <?php settings_fields('captchax_settings_group'); ?>
        
        <div id="poststuff">
            <div id="post-body" class="metabox-holder columns-2">
                <div id="post-body-content">
                    <div class="postbox">
                        <h2 class="hndle"><span><?php _e('API 配置', 'captchax'); ?></span></h2>
                        <div class="inside">
                            <table class="form-table">
                                <tr>
                                    <th scope="row">
                                        <label for="captchax_api_key"><?php _e('API Key', 'captchax'); ?></label>
                                    </th>
                                    <td>
                                        <input type="text" id="captchax_api_key" name="captchax_api_key" 
                                               value="<?php echo esc_attr(get_option('captchax_api_key', '')); ?>" 
                                               class="regular-text">
                                        <p class="description"><?php _e('在 CaptchaX 控制台获取您的 App ID', 'captchax'); ?></p>
                                    </td>
                                </tr>
                                <tr>
                                    <th scope="row">
                                        <label for="captchax_api_secret"><?php _e('API Secret', 'captchax'); ?></label>
                                    </th>
                                    <td>
                                        <input type="password" id="captchax_api_secret" name="captchax_api_secret" 
                                               value="<?php echo esc_attr(get_option('captchax_api_secret', '')); ?>" 
                                               class="regular-text">
                                        <p class="description"><?php _e('API Secret 用于签名验证，请妥善保管', 'captchax'); ?></p>
                                    </td>
                                </tr>
                                <tr>
                                    <th scope="row">
                                        <label for="captchax_server_url"><?php _e('服务器地址', 'captchax'); ?></label>
                                    </th>
                                    <td>
                                        <input type="url" id="captchax_server_url" name="captchax_server_url" 
                                               value="<?php echo esc_attr(get_option('captchax_server_url', 'https://captchax.example.com')); ?>" 
                                               class="regular-text">
                                        <p class="description">
                                            <?php _e('开发环境', 'captchax'); ?>: <code>http://localhost:3000</code><br>
                                            <?php _e('生产环境', 'captchax'); ?>: <code>https://captchax.example.com</code>
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </div>
                    </div>
                    
                    <div class="postbox">
                        <h2 class="hndle"><span><?php _e('验证码设置', 'captchax'); ?></span></h2>
                        <div class="inside">
                            <table class="form-table">
                                <tr>
                                    <th scope="row">
                                        <label for="captchax_captcha_type"><?php _e('验证码类型', 'captchax'); ?></label>
                                    </th>
                                    <td>
                                        <select id="captchax_captcha_type" name="captchax_captcha_type">
                                            <option value="slider" <?php selected(get_option('captchax_captcha_type', 'slider'), 'slider'); ?>><?php _e('滑块验证', 'captchax'); ?></option>
                                            <option value="click" <?php selected(get_option('captchax_captcha_type', 'slider'), 'click'); ?>><?php _e('点选验证', 'captchax'); ?></option>
                                            <option value="puzzle" <?php selected(get_option('captchax_captcha_type', 'slider'), 'puzzle'); ?>><?php _e('拼图验证', 'captchax'); ?></option>
                                            <option value="rotate" <?php selected(get_option('captchax_captcha_type', 'slider'), 'rotate'); ?>><?php _e('旋转验证', 'captchax'); ?></option>
                                            <option value="text" <?php selected(get_option('captchax_captcha_type', 'slider'), 'text'); ?>><?php _e('文字验证', 'captchax'); ?></option>
                                        </select>
                                    </td>
                                </tr>
                                <tr>
                                    <th scope="row">
                                        <label for="captchax_theme"><?php _e('主题', 'captchax'); ?></label>
                                    </th>
                                    <td>
                                        <select id="captchax_theme" name="captchax_theme">
                                            <option value="light" <?php selected(get_option('captchax_theme', 'light'), 'light'); ?>><?php _e('浅色', 'captchax'); ?></option>
                                            <option value="dark" <?php selected(get_option('captchax_theme', 'light'), 'dark'); ?>><?php _e('深色', 'captchax'); ?></option>
                                        </select>
                                    </td>
                                </tr>
                                <tr>
                                    <th scope="row">
                                        <label for="captchax_language"><?php _e('语言', 'captchax'); ?></label>
                                    </th>
                                    <td>
                                        <select id="captchax_language" name="captchax_language">
                                            <option value="zh-CN" <?php selected(get_option('captchax_language', 'zh-CN'), 'zh-CN'); ?>>简体中文</option>
                                            <option value="en-US" <?php selected(get_option('captchax_language', 'zh-CN'), 'en-US'); ?>>English</option>
                                        </select>
                                    </td>
                                </tr>
                            </table>
                        </div>
                    </div>
                    
                    <div class="postbox">
                        <h2 class="hndle"><span><?php _e('表单设置', 'captchax'); ?></span></h2>
                        <div class="inside">
                            <table class="form-table">
                                <tr>
                                    <th scope="row">
                                        <label><?php _e('启用表单', 'captchax'); ?></label>
                                    </th>
                                    <td>
                                        <?php
                                        $enabled_forms = get_option('captchax_enabled_forms', ['comment', 'login', 'register', 'lostpassword', 'resetpassword']);
                                        $forms = [
                                            'comment' => __('评论表单', 'captchax'),
                                            'login' => __('登录表单', 'captchax'),
                                            'register' => __('注册表单', 'captchax'),
                                            'lostpassword' => __('找回密码表单', 'captchax'),
                                            'resetpassword' => __('重置密码表单', 'captchax'),
                                            'contact' => __('联系表单', 'captchax')
                                        ];
                                        
                                        foreach ($forms as $key => $label):
                                        ?>
                                        <label style="display: block; margin-bottom: 8px;">
                                            <input type="checkbox" name="captchax_enabled_forms[]" 
                                                   value="<?php echo esc_attr($key); ?>"
                                                   <?php checked(in_array($key, $enabled_forms)); ?>>
                                            <?php echo esc_html($label); ?>
                                        </label>
                                        <?php endforeach; ?>
                                    </td>
                                </tr>
                                <tr>
                                    <th scope="row">
                                        <label for="captchax_contact_form_enabled"><?php _e('联系表单集成', 'captchax'); ?></label>
                                    </th>
                                    <td>
                                        <label>
                                            <input type="checkbox" id="captchax_contact_form_enabled" 
                                                   name="captchax_contact_form_enabled" value="1"
                                                   <?php checked(get_option('captchax_contact_form_enabled', '0'), '1'); ?>>
                                            <?php _e('启用 Contact Form 7 集成', 'captchax'); ?>
                                        </label>
                                        <p class="description"><?php _e('启用后，验证码会自动附加到所有 Contact Form 7 表单', 'captchax'); ?></p>
                                    </td>
                                </tr>
                            </table>
                        </div>
                    </div>
                    
                    <div class="postbox">
                        <h2 class="hndle"><span><?php _e('常规设置', 'captchax'); ?></span></h2>
                        <div class="inside">
                            <table class="form-table">
                                <tr>
                                    <th scope="row">
                                        <label for="captchax_enabled"><?php _e('启用验证', 'captchax'); ?></label>
                                    </th>
                                    <td>
                                        <label>
                                            <input type="checkbox" id="captchax_enabled" 
                                                   name="captchax_enabled" value="1"
                                                   <?php checked(get_option('captchax_enabled', '1'), '1'); ?>>
                                            <?php _e('启用验证码功能', 'captchax'); ?>
                                        </label>
                                    </td>
                                </tr>
                                <tr>
                                    <th scope="row">
                                        <label for="captchax_skip_logged_in"><?php _e('已登录用户跳过验证', 'captchax'); ?></label>
                                    </th>
                                    <td>
                                        <label>
                                            <input type="checkbox" id="captchax_skip_logged_in" 
                                                   name="captchax_skip_logged_in" value="1"
                                                   <?php checked(get_option('captchax_skip_logged_in', '1'), '1'); ?>>
                                            <?php _e('已登录用户提交表单时跳过验证码', 'captchax'); ?>
                                        </label>
                                    </td>
                                </tr>
                                <tr>
                                    <th scope="row">
                                        <label for="captchax_error_message"><?php _e('错误消息', 'captchax'); ?></label>
                                    </th>
                                    <td>
                                        <input type="text" id="captchax_error_message" name="captchax_error_message" 
                                               value="<?php echo esc_attr(get_option('captchax_error_message', __('请先完成验证', 'captchax'))); ?>" 
                                               class="regular-text">
                                        <p class="description"><?php _e('用户未完成验证时显示的消息', 'captchax'); ?></p>
                                    </td>
                                </tr>
                                <tr>
                                    <th scope="row">
                                        <label for="captchax_verify_failed_message"><?php _e('验证失败消息', 'captchax'); ?></label>
                                    </th>
                                    <td>
                                        <input type="text" id="captchax_verify_failed_message" name="captchax_verify_failed_message" 
                                               value="<?php echo esc_attr(get_option('captchax_verify_failed_message', __('验证码验证失败', 'captchax'))); ?>" 
                                               class="regular-text">
                                        <p class="description"><?php _e('验证失败时显示的消息', 'captchax'); ?></p>
                                    </td>
                                </tr>
                            </table>
                        </div>
                    </div>
                    
                    <?php if (class_exists('WooCommerce')): ?>
                    <div class="postbox">
                        <h2 class="hndle"><span><?php _e('WooCommerce 设置', 'captchax'); ?></span></h2>
                        <div class="inside">
                            <table class="form-table">
                                <tr>
                                    <th scope="row">
                                        <label for="captchax_woo_checkout_enabled"><?php _e('结账页面', 'captchax'); ?></label>
                                    </th>
                                    <td>
                                        <label>
                                            <input type="checkbox" id="captchax_woo_checkout_enabled" 
                                                   name="captchax_woo_checkout_enabled" value="1"
                                                   <?php checked(get_option('captchax_woo_checkout_enabled', '1'), '1'); ?>>
                                            <?php _e('在结账页面启用验证码', 'captchax'); ?>
                                        </label>
                                    </td>
                                </tr>
                                <tr>
                                    <th scope="row">
                                        <label for="captchax_woo_login_enabled"><?php _e('登录页面', 'captchax'); ?></label>
                                    </th>
                                    <td>
                                        <label>
                                            <input type="checkbox" id="captchax_woo_login_enabled" 
                                                   name="captchax_woo_login_enabled" value="1"
                                                   <?php checked(get_option('captchax_woo_login_enabled', '1'), '1'); ?>>
                                            <?php _e('在账户登录页面启用验证码', 'captchax'); ?>
                                        </label>
                                    </td>
                                </tr>
                                <tr>
                                    <th scope="row">
                                        <label for="captchax_woo_register_enabled"><?php _e('注册页面', 'captchax'); ?></label>
                                    </th>
                                    <td>
                                        <label>
                                            <input type="checkbox" id="captchax_woo_register_enabled" 
                                                   name="captchax_woo_register_enabled" value="1"
                                                   <?php checked(get_option('captchax_woo_register_enabled', '1'), '1'); ?>>
                                            <?php _e('在账户注册页面启用验证码', 'captchax'); ?>
                                        </label>
                                    </td>
                                </tr>
                            </table>
                        </div>
                    </div>
                    <?php endif; ?>
                </div>
                
                <div id="postbox-container-1" class="postbox-container">
                    <div class="postbox">
                        <h2 class="hndle"><span><?php _e('快速操作', 'captchax'); ?></span></h2>
                        <div class="inside">
                            <p>
                                <input type="submit" name="captchax_save" class="button-primary button-large" 
                                       value="<?php esc_attr_e('保存设置', 'captchax'); ?>">
                            </p>
                            <hr>
                            <p>
                                <a href="https://captchax.com/docs" target="_blank" class="button">
                                    <?php _e('在线文档', 'captchax'); ?>
                                </a>
                            </p>
                            <p>
                                <a href="https://captchax.com/support" target="_blank" class="button">
                                    <?php _e('获取支持', 'captchax'); ?>
                                </a>
                            </p>
                        </div>
                    </div>
                    
                    <div class="postbox">
                        <h2 class="hndle"><span><?php _e('REST API', 'captchax'); ?></span></h2>
                        <div class="inside">
                            <p><strong><?php _e('验证接口', 'captchax'); ?>:</strong></p>
                            <code>POST /wp-json/captchax/v1/verify</code>
                            
                            <p><strong><?php _e('设置接口', 'captchax'); ?>:</strong></p>
                            <code>GET /wp-json/captchax/v1/settings</code>
                            
                            <p><strong><?php _e('状态接口', 'captchax'); ?>:</strong></p>
                            <code>GET /wp-json/captchax/v1/status</code>
                        </div>
                    </div>
                    
                    <div class="postbox">
                        <h2 class="hndle"><span><?php _e('短代码', 'captchax'); ?></span></h2>
                        <div class="inside">
                            <p><code>[captchax]</code></p>
                            <p class="description"><?php _e('基础验证码', 'captchax'); ?></p>
                            
                            <p><code>[captchax scene="custom"]</code></p>
                            <p class="description"><?php _e('指定场景名称', 'captchax'); ?></p>
                            
                            <p><code>[captchax theme="dark"]</code></p>
                            <p class="description"><?php _e('指定主题', 'captchax'); ?></p>
                            
                            <p><code>[captchax type="click"]</code></p>
                            <p class="description"><?php _e('指定验证类型', 'captchax'); ?></p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </form>
</div>

<style>
.captchax-admin-wrap {
    max-width: 1200px;
}

.captchax-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding: 20px;
    background: #fff;
    border: 1px solid #ddd;
    border-radius: 4px;
}

.captchax-logo h2 {
    margin: 0;
    font-size: 24px;
    color: #23282d;
}

.captchax-logo p {
    margin: 5px 0 0 0;
    color: #72777c;
}

.captchax-version {
    color: #72777c;
    font-size: 14px;
}

.captchax-status {
    display: flex;
    gap: 15px;
    margin-bottom: 20px;
}

.captchax-status-item {
    display: flex;
    align-items: center;
    padding: 8px 15px;
    background: #f0f0f0;
    border-radius: 4px;
    font-size: 13px;
}

.captchax-status-item.active .dashicons {
    color: #00a32a;
}

.captchax-status-item.inactive .dashicons {
    color: #dc3232;
}

.captchax-status-item .dashicons {
    margin-right: 5px;
}

.captchax-settings-form .postbox {
    margin-bottom: 20px;
}

.captchax-settings-form .hndle {
    padding: 12px 15px;
    font-size: 14px;
}
</style>
