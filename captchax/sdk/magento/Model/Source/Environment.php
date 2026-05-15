<?php
/**
 * Environment Source Model
 */

namespace CaptchaX\Captcha\Model\Source;

use Magento\Framework\Data\OptionSourceInterface;

class Environment implements OptionSourceInterface
{
    /**
     * Get available environments
     *
     * @return array
     */
    public function toOptionArray()
    {
        return [
            [
                'value' => 'development',
                'label' => __('Development')
            ],
            [
                'value' => 'production',
                'label' => __('Production')
            ]
        ];
    }
}
