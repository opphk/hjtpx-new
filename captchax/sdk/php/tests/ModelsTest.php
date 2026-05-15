<?php

declare(strict_types=1);

namespace CaptchaX\SDK\Tests;

use CaptchaX\SDK\BatchVerifyItem;
use CaptchaX\SDK\BatchVerifyResponse;
use CaptchaX\SDK\BatchVerifyResult;
use CaptchaX\SDK\BatchVerifySummary;
use CaptchaX\SDK\CharPosition;
use CaptchaX\SDK\ClickCaptchaResult;
use CaptchaX\SDK\ClickVerifyResult;
use CaptchaX\SDK\PuzzleCaptchaResult;
use CaptchaX\SDK\PuzzleVerifyResult;
use CaptchaX\SDK\Scenario;
use CaptchaX\SDK\SliderCaptchaResult;
use CaptchaX\SDK\SliderVerifyResult;
use CaptchaX\SDK\Webhook;
use CaptchaX\SDK\HealthStatus;
use PHPUnit\Framework\TestCase;

class ModelsTest extends TestCase
{
    public function testSliderCaptchaResultCreation(): void
    {
        $data = [
            'id' => 'slider-123',
            'background_b64' => 'base64data1',
            'slider_b64' => 'base64data2',
            'target_x' => 150,
            'target_y' => 80,
        ];
        
        $result = new SliderCaptchaResult($data);
        
        $this->assertSame('slider-123', $result->getId());
        $this->assertSame('base64data1', $result->getBackgroundB64());
        $this->assertSame('base64data2', $result->getSliderB64());
        $this->assertSame(150, $result->getTargetX());
        $this->assertSame(80, $result->getTargetY());
    }
    
    public function testSliderCaptchaResultWithDefaults(): void
    {
        $result = new SliderCaptchaResult([]);
        
        $this->assertSame('', $result->getId());
        $this->assertSame('', $result->getBackgroundB64());
        $this->assertSame('', $result->getSliderB64());
        $this->assertSame(0, $result->getTargetX());
        $this->assertSame(0, $result->getTargetY());
    }
    
    public function testSliderVerifyResultSuccess(): void
    {
        $data = [
            'success' => true,
            'message' => 'Verification successful',
        ];
        
        $result = new SliderVerifyResult($data);
        
        $this->assertTrue($result->isSuccess());
        $this->assertSame('Verification successful', $result->getMessage());
    }
    
    public function testSliderVerifyResultFailure(): void
    {
        $result = new SliderVerifyResult([]);
        
        $this->assertFalse($result->isSuccess());
        $this->assertSame('', $result->getMessage());
    }
    
    public function testClickCaptchaResultCreation(): void
    {
        $data = [
            'id' => 'click-456',
            'image' => 'base64image',
            'target_chars' => ['A', 'B', 'C'],
            'char_positions' => [
                ['char' => 'A', 'x' => 100, 'y' => 50],
                ['char' => 'B', 'x' => 200, 'y' => 100],
                ['char' => 'C', 'x' => 300, 'y' => 150],
            ],
        ];
        
        $result = new ClickCaptchaResult($data);
        
        $this->assertSame('click-456', $result->getId());
        $this->assertSame('base64image', $result->getImage());
        $this->assertSame(['A', 'B', 'C'], $result->getTargetChars());
        
        $positions = $result->getCharPositions();
        $this->assertCount(3, $positions);
        $this->assertInstanceOf(CharPosition::class, $positions[0]);
        $this->assertSame('A', $positions[0]->getChar());
        $this->assertSame(100, $positions[0]->getX());
    }
    
    public function testClickCaptchaResultWithDefaults(): void
    {
        $result = new ClickCaptchaResult([]);
        
        $this->assertSame('', $result->getId());
        $this->assertSame('', $result->getImage());
        $this->assertSame([], $result->getTargetChars());
        $this->assertSame([], $result->getCharPositions());
    }
    
    public function testClickVerifyResultSuccess(): void
    {
        $data = [
            'success' => true,
            'score' => 0.95,
            'message' => 'Verified',
        ];
        
        $result = new ClickVerifyResult($data);
        
        $this->assertTrue($result->isSuccess());
        $this->assertSame(0.95, $result->getScore());
        $this->assertSame('Verified', $result->getMessage());
    }
    
    public function testClickVerifyResultWithStringScore(): void
    {
        $data = [
            'success' => true,
            'score' => '0.85',
        ];
        
        $result = new ClickVerifyResult($data);
        $this->assertSame(0.85, $result->getScore());
    }
    
    public function testClickVerifyResultFailure(): void
    {
        $result = new ClickVerifyResult([]);
        
        $this->assertFalse($result->isSuccess());
        $this->assertSame(0.0, $result->getScore());
        $this->assertSame('', $result->getMessage());
    }
    
    public function testPuzzleCaptchaResultCreation(): void
    {
        $data = [
            'id' => 'puzzle-789',
            'background_b64' => 'bg-base64',
            'puzzle_b64' => 'puzzle-base64',
            'target_x' => 120,
            'target_y' => 60,
        ];
        
        $result = new PuzzleCaptchaResult($data);
        
        $this->assertSame('puzzle-789', $result->getId());
        $this->assertSame('bg-base64', $result->getBackgroundB64());
        $this->assertSame('puzzle-base64', $result->getPuzzleB64());
        $this->assertSame(120, $result->getTargetX());
        $this->assertSame(60, $result->getTargetY());
    }
    
    public function testPuzzleCaptchaResultWithDefaults(): void
    {
        $result = new PuzzleCaptchaResult([]);
        
        $this->assertSame('', $result->getId());
        $this->assertSame('', $result->getBackgroundB64());
        $this->assertSame('', $result->getPuzzleB64());
        $this->assertSame(0, $result->getTargetX());
        $this->assertSame(0, $result->getTargetY());
    }
    
    public function testPuzzleVerifyResultSuccess(): void
    {
        $data = [
            'success' => true,
            'message' => 'Puzzle solved',
        ];
        
        $result = new PuzzleVerifyResult($data);
        
        $this->assertTrue($result->isSuccess());
        $this->assertSame('Puzzle solved', $result->getMessage());
    }
    
    public function testPuzzleVerifyResultFailure(): void
    {
        $result = new PuzzleVerifyResult([]);
        
        $this->assertFalse($result->isSuccess());
        $this->assertSame('', $result->getMessage());
    }
    
    public function testScenarioCreation(): void
    {
        $data = [
            'id' => 'scenario-001',
            'name' => 'Test Scenario',
            'description' => 'A test scenario',
            'difficulty' => 'medium',
            'config' => ['param1' => 'value1'],
            'created_at' => '2024-01-01T00:00:00Z',
            'updated_at' => '2024-01-02T00:00:00Z',
        ];
        
        $scenario = new Scenario($data);
        
        $this->assertSame('scenario-001', $scenario->getId());
        $this->assertSame('Test Scenario', $scenario->getName());
        $this->assertSame('A test scenario', $scenario->getDescription());
        $this->assertSame('medium', $scenario->getDifficulty());
        $this->assertSame(['param1' => 'value1'], $scenario->getConfig());
        $this->assertSame('2024-01-01T00:00:00Z', $scenario->getCreatedAt());
        $this->assertSame('2024-01-02T00:00:00Z', $scenario->getUpdatedAt());
    }
    
    public function testScenarioWithDefaults(): void
    {
        $scenario = new Scenario([]);
        
        $this->assertNull($scenario->getId());
        $this->assertNull($scenario->getName());
        $this->assertNull($scenario->getDescription());
        $this->assertNull($scenario->getDifficulty());
        $this->assertNull($scenario->getConfig());
        $this->assertNull($scenario->getCreatedAt());
        $this->assertNull($scenario->getUpdatedAt());
    }
    
    public function testWebhookCreation(): void
    {
        $data = [
            'id' => 'webhook-123',
            'app_id' => 'app-456',
            'url' => 'https://example.com/webhook',
            'secret' => 'secret-key',
            'events' => ['captcha.verify', 'captcha.fail'],
            'headers' => ['X-Custom' => 'value'],
            'enabled' => true,
            'created_at' => '2024-01-01T00:00:00Z',
            'updated_at' => '2024-01-02T00:00:00Z',
        ];
        
        $webhook = new Webhook($data);
        
        $this->assertSame('webhook-123', $webhook->getId());
        $this->assertSame('app-456', $webhook->getAppId());
        $this->assertSame('https://example.com/webhook', $webhook->getUrl());
        $this->assertSame('secret-key', $webhook->getSecret());
        $this->assertSame(['captcha.verify', 'captcha.fail'], $webhook->getEvents());
        $this->assertSame(['X-Custom' => 'value'], $webhook->getHeaders());
        $this->assertTrue($webhook->isEnabled());
        $this->assertSame('2024-01-01T00:00:00Z', $webhook->getCreatedAt());
        $this->assertSame('2024-01-02T00:00:00Z', $webhook->getUpdatedAt());
    }
    
    public function testWebhookWithDefaults(): void
    {
        $webhook = new Webhook([]);
        
        $this->assertNull($webhook->getId());
        $this->assertNull($webhook->getAppId());
        $this->assertSame('', $webhook->getUrl());
        $this->assertNull($webhook->getSecret());
        $this->assertSame([], $webhook->getEvents());
        $this->assertNull($webhook->getHeaders());
        $this->assertTrue($webhook->isEnabled());
        $this->assertNull($webhook->getCreatedAt());
        $this->assertNull($webhook->getUpdatedAt());
    }
    
    public function testBatchVerifyItemCreation(): void
    {
        $item = new BatchVerifyItem('captcha-001', 'slider', 150);
        
        $array = $item->toArray();
        
        $this->assertSame('captcha-001', $array['captcha_id']);
        $this->assertSame('slider', $array['type']);
        $this->assertSame(150, $array['target_x']);
        $this->assertArrayNotHasKey('target_y', $array);
        $this->assertArrayNotHasKey('clicks', $array);
    }
    
    public function testBatchVerifyItemWithTargetY(): void
    {
        $item = (new BatchVerifyItem('captcha-001', 'puzzle', 120))
            ->withTargetY(80);
        
        $array = $item->toArray();
        
        $this->assertSame(120, $array['target_x']);
        $this->assertSame(80, $array['target_y']);
    }
    
    public function testBatchVerifyItemWithClicks(): void
    {
        $clicks = [
            new CharPosition('A', 100, 50),
            ['char' => 'B', 'x' => 200, 'y' => 100],
        ];
        
        $item = (new BatchVerifyItem('captcha-001', 'click', 0))
            ->withClicks($clicks);
        
        $array = $item->toArray();
        
        $this->assertCount(2, $array['clicks']);
        $this->assertSame('A', $array['clicks'][0]['char']);
        $this->assertSame(100, $array['clicks'][0]['x']);
        $this->assertSame('B', $array['clicks'][1]['char']);
    }
    
    public function testBatchVerifyItemImmutability(): void
    {
        $original = new BatchVerifyItem('captcha-001', 'slider', 150);
        $modified = $original->withTargetY(80);
        
        $this->assertNotSame($original, $modified);
        $this->assertArrayNotHasKey('target_y', $original->toArray());
        $this->assertSame(80, $modified->toArray()['target_y']);
    }
    
    public function testBatchVerifyResultSuccess(): void
    {
        $data = [
            'captcha_id' => 'captcha-001',
            'success' => true,
            'message' => 'Verified',
            'score' => 0.95,
        ];
        
        $result = new BatchVerifyResult($data);
        
        $this->assertSame('captcha-001', $result->getCaptchaId());
        $this->assertTrue($result->isSuccess());
        $this->assertSame('Verified', $result->getMessage());
        $this->assertSame(0.95, $result->getScore());
    }
    
    public function testBatchVerifyResultWithStringScore(): void
    {
        $data = [
            'captcha_id' => 'captcha-001',
            'success' => false,
            'score' => '0.75',
        ];
        
        $result = new BatchVerifyResult($data);
        $this->assertSame(0.75, $result->getScore());
    }
    
    public function testBatchVerifyResultWithDefaults(): void
    {
        $result = new BatchVerifyResult([]);
        
        $this->assertSame('', $result->getCaptchaId());
        $this->assertFalse($result->isSuccess());
        $this->assertSame('', $result->getMessage());
        $this->assertNull($result->getScore());
    }
    
    public function testBatchVerifySummaryCreation(): void
    {
        $data = [
            'total' => 10,
            'success' => 8,
            'failed' => 1,
            'skipped' => 1,
        ];
        
        $summary = new BatchVerifySummary($data);
        
        $this->assertSame(10, $summary->getTotal());
        $this->assertSame(8, $summary->getSuccessCount());
        $this->assertSame(1, $summary->getFailed());
        $this->assertSame(1, $summary->getSkipped());
    }
    
    public function testBatchVerifySummaryWithDefaults(): void
    {
        $summary = new BatchVerifySummary([]);
        
        $this->assertSame(0, $summary->getTotal());
        $this->assertSame(0, $summary->getSuccessCount());
        $this->assertSame(0, $summary->getFailed());
        $this->assertSame(0, $summary->getSkipped());
    }
    
    public function testBatchVerifyResponseCreation(): void
    {
        $data = [
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
        ];
        
        $response = new BatchVerifyResponse($data);
        
        $results = $response->getResults();
        $this->assertCount(2, $results);
        $this->assertInstanceOf(BatchVerifyResult::class, $results[0]);
        $this->assertTrue($results[0]->isSuccess());
        $this->assertFalse($results[1]->isSuccess());
        
        $summary = $response->getSummary();
        $this->assertInstanceOf(BatchVerifySummary::class, $summary);
        $this->assertSame(2, $summary->getTotal());
    }
    
    public function testBatchVerifyResponseWithEmptyResults(): void
    {
        $response = new BatchVerifyResponse([]);
        
        $this->assertSame([], $response->getResults());
        $this->assertInstanceOf(BatchVerifySummary::class, $response->getSummary());
    }
    
    public function testHealthStatusCreation(): void
    {
        $data = [
            'status' => 'healthy',
            'service' => 'captchax-api',
            'timestamp' => '2024-01-01T12:00:00Z',
            'version' => '1.0.0',
        ];
        
        $health = new HealthStatus($data);
        
        $this->assertSame('healthy', $health->getStatus());
        $this->assertSame('captchax-api', $health->getService());
        $this->assertSame('2024-01-01T12:00:00Z', $health->getTimestamp());
        $this->assertSame('1.0.0', $health->getVersion());
    }
    
    public function testHealthStatusWithDefaults(): void
    {
        $health = new HealthStatus([]);
        
        $this->assertSame('', $health->getStatus());
        $this->assertSame('', $health->getService());
        $this->assertSame('', $health->getTimestamp());
        $this->assertSame('', $health->getVersion());
    }
    
    public function testCharPositionToArrayWithNumericValues(): void
    {
        $pos = new CharPosition('C', 300, 200);
        $arr = $pos->toArray();
        
        $this->assertIsInt($arr['x']);
        $this->assertIsInt($arr['y']);
    }
}
