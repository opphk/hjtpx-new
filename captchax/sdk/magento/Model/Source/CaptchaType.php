<?php
/**
 * Captcha Types Source Model
 */

namespace CaptchaX\Captcha\Model\Source;

use Magento\Framework\Data\OptionSourceInterface;

class CaptchaType implements OptionSourceInterface
{
    /**
     * Get available captcha types
     *
     * @return array
     */
    public function getAvailableTypes()
    {
        return [
            'image' => [
                'value' => 'image',
                'label' => __('Image Verification (Image)'),
                'description' => __('Classic image-based captcha')
            ],
            'slider' => [
                'value' => 'slider',
                'label' => __('Slider Verification'),
                'description' => __('Slide to complete verification')
            ],
            'icon' => [
                'value' => 'icon',
                'label' => __('Icon Selection'),
                'description' => __('Select specific icons to verify')
            ],
            'point' => [
                'value' => 'point',
                'label' => __('Point Click'),
                'description' => __('Click on specific points in an image')
            ],
            'rotate' => [
                'value' => 'rotate',
                'label' => __('Image Rotation'),
                'description' => __('Rotate image to correct orientation')
            ],
            'voice' => [
                'value' => 'voice',
                'label' => __('Voice Verification'),
                'description' => __('Audio-based verification')
            ]
        ];
    }

    /**
     * Get options for dropdown
     *
     * @return array
     */
    public function toOptionArray()
    {
        $options = [];
        foreach ($this->getAvailableTypes() as $type) {
            $options[] = [
                'value' => $type['value'],
                'label' => $type['label']
            ];
        }
        return $options;
    }

    /**
     * Get options as key-value pairs
     *
     * @return array
     */
    public function toArray()
    {
        $options = [];
        foreach ($this->getAvailableTypes() as $type) {
            $options[$type['value']] = $type['label'];
        }
        return $options;
    }
}
