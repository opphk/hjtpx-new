<?php
/**
 * CaptchaX Admin Configuration Block
 */

namespace CaptchaX\Captcha\Block\Adminhtml;

use Magento\Backend\Block\Template\Context;
use CaptchaX\Captcha\Model\Config\Data as ConfigData;

class Info extends \Magento\Backend\Block\Template
{
    /**
     * @var ConfigData
     */
    protected $configData;

    /**
     * @param Context $context
     * @param ConfigData $configData
     * @param array $data
     */
    public function __construct(
        Context $context,
        ConfigData $configData,
        array $data = []
    ) {
        $this->configData = $configData;
        parent::__construct($context, $data);
    }

    /**
     * Check if module is enabled
     *
     * @return bool
     */
    public function isEnabled()
    {
        return $this->configData->isEnabled();
    }

    /**
     * Get module version
     *
     * @return string
     */
    public function getModuleVersion()
    {
        return '1.0.0';
    }

    /**
     * Get documentation URL
     *
     * @return string
     */
    public function getDocumentationUrl()
    {
        return 'https://captchax.example.com/docs/magento';
    }

    /**
     * Get support URL
     *
     * @return string
     */
    public function getSupportUrl()
    {
        return 'https://captchax.example.com/support';
    }
}
