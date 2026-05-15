<?php

declare(strict_types=1);

namespace CaptchaX\SDK\Tests;

use CaptchaX\SDK\BatchVerifyItem;
use CaptchaX\SDK\CaptchaConfig;
use CaptchaX\SDK\CaptchaXClient;
use CaptchaX\SDK\CaptchaXException;
use CaptchaX\SDK\CharPosition;
use PHPUnit\Framework\TestCase;
use ReflectionClass;

class CaptchaXClientMockTest extends TestCase
{
    private function createClientWithMockedRequest(CaptchaXClient $client, array $response): CaptchaXClient
    {
        return new class($client, $response) extends CaptchaXClient {
            private array $mockResponse;
            private CaptchaXClient $originalClient;
            
            public function __construct(CaptchaXClient $original, array $response)
            {
                $reflection = new ReflectionClass(CaptchaXClient::class);
                $configProperty = $reflection->getProperty('config');
                $configProperty->setAccessible(true);
                
                parent::__construct($configProperty->getValue($original));
                
                $this->originalClient = $original;
                $this->mockResponse = $response;
            }
            
            private function request(string $method, string $endpoint, ?array $body = null, ?string $deduplicationId = null): array
            {
                return $this->mockResponse;
            }
        };
    }
    
    public function testGenerateSliderCaptcha(): void
    {
        $config = new CaptchaConfig('http://localhost:3000', 'test-app-123');
        $client = new CaptchaXClient($config);
        
        $mockResponse = [
            'code' => 200,
            'message' => 'success',
            'data' => [
                'id' => 'slider-captcha-001',
                'background_b64' => 'base64-bg-data',
                'slider_b64' => 'base64-slider-data',
                'target_x' => 150,
                'target_y' => 80,
            ],
        ];
        
        $mockClient = $this->createClientWithMockedRequest($client, $mockResponse);
        $result = $mockClient->generateSliderCaptcha(300, 200, 'test-client-info', 'scenario-001');
        
        $this->assertSame('slider-captcha-001', $result->getId());
        $this->assertSame('base64-bg-data', $result->getBackgroundB64());
        $this->assertSame('base64-slider-data', $result->getSliderB64());
        $this->assertSame(150, $result->getTargetX());
        $this->assertSame(80, $result->getTargetY());
    }
    
    public function testGenerateSliderCaptchaWithOptionalParams(): void
    {
        $config = new CaptchaConfig('http://localhost:3000', 'test-app-123');
        $client = new CaptchaXClient($config);
        
        $mockResponse = [
            'code' => 200,
            'data' => [
                'id' => 'slider-002',
                'background_b64' => 'bg',
                'slider_b64' => 'slider',
                'target_x' => 100,
                'target_y' => 50,
            ],
        ];
        
        $mockClient = $this->createClientWithMockedRequest($client, $mockResponse);
        $result = $mockClient->generateSliderCaptcha();
        
        $this->assertInstanceOf(\CaptchaX\SDK\SliderCaptchaResult::class, $result);
    }
    
    public function testVerifySliderCaptcha(): void
    {
        $config = new CaptchaConfig('http://localhost:3000');
        $client = new CaptchaXClient($config);
        
        $mockResponse = [
            'code' => 200,
            'data' => [
                'success' => true,
                'message' => 'Verification successful',
            ],
        ];
        
        $mockClient = $this->createClientWithMockedRequest($client, $mockResponse);
        $result = $mockClient->verifySliderCaptcha('captcha-001', 150, 80);
        
        $this->assertTrue($result->isSuccess());
        $this->assertSame('Verification successful', $result->getMessage());
    }
    
    public function testVerifySliderCaptchaWithoutTargetY(): void
    {
        $config = new CaptchaConfig('http://localhost:3000');
        $client = new CaptchaXClient($config);
        
        $mockResponse = [
            'code' => 200,
            'data' => [
                'success' => true,
                'message' => 'OK',
            ],
        ];
        
        $mockClient = $this->createClientWithMockedRequest($client, $mockResponse);
        $result = $mockClient->verifySliderCaptcha('captcha-001', 150);
        
        $this->assertTrue($result->isSuccess());
    }
    
    public function testGenerateClickCaptcha(): void
    {
        $config = new CaptchaConfig('http://localhost:3000', 'test-app-123');
        $client = new CaptchaXClient($config);
        
        $mockResponse = [
            'code' => 200,
            'data' => [
                'id' => 'click-captcha-001',
                'image' => 'base64-image-data',
                'target_chars' => ['A', 'B', 'C'],
                'char_positions' => [
                    ['char' => 'A', 'x' => 100, 'y' => 50],
                    ['char' => 'B', 'x' => 200, 'y' => 100],
                    ['char' => 'C', 'x' => 300, 'y' => 150],
                ],
            ],
        ];
        
        $mockClient = $this->createClientWithMockedRequest($client, $mockResponse);
        $result = $mockClient->generateClickCaptcha(3, 'client-info', 'scenario-001');
        
        $this->assertSame('click-captcha-001', $result->getId());
        $this->assertSame('base64-image-data', $result->getImage());
        $this->assertSame(['A', 'B', 'C'], $result->getTargetChars());
        $this->assertCount(3, $result->getCharPositions());
    }
    
    public function testGenerateClickCaptchaWithDefaults(): void
    {
        $config = new CaptchaConfig('http://localhost:3000', 'test-app-123');
        $client = new CaptchaXClient($config);
        
        $mockResponse = [
            'code' => 200,
            'data' => [
                'id' => 'click-002',
                'image' => 'img',
                'target_chars' => [],
                'char_positions' => [],
            ],
        ];
        
        $mockClient = $this->createClientWithMockedRequest($client, $mockResponse);
        $result = $mockClient->generateClickCaptcha();
        
        $this->assertInstanceOf(\CaptchaX\SDK\ClickCaptchaResult::class, $result);
    }
    
    public function testVerifyClickCaptcha(): void
    {
        $config = new CaptchaConfig('http://localhost:3000');
        $client = new CaptchaXClient($config);
        
        $mockResponse = [
            'code' => 200,
            'data' => [
                'success' => true,
                'score' => 0.95,
                'message' => 'Verified',
            ],
        ];
        
        $mockClient = $this->createClientWithMockedRequest($client, $mockResponse);
        
        $clicks = [
            new CharPosition('A', 100, 50),
            new CharPosition('B', 200, 100),
        ];
        
        $result = $mockClient->verifyClickCaptcha('captcha-001', $clicks);
        
        $this->assertTrue($result->isSuccess());
        $this->assertSame(0.95, $result->getScore());
        $this->assertSame('Verified', $result->getMessage());
    }
    
    public function testVerifyClickCaptchaWithArrayClicks(): void
    {
        $config = new CaptchaConfig('http://localhost:3000');
        $client = new CaptchaXClient($config);
        
        $mockResponse = [
            'code' => 200,
            'data' => [
                'success' => true,
                'score' => 0.85,
            ],
        ];
        
        $mockClient = $this->createClientWithMockedRequest($client, $mockResponse);
        
        $clicks = [
            ['char' => 'A', 'x' => 100, 'y' => 50],
            ['char' => 'B', 'x' => 200, 'y' => 100],
        ];
        
        $result = $mockClient->verifyClickCaptcha('captcha-001', $clicks);
        
        $this->assertTrue($result->isSuccess());
    }
    
    public function testGeneratePuzzleCaptcha(): void
    {
        $config = new CaptchaConfig('http://localhost:3000', 'test-app-123');
        $client = new CaptchaXClient($config);
        
        $mockResponse = [
            'code' => 200,
            'data' => [
                'id' => 'puzzle-captcha-001',
                'background_b64' => 'bg-base64',
                'puzzle_b64' => 'puzzle-base64',
                'target_x' => 120,
                'target_y' => 60,
            ],
        ];
        
        $mockClient = $this->createClientWithMockedRequest($client, $mockResponse);
        $result = $mockClient->generatePuzzleCaptcha(300, 200, 'client-info', 'scenario-001');
        
        $this->assertSame('puzzle-captcha-001', $result->getId());
        $this->assertSame('bg-base64', $result->getBackgroundB64());
        $this->assertSame('puzzle-base64', $result->getPuzzleB64());
        $this->assertSame(120, $result->getTargetX());
        $this->assertSame(60, $result->getTargetY());
    }
    
    public function testVerifyPuzzleCaptcha(): void
    {
        $config = new CaptchaConfig('http://localhost:3000');
        $client = new CaptchaXClient($config);
        
        $mockResponse = [
            'code' => 200,
            'data' => [
                'success' => true,
                'message' => 'Puzzle solved',
            ],
        ];
        
        $mockClient = $this->createClientWithMockedRequest($client, $mockResponse);
        $result = $mockClient->verifyPuzzleCaptcha('captcha-001', 120, 60);
        
        $this->assertTrue($result->isSuccess());
        $this->assertSame('Puzzle solved', $result->getMessage());
    }
    
    public function testBatchVerify(): void
    {
        $config = new CaptchaConfig('http://localhost:3000');
        $client = new CaptchaXClient($config);
        
        $mockResponse = [
            'code' => 200,
            'data' => [
                'results' => [
                    [
                        'captcha_id' => 'captcha-001',
                        'success' => true,
                        'message' => 'OK',
                    ],
                    [
                        'captcha_id' => 'captcha-002',
                        'success' => false,
                        'message' => 'Failed',
                    ],
                ],
                'summary' => [
                    'total' => 2,
                    'success' => 1,
                    'failed' => 1,
                    'skipped' => 0,
                ],
            ],
        ];
        
        $mockClient = $this->createClientWithMockedRequest($client, $mockResponse);
        
        $items = [
            new BatchVerifyItem('captcha-001', 'slider', 150),
            (new BatchVerifyItem('captcha-002', 'click', 0))->withClicks([
                new CharPosition('A', 100, 50),
            ]),
        ];
        
        $response = $mockClient->batchVerify($items, 'dedup-123');
        
        $this->assertCount(2, $response->getResults());
        $this->assertSame(2, $response->getSummary()->getTotal());
        $this->assertSame(1, $response->getSummary()->getSuccessCount());
    }
    
    public function testBatchVerifyWithArrayItems(): void
    {
        $config = new CaptchaConfig('http://localhost:3000');
        $client = new CaptchaXClient($config);
        
        $mockResponse = [
            'code' => 200,
            'data' => [
                'results' => [],
                'summary' => [
                    'total' => 1,
                    'success' => 1,
                    'failed' => 0,
                    'skipped' => 0,
                ],
            ],
        ];
        
        $mockClient = $this->createClientWithMockedRequest($client, $mockResponse);
        
        $items = [
            [
                'captcha_id' => 'captcha-001',
                'type' => 'slider',
                'target_x' => 150,
            ],
        ];
        
        $response = $mockClient->batchVerify($items);
        
        $this->assertCount(1, $response->getResults());
    }
    
    public function testListScenarios(): void
    {
        $config = new CaptchaConfig('http://localhost:3000');
        $client = new CaptchaXClient($config);
        
        $mockResponse = [
            'code' => 200,
            'data' => [
                'scenarios' => [
                    [
                        'id' => 'scenario-001',
                        'name' => 'Test Scenario',
                        'description' => 'Test',
                    ],
                    [
                        'id' => 'scenario-002',
                        'name' => 'Another Scenario',
                    ],
                ],
                'total' => 2,
            ],
        ];
        
        $mockClient = $this->createClientWithMockedRequest($client, $mockResponse);
        $result = $mockClient->listScenarios();
        
        $this->assertSame(2, $result['total']);
        $this->assertCount(2, $result['scenarios']);
        $this->assertInstanceOf(\CaptchaX\SDK\Scenario::class, $result['scenarios'][0]);
        $this->assertSame('scenario-001', $result['scenarios'][0]->getId());
    }
    
    public function testCreateScenario(): void
    {
        $config = new CaptchaConfig('http://localhost:3000');
        $client = new CaptchaXClient($config);
        
        $mockResponse = [
            'code' => 200,
            'data' => [
                'id' => 'scenario-001',
                'name' => 'New Scenario',
                'description' => 'A new scenario',
                'difficulty' => 'medium',
                'config' => ['param1' => 'value1'],
            ],
        ];
        
        $mockClient = $this->createClientWithMockedRequest($client, $mockResponse);
        $scenario = $mockClient->createScenario(
            'New Scenario',
            'A new scenario',
            'medium',
            ['param1' => 'value1']
        );
        
        $this->assertSame('scenario-001', $scenario->getId());
        $this->assertSame('New Scenario', $scenario->getName());
        $this->assertSame('medium', $scenario->getDifficulty());
    }
    
    public function testGetScenario(): void
    {
        $config = new CaptchaConfig('http://localhost:3000');
        $client = new CaptchaXClient($config);
        
        $mockResponse = [
            'code' => 200,
            'data' => [
                'id' => 'scenario-001',
                'name' => 'Test Scenario',
            ],
        ];
        
        $mockClient = $this->createClientWithMockedRequest($client, $mockResponse);
        $scenario = $mockClient->getScenario('scenario-001');
        
        $this->assertSame('scenario-001', $scenario->getId());
        $this->assertSame('Test Scenario', $scenario->getName());
    }
    
    public function testUpdateScenario(): void
    {
        $config = new CaptchaConfig('http://localhost:3000');
        $client = new CaptchaXClient($config);
        
        $mockResponse = [
            'code' => 200,
            'data' => [
                'id' => 'scenario-001',
                'name' => 'Updated Scenario',
                'difficulty' => 'hard',
            ],
        ];
        
        $mockClient = $this->createClientWithMockedRequest($client, $mockResponse);
        $scenario = $mockClient->updateScenario('scenario-001', [
            'name' => 'Updated Scenario',
            'difficulty' => 'hard',
        ]);
        
        $this->assertSame('Updated Scenario', $scenario->getName());
        $this->assertSame('hard', $scenario->getDifficulty());
    }
    
    public function testDeleteScenario(): void
    {
        $config = new CaptchaConfig('http://localhost:3000');
        $client = new CaptchaXClient($config);
        
        $mockResponse = [
            'code' => 200,
            'data' => [
                'deleted' => true,
            ],
        ];
        
        $mockClient = $this->createClientWithMockedRequest($client, $mockResponse);
        $result = $mockClient->deleteScenario('scenario-001');
        
        $this->assertSame(true, $result['deleted']);
    }
    
    public function testRegisterWebhook(): void
    {
        $config = new CaptchaConfig('http://localhost:3000');
        $client = new CaptchaXClient($config);
        
        $mockResponse = [
            'code' => 200,
            'data' => [
                'id' => 'webhook-001',
                'app_id' => 'app-123',
                'url' => 'https://example.com/webhook',
                'secret' => 'secret-key',
                'events' => ['captcha.verify'],
                'enabled' => true,
            ],
        ];
        
        $mockClient = $this->createClientWithMockedRequest($client, $mockResponse);
        $webhook = $mockClient->registerWebhook(
            'app-123',
            'https://example.com/webhook',
            ['captcha.verify'],
            'secret-key',
            ['X-Custom' => 'value']
        );
        
        $this->assertSame('webhook-001', $webhook->getId());
        $this->assertSame('app-123', $webhook->getAppId());
        $this->assertSame('https://example.com/webhook', $webhook->getUrl());
    }
    
    public function testListWebhooks(): void
    {
        $config = new CaptchaConfig('http://localhost:3000');
        $client = new CaptchaXClient($config);
        
        $mockResponse = [
            'code' => 200,
            'data' => [
                'webhooks' => [
                    [
                        'id' => 'webhook-001',
                        'url' => 'https://example.com/webhook1',
                        'events' => ['captcha.verify'],
                    ],
                    [
                        'id' => 'webhook-002',
                        'url' => 'https://example.com/webhook2',
                        'events' => ['captcha.fail'],
                    ],
                ],
                'total' => 2,
            ],
        ];
        
        $mockClient = $this->createClientWithMockedRequest($client, $mockResponse);
        $result = $mockClient->listWebhooks('app-123');
        
        $this->assertSame(2, $result['total']);
        $this->assertCount(2, $result['webhooks']);
        $this->assertInstanceOf(\CaptchaX\SDK\Webhook::class, $result['webhooks'][0]);
    }
    
    public function testListWebhooksWithoutAppId(): void
    {
        $config = new CaptchaConfig('http://localhost:3000');
        $client = new CaptchaXClient($config);
        
        $mockResponse = [
            'code' => 200,
            'data' => [
                'webhooks' => [],
                'total' => 0,
            ],
        ];
        
        $mockClient = $this->createClientWithMockedRequest($client, $mockResponse);
        $result = $mockClient->listWebhooks();
        
        $this->assertSame(0, $result['total']);
    }
    
    public function testUpdateWebhook(): void
    {
        $config = new CaptchaConfig('http://localhost:3000');
        $client = new CaptchaXClient($config);
        
        $mockResponse = [
            'code' => 200,
            'data' => [
                'id' => 'webhook-001',
                'url' => 'https://new-url.com/webhook',
                'enabled' => false,
            ],
        ];
        
        $mockClient = $this->createClientWithMockedRequest($client, $mockResponse);
        $webhook = $mockClient->updateWebhook('webhook-001', [
            'url' => 'https://new-url.com/webhook',
            'enabled' => false,
        ]);
        
        $this->assertSame('https://new-url.com/webhook', $webhook->getUrl());
        $this->assertFalse($webhook->isEnabled());
    }
    
    public function testUnregisterWebhook(): void
    {
        $config = new CaptchaConfig('http://localhost:3000');
        $client = new CaptchaXClient($config);
        
        $mockResponse = [
            'code' => 200,
            'data' => [
                'deleted' => true,
            ],
        ];
        
        $mockClient = $this->createClientWithMockedRequest($client, $mockResponse);
        $result = $mockClient->unregisterWebhook('webhook-001');
        
        $this->assertSame(true, $result['deleted']);
    }
    
    public function testHealthCheck(): void
    {
        $config = new CaptchaConfig('http://localhost:3000');
        $client = new CaptchaXClient($config);
        
        $mockResponse = [
            'code' => 200,
            'data' => [
                'status' => 'healthy',
                'service' => 'captchax-api',
                'timestamp' => '2024-01-01T12:00:00Z',
                'version' => '1.0.0',
            ],
        ];
        
        $mockClient = $this->createClientWithMockedRequest($client, $mockResponse);
        $health = $mockClient->healthCheck();
        
        $this->assertSame('healthy', $health->getStatus());
        $this->assertSame('captchax-api', $health->getService());
        $this->assertSame('1.0.0', $health->getVersion());
    }
    
    public function testCreateClientInfoWithExtra(): void
    {
        $config = new CaptchaConfig('http://localhost:3000');
        $client = new CaptchaXClient($config);
        
        $info = $client->createClientInfo(['user_id' => '123', 'session' => 'abc']);
        $data = json_decode($info, true);
        
        $this->assertArrayHasKey('platform', $data);
        $this->assertArrayHasKey('timestamp', $data);
        $this->assertArrayHasKey('user_id', $data);
        $this->assertArrayHasKey('session', $data);
        $this->assertSame('123', $data['user_id']);
        $this->assertSame('abc', $data['session']);
    }
    
    public function testCreateClientInfoWithoutExtra(): void
    {
        $config = new CaptchaConfig('http://localhost:3000');
        $client = new CaptchaXClient($config);
        
        $info = $client->createClientInfo();
        $data = json_decode($info, true);
        
        $this->assertArrayHasKey('platform', $data);
        $this->assertArrayHasKey('timestamp', $data);
        $this->assertCount(2, $data);
        $this->assertStringContainsString('PHP', $data['platform']);
    }
    
    public function testGetApiVersionDefault(): void
    {
        $config = new CaptchaConfig('http://localhost:3000');
        $client = new CaptchaXClient($config);
        
        $this->assertSame('v1', $client->getApiVersion());
    }
    
    public function testSetApiVersionChangesVersion(): void
    {
        $config = new CaptchaConfig('http://localhost:3000');
        $client = new CaptchaXClient($config);
        
        $this->assertSame('v1', $client->getApiVersion());
        
        $client->setApiVersion('v2');
        $this->assertSame('v2', $client->getApiVersion());
    }
}
