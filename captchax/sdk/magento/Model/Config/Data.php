<?php
/**
 * CaptchaX Configuration Model
 */

namespace CaptchaX\Captcha\Model\Config;

use Magento\Framework\App\Config\ScopeConfigInterface;
use Magento\Framework\DataObject;
use Magento\Store\Model\ScopeInterface;

class Data extends DataObject
{
    const XML_PATH_ENABLED = 'captchax/general/enabled';
    const XML_PATH_ENVIRONMENT = 'captchax/general/environment';
    const XML_PATH_SITE_KEY = 'captchax/general/site_key';
    const XML_PATH_SECRET_KEY = 'captchax/general/secret_key';
    const XML_PATH_API_URL_DEV = 'captchax/general/api_url_dev';
    const XML_PATH_API_URL_PROD = 'captchax/general/api_url_prod';

    const XML_PATH_CUSTOMER_LOGIN = 'captchax/forms/customer_login';
    const XML_PATH_CUSTOMER_REGISTER = 'captchax/forms/customer_register';
    const XML_PATH_CONTACT_FORM = 'captchax/forms/contact_form';
    const XML_PATH_REVIEW = 'captchax/forms/review';

    const XML_PATH_DEFAULT_TYPE = 'captchax/captcha_types/default_type';
    const XML_PATH_TYPE_IMAGE = 'captchax/captcha_types/image';
    const XML_PATH_TYPE_SLIDER = 'captchax/captcha_types/slider';
    const XML_PATH_TYPE_ICON = 'captchax/captcha_types/icon';
    const XML_PATH_TYPE_POINT = 'captchax/captcha_types/point';
    const XML_PATH_TYPE_ROTATE = 'captchax/captcha_types/rotate';
    const XML_PATH_TYPE_VOICE = 'captchax/captcha_types/voice';

    /**
     * @var ScopeConfigInterface
     */
    protected $scopeConfig;

    /**
     * @param ScopeConfigInterface $scopeConfig
     * @param array $data
     */
    public function __construct(
        ScopeConfigInterface $scopeConfig,
        array $data = []
    ) {
        $this->scopeConfig = $scopeConfig;
        parent::__construct($data);
    }

    /**
     * Get configuration value
     *
     * @param string $path
     * @param int|string|null $storeId
     * @return mixed
     */
    public function getConfigValue($path, $storeId = null)
    {
        return $this->scopeConfig->getValue(
            $path,
            ScopeInterface::SCOPE_STORE,
            $storeId
        );
    }

    /**
     * Check if module is enabled
     *
     * @param int|string|null $storeId
     * @return bool
     */
    public function isEnabled($storeId = null)
    {
        return (bool)$this->getConfigValue(self::XML_PATH_ENABLED, $storeId);
    }

    /**
     * Get environment setting
     *
     * @param int|string|null $storeId
     * @return string
     */
    public function getEnvironment($storeId = null)
    {
        return $this->getConfigValue(self::XML_PATH_ENVIRONMENT, $storeId);
    }

    /**
     * Get site key
     *
     * @param int|string|null $storeId
     * @return string
     */
    public function getSiteKey($storeId = null)
    {
        return $this->getConfigValue(self::XML_PATH_SITE_KEY, $storeId);
    }

    /**
     * Get secret key
     *
     * @param int|string|null $storeId
     * @return string
     */
    public function getSecretKey($storeId = null)
    {
        return $this->getConfigValue(self::XML_PATH_SECRET_KEY, $storeId);
    }

    /**
     * Get API URL based on environment
     *
     * @param int|string|null $storeId
     * @return string
     */
    public function getApiUrl($storeId = null)
    {
        $environment = $this->getEnvironment($storeId);
        if ($environment === 'production') {
            return $this->getConfigValue(self::XML_PATH_API_URL_PROD, $storeId);
        }
        return $this->getConfigValue(self::XML_PATH_API_URL_DEV, $storeId);
    }

    /**
     * Check if customer login captcha is enabled
     *
     * @param int|string|null $storeId
     * @return bool
     */
    public function isCustomerLoginEnabled($storeId = null)
    {
        return (bool)$this->getConfigValue(self::XML_PATH_CUSTOMER_LOGIN, $storeId);
    }

    /**
     * Check if customer register captcha is enabled
     *
     * @param int|string|null $storeId
     * @return bool
     */
    public function isCustomerRegisterEnabled($storeId = null)
    {
        return (bool)$this->getConfigValue(self::XML_PATH_CUSTOMER_REGISTER, $storeId);
    }

    /**
     * Check if contact form captcha is enabled
     *
     * @param int|string|null $storeId
     * @return bool
     */
    public function isContactFormEnabled($storeId = null)
    {
        return (bool)$this->getConfigValue(self::XML_PATH_CONTACT_FORM, $storeId);
    }

    /**
     * Check if review captcha is enabled
     *
     * @param int|string|null $storeId
     * @return bool
     */
    public function isReviewEnabled($storeId = null)
    {
        return (bool)$this->getConfigValue(self::XML_PATH_REVIEW, $storeId);
    }

    /**
     * Get default captcha type
     *
     * @param int|string|null $storeId
     * @return string
     */
    public function getDefaultCaptchaType($storeId = null)
    {
        return $this->getConfigValue(self::XML_PATH_DEFAULT_TYPE, $storeId) ?: 'image';
    }

    /**
     * Get enabled captcha types
     *
     * @param int|string|null $storeId
     * @return array
     */
    public function getEnabledCaptchaTypes($storeId = null)
    {
        $types = [];
        if ($this->getConfigValue(self::XML_PATH_TYPE_IMAGE, $storeId)) {
            $types[] = 'image';
        }
        if ($this->getConfigValue(self::XML_PATH_TYPE_SLIDER, $storeId)) {
            $types[] = 'slider';
        }
        if ($this->getConfigValue(self::XML_PATH_TYPE_ICON, $storeId)) {
            $types[] = 'icon';
        }
        if ($this->getConfigValue(self::XML_PATH_TYPE_POINT, $storeId)) {
            $types[] = 'point';
        }
        if ($this->getConfigValue(self::XML_PATH_TYPE_ROTATE, $storeId)) {
            $types[] = 'rotate';
        }
        if ($this->getConfigValue(self::XML_PATH_TYPE_VOICE, $storeId)) {
            $types[] = 'voice';
        }
        return $types;
    }
}
