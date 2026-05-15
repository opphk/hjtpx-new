<?php
/**
 * Customer Register Observer
 */

namespace CaptchaX\Captcha\Observer;

use CaptchaX\Captcha\Model\CaptchaService;
use CaptchaX\Captcha\Model\Config\Data as ConfigData;
use Magento\Framework\Event\Observer;
use Magento\Framework\Event\ObserverInterface;
use Magento\Framework\Message\ManagerInterface;
use Magento\Framework\App\Request\Http;

class CustomerRegister implements ObserverInterface
{
    /**
     * @var CaptchaService
     */
    protected $captchaService;

    /**
     * @var ConfigData
     */
    protected $configData;

    /**
     * @var ManagerInterface
     */
    protected $messageManager;

    /**
     * @var Http
     */
    protected $request;

    /**
     * @param CaptchaService $captchaService
     * @param ConfigData $configData
     * @param ManagerInterface $messageManager
     * @param Http $request
     */
    public function __construct(
        CaptchaService $captchaService,
        ConfigData $configData,
        ManagerInterface $messageManager,
        Http $request
    ) {
        $this->captchaService = $captchaService;
        $this->configData = $configData;
        $this->messageManager = $messageManager;
        $this->request = $request;
    }

    /**
     * Execute observer
     *
     * @param Observer $observer
     * @return void
     */
    public function execute(Observer $observer)
    {
        if (!$this->configData->isEnabled()) {
            return;
        }

        if (!$this->configData->isCustomerRegisterEnabled()) {
            return;
        }

        $token = $this->request->getParam('captcha_token');
        if (!$this->captchaService->verify($token)) {
            $event = $observer->getEvent();
            $controller = $event->getControllerAction();
            if ($controller) {
                $controller->getResponse()->setRedirect(
                    $this->_url->getUrl('customer/account/create')
                );
            }
        }
    }
}
