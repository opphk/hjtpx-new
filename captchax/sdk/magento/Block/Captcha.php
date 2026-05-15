<?php
/**
 * CaptchaX Captcha Block
 */

namespace CaptchaX\Captcha\Block;

use CaptchaX\Captcha\Model\Config\Data as ConfigData;
use CaptchaX\Captcha\Model\CaptchaService;
use Magento\Framework\View\Element\Template;
use Magento\Framework\View\Element\Template\Context;

class Captcha extends Template
{
    /**
     * @var ConfigData
     */
    protected $configData;

    /**
     * @var CaptchaService
     */
    protected $captchaService;

    /**
     * @param Context $context
     * @param ConfigData $configData
     * @param CaptchaService $captchaService
     * @param array $data
     */
    public function __construct(
        Context $context,
        ConfigData $configData,
        CaptchaService $captchaService,
        array $data = []
    ) {
        $this->configData = $configData;
        $this->captchaService = $captchaService;
        parent::__construct($context, $data);
    }

    /**
     * Check if captcha is enabled
     *
     * @return bool
     */
    public function isEnabled()
    {
        return $this->configData->isEnabled($this->getStoreId());
    }

    /**
     * Get widget configuration
     *
     * @return array
     */
    public function getWidgetConfig()
    {
        return $this->captchaService->getWidgetConfig($this->getStoreId());
    }

    /**
     * Get site key
     *
     * @return string
     */
    public function getSiteKey()
    {
        return $this->configData->getSiteKey($this->getStoreId());
    }

    /**
     * Get API URL
     *
     * @return string
     */
    public function getApiUrl()
    {
        return $this->configData->getApiUrl($this->getStoreId());
    }

    /**
     * Get current store ID
     *
     * @return int|string|null
     */
    protected function getStoreId()
    {
        return $this->_storeManager->getStore()->getId();
    }

    /**
     * Get captcha container ID
     *
     * @return string
     */
    public function getContainerId()
    {
        return $this->getData('container_id') ?: 'captchax-container';
    }

    /**
     * Get captcha type
     *
     * @return string
     */
    public function getCaptchaType()
    {
        return $this->getData('captcha_type') ?: 'image';
    }

    /**
     * Get input field name for token
     *
     * @return string
     */
    public function getTokenName()
    {
        return $this->getData('token_name') ?: 'captcha_token';
    }

    /**
     * Check if specific form is enabled
     *
     * @param string $form
     * @return bool
     */
    public function isFormEnabled($form)
    {
        $method = 'is' . ucfirst($form) . 'Enabled';
        if (method_exists($this->configData, $method)) {
            return $this->configData->$method($this->getStoreId());
        }
        return false;
    }

    /**
     * Get captcha widget initialization code
     *
     * @return string
     */
    public function getWidgetScript()
    {
        $config = $this->getWidgetConfig();
        return json_encode($config);
    }
}
