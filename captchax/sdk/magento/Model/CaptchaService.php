<?php
/**
 * CaptchaX Captcha Verification Service
 */

namespace CaptchaX\Captcha\Model;

use CaptchaX\Captcha\Model\Config\Data as ConfigData;
use Magento\Framework\App\Request\Http;
use Magento\Framework\HTTP\Client\Curl;
use Magento\Framework\Serialize\Serializer\Json;
use Magento\Framework\Message\ManagerInterface;
use Psr\Log\LoggerInterface;

class CaptchaService
{
    /**
     * @var ConfigData
     */
    protected $configData;

    /**
     * @var Http
     */
    protected $request;

    /**
     * @var Curl
     */
    protected $curl;

    /**
     * @var Json
     */
    protected $json;

    /**
     * @var ManagerInterface
     */
    protected $messageManager;

    /**
     * @var LoggerInterface
     */
    protected $logger;

    /**
     * @param ConfigData $configData
     * @param Http $request
     * @param Curl $curl
     * @param Json $json
     * @param ManagerInterface $messageManager
     * @param LoggerInterface $logger
     */
    public function __construct(
        ConfigData $configData,
        Http $request,
        Curl $curl,
        Json $json,
        ManagerInterface $messageManager,
        LoggerInterface $logger
    ) {
        $this->configData = $configData;
        $this->request = $request;
        $this->curl = $curl;
        $this->json = $json;
        $this->messageManager = $messageManager;
        $this->logger = $logger;
    }

    /**
     * Verify captcha token
     *
     * @param string $token
     * @param int|string|null $storeId
     * @return bool
     */
    public function verify($token, $storeId = null)
    {
        if (!$this->configData->isEnabled($storeId)) {
            return true;
        }

        if (empty($token)) {
            $this->messageManager->addErrorMessage('Captcha verification failed. Please try again.');
            return false;
        }

        try {
            $secretKey = $this->configData->getSecretKey($storeId);
            $apiUrl = $this->configData->getApiUrl($storeId) . '/api/verify';

            $this->curl->setOption(CURLOPT_RETURNTRANSFER, true);
            $this->curl->setOption(CURLOPT_TIMEOUT, 30);
            $this->curl->post($apiUrl, [
                'secret' => $secretKey,
                'response' => $token
            ]);

            $response = $this->curl->getBody();
            $result = $this->json->unserialize($response);

            if (isset($result['success']) && $result['success'] === true) {
                return true;
            }

            $errorMsg = isset($result['error']) ? $result['error'] : 'Captcha verification failed';
            $this->messageManager->addErrorMessage($errorMsg);
            return false;

        } catch (\Exception $e) {
            $this->logger->error('CaptchaX verification error: ' . $e->getMessage());
            $this->messageManager->addErrorMessage('Captcha verification error. Please try again.');
            return false;
        }
    }

    /**
     * Generate captcha widget configuration
     *
     * @param int|string|null $storeId
     * @return array
     */
    public function getWidgetConfig($storeId = null)
    {
        $siteKey = $this->configData->getSiteKey($storeId);
        $apiUrl = $this->configData->getApiUrl($storeId);
        $defaultType = $this->configData->getDefaultCaptchaType($storeId);
        $enabledTypes = $this->configData->getEnabledCaptchaTypes($storeId);

        return [
            'siteKey' => $siteKey,
            'apiUrl' => $apiUrl,
            'defaultType' => $defaultType,
            'enabledTypes' => $enabledTypes,
            'isEnabled' => $this->configData->isEnabled($storeId)
        ];
    }
}
