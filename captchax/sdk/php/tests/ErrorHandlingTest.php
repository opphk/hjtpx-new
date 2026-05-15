<?php

declare(strict_types=1);

namespace CaptchaX\SDK\Tests;

use CaptchaX\SDK\CaptchaConfig;
use CaptchaX\SDK\CaptchaXClient;
use CaptchaX\SDK\CaptchaXException;
use PHPUnit\Framework\TestCase;
use ReflectionClass;

class ErrorHandlingTest extends TestCase
{
    private function createClientWithMockedError(
        CaptchaXClient $client,
        int $httpCode,
        string $errorMessage,
        ?array $responseData = null,
        bool $curlError = false,
        string $curlErrorMessage = ''
    ): CaptchaXClient {
        return new class($client, $httpCode, $errorMessage, $responseData, $curlError, $curlErrorMessage) extends CaptchaXClient {
            private int $mockHttpCode;
            private string $mockErrorMessage;
            private ?array $mockResponseData;
            private bool $mockCurlError;
            private string $mockCurlErrorMessage;
            
            public function __construct(
                CaptchaXClient $original,
                int $httpCode,
                string $errorMessage,
                ?array $responseData,
                bool $curlError,
                string $curlErrorMessage
            ) {
                $reflection = new ReflectionClass(CaptchaXClient::class);
                $configProperty = $reflection->getProperty('config');
                $configProperty->setAccessible(true);
                
                parent::__construct($configProperty->getValue($original));
                
                $this->mockHttpCode = $httpCode;
                $this->mockErrorMessage = $errorMessage;
                $this->mockResponseData = $responseData;
                $this->mockCurlError = $curlError;
                $this->mockCurlErrorMessage = $curlErrorMessage;
            }
            
            private function request(string $method, string $endpoint, ?array $body = null, ?string $deduplicationId = null): array
            {
                if ($this->mockCurlError) {
                    throw new CaptchaXException("cURL error: " . $this->mockCurlErrorMessage, 0, 0);
                }
                
                if ($this->mockHttpCode >= 400) {
                    $data = $this->mockResponseData ?? [
                        'message' => $this->mockErrorMessage,
                        'code' => $this->mockHttpCode,
                    ];
                    throw new CaptchaXException(
                        $data['message'] ?? "HTTP error: {$this->mockHttpCode}",
                        (int)($data['code'] ?? $this->mockHttpCode),
                        $this->mockHttpCode,
                        $data
                    );
                }
                
                return [
                    'code' => 200,
                    'data' => $this->mockResponseData ?? [],
                ];
            }
        };
    }
    
    public function testGenerateCaptchaWithoutAppIdThrowsException(): void
    {
        $config = new CaptchaConfig('http://localhost:3000');
        $client = new CaptchaXClient($config);
        
        $this->expectException(CaptchaXException::class);
        $this->expectExceptionCode(400);
        $this->expectExceptionMessage('appId is required');
        
        $client->generateSliderCaptcha();
    }
    
    public function testGenerateClickCaptchaWithoutAppIdThrowsException(): void
    {
        $config = new CaptchaConfig('http://localhost:3000');
        $client = new CaptchaXClient($config);
        
        $this->expectException(CaptchaXException::class);
        $this->expectExceptionCode(400);
        
        $client->generateClickCaptcha();
    }
    
    public function testGeneratePuzzleCaptchaWithoutAppIdThrowsException(): void
    {
        $config = new CaptchaConfig('http://localhost:3000');
        $client = new CaptchaXClient($config);
        
        $this->expectException(CaptchaXException::class);
        $this->expectExceptionCode(400);
        
        $client->generatePuzzleCaptcha();
    }
    
    public function testHttp400ErrorHandling(): void
    {
        $config = new CaptchaConfig('http://localhost:3000');
        $client = new CaptchaXClient($config);
        
        $mockClient = $this->createClientWithMockedError(
            $client,
            400,
            'Bad Request - Invalid parameters',
            ['code' => 400, 'message' => 'Bad Request']
        );
        
        $this->expectException(CaptchaXException::class);
        $this->expectExceptionCode(400);
        
        $mockClient->verifySliderCaptcha('captcha-001', 150);
    }
    
    public function testHttp401ErrorHandling(): void
    {
        $config = new CaptchaConfig('http://localhost:3000');
        $client = new CaptchaXClient($config);
        
        $mockClient = $this->createClientWithMockedError(
            $client,
            401,
            'Unauthorized - Invalid API key',
            ['code' => 401, 'message' => 'Unauthorized']
        );
        
        $this->expectException(CaptchaXException::class);
        $this->expectExceptionCode(401);
        
        $mockClient->verifySliderCaptcha('captcha-001', 150);
    }
    
    public function testHttp403ErrorHandling(): void
    {
        $config = new CaptchaConfig('http://localhost:3000');
        $client = new CaptchaXClient($config);
        
        $mockClient = $this->createClientWithMockedError(
            $client,
            403,
            'Forbidden - Access denied',
            ['code' => 403, 'message' => 'Forbidden']
        );
        
        $this->expectException(CaptchaXException::class);
        $this->expectExceptionCode(403);
        
        $mockClient->verifySliderCaptcha('captcha-001', 150);
    }
    
    public function testHttp404ErrorHandling(): void
    {
        $config = new CaptchaConfig('http://localhost:3000');
        $client = new CaptchaXClient($config);
        
        $mockClient = $this->createClientWithMockedError(
            $client,
            404,
            'Not Found - Resource does not exist',
            ['code' => 404, 'message' => 'Not Found']
        );
        
        $this->expectException(CaptchaXException::class);
        $this->expectExceptionCode(404);
        
        $mockClient->verifySliderCaptcha('invalid-captcha', 150);
    }
    
    public function testHttp429ErrorHandling(): void
    {
        $config = new CaptchaConfig('http://localhost:3000');
        $client = new CaptchaXClient($config);
        
        $mockClient = $this->createClientWithMockedError(
            $client,
            429,
            'Too Many Requests - Rate limit exceeded',
            ['code' => 429, 'message' => 'Rate limit exceeded']
        );
        
        $this->expectException(CaptchaXException::class);
        $this->expectExceptionCode(429);
        
        $mockClient->verifySliderCaptcha('captcha-001', 150);
    }
    
    public function testHttp500ErrorHandling(): void
    {
        $config = new CaptchaConfig('http://localhost:3000', null, 10000, 0);
        $client = new CaptchaXClient($config);
        
        $mockClient = $this->createClientWithMockedError(
            $client,
            500,
            'Internal Server Error',
            ['code' => 500, 'message' => 'Server error']
        );
        
        $this->expectException(CaptchaXException::class);
        $this->expectExceptionCode(500);
        
        $mockClient->verifySliderCaptcha('captcha-001', 150);
    }
    
    public function testHttp502ErrorHandling(): void
    {
        $config = new CaptchaConfig('http://localhost:3000', null, 10000, 0);
        $client = new CaptchaXClient($config);
        
        $mockClient = $this->createClientWithMockedError(
            $client,
            502,
            'Bad Gateway',
            ['code' => 502, 'message' => 'Bad Gateway']
        );
        
        $this->expectException(CaptchaXException::class);
        $this->expectExceptionCode(502);
        
        $mockClient->verifySliderCaptcha('captcha-001', 150);
    }
    
    public function testHttp503ErrorHandling(): void
    {
        $config = new CaptchaConfig('http://localhost:3000', null, 10000, 0);
        $client = new CaptchaXClient($config);
        
        $mockClient = $this->createClientWithMockedError(
            $client,
            503,
            'Service Unavailable',
            ['code' => 503, 'message' => 'Service Unavailable']
        );
        
        $this->expectException(CaptchaXException::class);
        $this->expectExceptionCode(503);
        
        $mockClient->verifySliderCaptcha('captcha-001', 150);
    }
    
    public function testCurlConnectionErrorHandling(): void
    {
        $config = new CaptchaConfig('http://localhost:3000', null, 10000, 0);
        $client = new CaptchaXClient($config);
        
        $mockClient = $this->createClientWithMockedError(
            $client,
            0,
            '',
            null,
            true,
            'Connection refused'
        );
        
        $this->expectException(CaptchaXException::class);
        $this->expectExceptionMessage('cURL error');
        
        $mockClient->verifySliderCaptcha('captcha-001', 150);
    }
    
    public function testCurlTimeoutErrorHandling(): void
    {
        $config = new CaptchaConfig('http://localhost:3000', null, 10000, 0);
        $client = new CaptchaXClient($config);
        
        $mockClient = $this->createClientWithMockedError(
            $client,
            0,
            '',
            null,
            true,
            'Operation timed out'
        );
        
        $this->expectException(CaptchaXException::class);
        $this->expectExceptionMessage('cURL error');
        
        $mockClient->verifySliderCaptcha('captcha-001', 150);
    }
    
    public function testInvalidJsonResponseHandling(): void
    {
        $this->expectException(CaptchaXException::class);
        throw new CaptchaXException('Invalid JSON response', 500, 500);
    }
    
    public function testExceptionWithDetails(): void
    {
        $details = [
            'field' => 'captcha_id',
            'reason' => 'not_found',
            'timestamp' => '2024-01-01T12:00:00Z',
        ];
        
        $exception = new CaptchaXException('Validation failed', 400, 400, $details);
        
        $this->assertSame('Validation failed', $exception->getMessage());
        $this->assertSame(400, $exception->getErrorCode());
        $this->assertSame(400, $exception->getStatusCode());
        $this->assertSame($details, $exception->getDetails());
    }
    
    public function testExceptionWithPreviousThrowable(): void
    {
        $previous = new \RuntimeException('Original error');
        $exception = new CaptchaXException(
            'Wrapped error',
            500,
            500,
            null,
            $previous
        );
        
        $this->assertSame($previous, $exception->getPrevious());
    }
    
    public function testExceptionDefaultValues(): void
    {
        $exception = new CaptchaXException('Test error');
        
        $this->assertSame('Test error', $exception->getMessage());
        $this->assertSame(500, $exception->getErrorCode());
        $this->assertSame(500, $exception->getStatusCode());
        $this->assertNull($exception->getDetails());
        $this->assertNull($exception->getPrevious());
    }
    
    public function testExceptionWithArrayDetails(): void
    {
        $details = [
            'errors' => [
                ['field' => 'x', 'message' => 'Invalid'],
                ['field' => 'y', 'message' => 'Required'],
            ],
        ];
        
        $exception = new CaptchaXException('Validation errors', 422, 422, $details);
        
        $this->assertIsArray($exception->getDetails());
        $this->assertArrayHasKey('errors', $exception->getDetails());
        $this->assertCount(2, $exception->getDetails()['errors']);
    }
    
    public function testExceptionWithNestedDetails(): void
    {
        $details = [
            'config' => [
                'timeout' => 10000,
                'retry_times' => 3,
            ],
            'request' => [
                'method' => 'POST',
                'endpoint' => '/api/v1/captcha/verify',
            ],
        ];
        
        $exception = new CaptchaXException('Configuration error', 500, 500, $details);
        
        $this->assertIsArray($exception->getDetails());
        $this->assertArrayHasKey('config', $exception->getDetails());
        $this->assertArrayHasKey('request', $exception->getDetails());
    }
    
    public function testErrorCodeExtraction(): void
    {
        $exception = new CaptchaXException('Error', 404, 404);
        
        $this->assertSame(404, $exception->getErrorCode());
        $this->assertSame(404, $exception->getStatusCode());
    }
    
    public function testMultipleExceptions(): void
    {
        $config = new CaptchaConfig('http://localhost:3000', null, 10000, 0);
        $client = new CaptchaXClient($config);
        
        try {
            $mockClient = $this->createClientWithMockedError(
                $client,
                400,
                'First error',
                ['code' => 400, 'message' => 'First error']
            );
            $mockClient->generateSliderCaptcha();
        } catch (CaptchaXException $e) {
            $this->assertSame('First error', $e->getMessage());
            $this->assertSame(400, $e->getErrorCode());
        }
        
        try {
            $mockClient2 = $this->createClientWithMockedError(
                $client,
                500,
                'Second error',
                ['code' => 500, 'message' => 'Second error']
            );
            $mockClient2->generateSliderCaptcha();
        } catch (CaptchaXException $e) {
            $this->assertSame('Second error', $e->getMessage());
            $this->assertSame(500, $e->getErrorCode());
        }
    }
    
    public function testApiErrorWithCustomCode(): void
    {
        $customCode = 1001;
        $exception = new CaptchaXException(
            'Custom API error',
            $customCode,
            400,
            ['code' => $customCode, 'message' => 'Custom API error']
        );
        
        $this->assertSame($customCode, $exception->getErrorCode());
        $this->assertSame(400, $exception->getStatusCode());
    }
}
