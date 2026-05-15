<?php

declare(strict_types=1);

namespace CaptchaX\SDK\Tests;

use CaptchaX\SDK\CaptchaConfig;
use CaptchaX\SDK\CaptchaXClient;
use CaptchaX\SDK\CaptchaXException;
use CaptchaX\SDK\CharPosition;
use PHPUnit\Framework\TestCase;

class IntegrationTest extends TestCase
{
    private const DEV_BASE_URL = 'http://localhost:3000';
    private const PROD_BASE_URL = 'https://captchax.example.com';
    private const TEST_APP_ID = 'test-app-integration';
    private const TEST_TIMEOUT = 5000;
    private const TEST_RETRY_TIMES = 2;
    
    private CaptchaXClient $client;
    private bool $serverAvailable;
    
    protected function setUp(): void
    {
        parent::setUp();
        
        $config = new CaptchaConfig(
            self::DEV_BASE_URL,
            self::TEST_APP_ID,
            self::TEST_TIMEOUT,
            self::TEST_RETRY_TIMES
        );
        
        $this->client = new CaptchaXClient($config);
        $this->serverAvailable = $this->checkServerAvailability();
    }
    
    private function checkServerAvailability(): bool
    {
        if (!function_exists('curl_init')) {
            return false;
        }
        
        $ch = curl_init(self::DEV_BASE_URL . '/health');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 2,
            CURLOPT_CONNECTTIMEOUT => 2,
            CURLOPT_NOBODY => true,
        ]);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);
        
        return $response !== false && $httpCode < 500 && empty($error);
    }
    
    public function testHealthCheckEndpoint(): void
    {
        if (!$this->serverAvailable) {
            $this->markTestSkipped('Development server is not available at ' . self::DEV_BASE_URL);
        }
        
        $health = $this->client->healthCheck();
        
        $this->assertNotEmpty($health->getStatus());
        $this->assertNotEmpty($health->getService());
    }
    
    public function testSliderCaptchaFlow(): void
    {
        if (!$this->serverAvailable) {
            $this->markTestSkipped('Development server is not available');
        }
        
        $sliderResult = $this->client->generateSliderCaptcha(300, 200, 'test-integration', null);
        
        $this->assertNotEmpty($sliderResult->getId());
        $this->assertNotEmpty($sliderResult->getBackgroundB64());
        $this->assertNotEmpty($sliderResult->getSliderB64());
        $this->assertGreaterThan(0, $sliderResult->getTargetX());
        
        $verifyResult = $this->client->verifySliderCaptcha(
            $sliderResult->getId(),
            $sliderResult->getTargetX(),
            $sliderResult->getTargetY()
        );
        
        $this->assertInstanceOf(\CaptchaX\SDK\SliderVerifyResult::class, $verifyResult);
    }
    
    public function testClickCaptchaFlow(): void
    {
        if (!$this->serverAvailable) {
            $this->markTestSkipped('Development server is not available');
        }
        
        $clickResult = $this->client->generateClickCaptcha(3, 'test-integration', null);
        
        $this->assertNotEmpty($clickResult->getId());
        $this->assertNotEmpty($clickResult->getImage());
        $this->assertNotEmpty($clickResult->getTargetChars());
        $this->assertCount(3, $clickResult->getTargetChars());
        
        $clicks = array_map(
            fn($pos) => new CharPosition(
                $pos->getChar(),
                $pos->getX(),
                $pos->getY()
            ),
            $clickResult->getCharPositions()
        );
        
        $verifyResult = $this->client->verifyClickCaptcha($clickResult->getId(), $clicks);
        
        $this->assertInstanceOf(\CaptchaX\SDK\ClickVerifyResult::class, $verifyResult);
    }
    
    public function testPuzzleCaptchaFlow(): void
    {
        if (!$this->serverAvailable) {
            $this->markTestSkipped('Development server is not available');
        }
        
        $puzzleResult = $this->client->generatePuzzleCaptcha(300, 200, 'test-integration', null);
        
        $this->assertNotEmpty($puzzleResult->getId());
        $this->assertNotEmpty($puzzleResult->getBackgroundB64());
        $this->assertNotEmpty($puzzleResult->getPuzzleB64());
        $this->assertGreaterThan(0, $puzzleResult->getTargetX());
        
        $verifyResult = $this->client->verifyPuzzleCaptcha(
            $puzzleResult->getId(),
            $puzzleResult->getTargetX(),
            $puzzleResult->getTargetY()
        );
        
        $this->assertInstanceOf(\CaptchaX\SDK\PuzzleVerifyResult::class, $verifyResult);
    }
    
    public function testScenarioManagement(): void
    {
        if (!$this->serverAvailable) {
            $this->markTestSkipped('Development server is not available');
        }
        
        $scenarioName = 'Test Scenario ' . time();
        $scenario = $this->client->createScenario(
            $scenarioName,
            'Integration test scenario',
            'medium',
            ['custom_param' => 'value']
        );
        
        $this->assertNotNull($scenario->getId());
        $this->assertSame($scenarioName, $scenario->getName());
        $this->assertSame('medium', $scenario->getDifficulty());
        
        $retrieved = $this->client->getScenario($scenario->getId());
        $this->assertSame($scenario->getId(), $retrieved->getId());
        
        $updated = $this->client->updateScenario($scenario->getId(), [
            'difficulty' => 'hard',
        ]);
        $this->assertSame('hard', $updated->getDifficulty());
        
        $deleted = $this->client->deleteScenario($scenario->getId());
        $this->assertNotEmpty($deleted);
    }
    
    public function testListScenarios(): void
    {
        if (!$this->serverAvailable) {
            $this->markTestSkipped('Development server is not available');
        }
        
        $result = $this->client->listScenarios();
        
        $this->assertArrayHasKey('scenarios', $result);
        $this->assertArrayHasKey('total', $result);
        $this->assertIsArray($result['scenarios']);
        $this->assertIsInt($result['total']);
    }
    
    public function testWebhookRegistration(): void
    {
        if (!$this->serverAvailable) {
            $this->markTestSkipped('Development server is not available');
        }
        
        $webhook = $this->client->registerWebhook(
            self::TEST_APP_ID,
            'https://example.com/webhook/' . time(),
            ['captcha.verify', 'captcha.fail'],
            'test-secret-' . time(),
            ['X-Custom-Header' => 'test-value']
        );
        
        $this->assertNotNull($webhook->getId());
        $this->assertSame(self::TEST_APP_ID, $webhook->getAppId());
        $this->assertNotEmpty($webhook->getEvents());
    }
    
    public function testListWebhooks(): void
    {
        if (!$this->serverAvailable) {
            $this->markTestSkipped('Development server is not available');
        }
        
        $result = $this->client->listWebhooks();
        
        $this->assertArrayHasKey('webhooks', $result);
        $this->assertArrayHasKey('total', $result);
        $this->assertIsArray($result['webhooks']);
    }
    
    public function testBatchVerifyFlow(): void
    {
        if (!$this->serverAvailable) {
            $this->markTestSkipped('Development server is not available');
        }
        
        $sliderResult = $this->client->generateSliderCaptcha(300, 200, 'test-batch', null);
        
        $items = [
            [
                'captcha_id' => $sliderResult->getId(),
                'type' => 'slider',
                'target_x' => $sliderResult->getTargetX(),
                'target_y' => $sliderResult->getTargetY(),
            ],
        ];
        
        $response = $this->client->batchVerify($items, 'batch-dedup-' . time());
        
        $this->assertInstanceOf(\CaptchaX\SDK\BatchVerifyResponse::class, $response);
        $this->assertNotEmpty($response->getResults());
        $this->assertInstanceOf(\CaptchaX\SDK\BatchVerifySummary::class, $response->getSummary());
    }
    
    public function testClientInfoCreation(): void
    {
        $info = $this->client->createClientInfo([
            'integration_test' => true,
            'timestamp' => date('c'),
        ]);
        
        $this->assertNotEmpty($info);
        $data = json_decode($info, true);
        
        $this->assertIsArray($data);
        $this->assertArrayHasKey('platform', $data);
        $this->assertArrayHasKey('timestamp', $data);
        $this->assertArrayHasKey('integration_test', $data);
        $this->assertTrue($data['integration_test']);
        $this->assertStringContainsString('PHP', $data['platform']);
    }
    
    public function testApiVersionSwitching(): void
    {
        if (!$this->serverAvailable) {
            $this->markTestSkipped('Development server is not available');
        }
        
        $this->assertSame('v1', $this->client->getApiVersion());
        
        $this->client->setApiVersion('v2');
        $this->assertSame('v2', $this->client->getApiVersion());
        
        $health = $this->client->healthCheck();
        $this->assertNotEmpty($health->getStatus());
    }
    
    public function testRetryMechanismWithServerError(): void
    {
        $this->markTestSkipped('This test requires a server that can simulate 5xx errors');
    }
    
    public function testTimeoutConfiguration(): void
    {
        $shortTimeoutConfig = new CaptchaConfig(
            self::DEV_BASE_URL,
            self::TEST_APP_ID,
            1000,
            0
        );
        
        $client = new CaptchaXClient($shortTimeoutConfig);
        
        $this->assertInstanceOf(CaptchaXClient::class, $client);
    }
    
    public function testProductionEnvironmentConfiguration(): void
    {
        $prodConfig = new CaptchaConfig(
            self::PROD_BASE_URL,
            self::TEST_APP_ID,
            self::TEST_TIMEOUT,
            self::TEST_RETRY_TIMES
        );
        
        $prodClient = new CaptchaXClient($prodConfig);
        
        $this->assertInstanceOf(CaptchaXClient::class, $prodClient);
        $this->assertSame(self::PROD_BASE_URL, $prodConfig->getBaseUrl());
    }
    
    public function testMultipleConcurrentCaptchaGeneration(): void
    {
        if (!$this->serverAvailable) {
            $this->markTestSkipped('Development server is not available');
        }
        
        $results = [];
        for ($i = 0; $i < 3; $i++) {
            $results[] = $this->client->generateSliderCaptcha(300, 200, 'test-concurrent', null);
        }
        
        $this->assertCount(3, $results);
        
        $ids = array_map(fn($r) => $r->getId(), $results);
        $uniqueIds = array_unique($ids);
        $this->assertCount(3, $uniqueIds, 'All generated captcha IDs should be unique');
    }
    
    public function testInvalidCaptchaIdHandling(): void
    {
        if (!$this->serverAvailable) {
            $this->markTestSkipped('Development server is not available');
        }
        
        $this->expectException(CaptchaXException::class);
        
        $this->client->verifySliderCaptcha('invalid-captcha-id-' . time(), 0);
    }
    
    public function testEmptyScenarioName(): void
    {
        if (!$this->serverAvailable) {
            $this->markTestSkipped('Development server is not available');
        }
        
        $this->expectException(CaptchaXException::class);
        
        $this->client->createScenario('');
    }
}
