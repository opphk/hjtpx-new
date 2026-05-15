<?php

declare(strict_types=1);

namespace CaptchaX\SDK\Tests;

use CaptchaX\SDK\ApiVersion;
use CaptchaX\SDK\CaptchaConfig;
use CaptchaX\SDK\CaptchaXClient;
use CaptchaX\SDK\CaptchaXException;
use CaptchaX\SDK\CharPosition;
use PHPUnit\Framework\TestCase;
use ReflectionClass;

class TypeHintingTest extends TestCase
{
    public function testCaptchaConfigWithStringBaseUrl(): void
    {
        $config = new CaptchaConfig('https://api.example.com');
        
        $this->assertSame('https://api.example.com', $config->getBaseUrl());
        $this->assertIsString($config->getBaseUrl());
    }
    
    public function testCaptchaConfigWithNullAppId(): void
    {
        $config = new CaptchaConfig('https://api.example.com', null);
        
        $this->assertNull($config->getAppId());
    }
    
    public function testCaptchaConfigWithIntTimeout(): void
    {
        $config = new CaptchaConfig('https://api.example.com', null, 5000);
        
        $this->assertSame(5000, $config->getTimeout());
        $this->assertIsInt($config->getTimeout());
    }
    
    public function testCaptchaConfigWithIntRetryTimes(): void
    {
        $config = new CaptchaConfig('https://api.example.com', null, 5000, 5);
        
        $this->assertSame(5, $config->getRetryTimes());
        $this->assertIsInt($config->getRetryTimes());
    }
    
    public function testCaptchaConfigWithStringApiVersion(): void
    {
        $config = new CaptchaConfig('https://api.example.com', null, 5000, 3, ApiVersion::V2);
        
        $this->assertSame(ApiVersion::V2, $config->getApiVersion());
        $this->assertIsString($config->getApiVersion());
    }
    
    public function testCaptchaConfigStaticCreate(): void
    {
        $config = CaptchaConfig::create('http://localhost:3000');
        
        $this->assertInstanceOf(CaptchaConfig::class, $config);
        $this->assertSame('http://localhost:3000', $config->getBaseUrl());
    }
    
    public function testCaptchaConfigWithAppId(): void
    {
        $config = new CaptchaConfig('https://api.example.com', 'my-app-id');
        
        $this->assertSame('my-app-id', $config->getAppId());
        $this->assertIsString($config->getAppId());
    }
    
    public function testCaptchaConfigWithTimeoutFluentInterface(): void
    {
        $config = (new CaptchaConfig('https://api.example.com'))
            ->withTimeout(2000)
            ->withAppId('test-app');
        
        $this->assertSame(2000, $config->getTimeout());
        $this->assertSame('test-app', $config->getAppId());
    }
    
    public function testCaptchaConfigWithRetryTimesFluentInterface(): void
    {
        $config = (new CaptchaConfig('https://api.example.com'))
            ->withRetryTimes(5)
            ->withApiVersion(ApiVersion::V2);
        
        $this->assertSame(5, $config->getRetryTimes());
        $this->assertSame(ApiVersion::V2, $config->getApiVersion());
    }
    
    public function testCaptchaXClientWithConfig(): void
    {
        $config = new CaptchaConfig('https://api.example.com', 'app-123', 10000, 3);
        $client = new CaptchaXClient($config);
        
        $this->assertInstanceOf(CaptchaXClient::class, $client);
    }
    
    public function testCaptchaXClientStaticCreate(): void
    {
        $client = CaptchaXClient::create('https://api.example.com');
        
        $this->assertInstanceOf(CaptchaXClient::class, $client);
    }
    
    public function testCaptchaXClientSetAppIdWithString(): void
    {
        $client = CaptchaXClient::create('https://api.example.com');
        
        $client->setAppId('new-app-id');
        
        $reflection = new ReflectionClass($client);
        $method = $reflection->getMethod('requireAppId');
        $method->setAccessible(true);
        
        $exception = null;
        try {
            $method->invoke($client);
        } catch (CaptchaXException $e) {
            $exception = $e;
        }
        
        $this->assertNotNull($exception);
    }
    
    public function testCaptchaXClientSetApiVersionWithString(): void
    {
        $client = CaptchaXClient::create('https://api.example.com');
        
        $client->setApiVersion(ApiVersion::V2);
        
        $this->assertSame(ApiVersion::V2, $client->getApiVersion());
    }
    
    public function testCharPositionWithStringChar(): void
    {
        $pos = new CharPosition('A', 100, 50);
        
        $this->assertSame('A', $pos->getChar());
        $this->assertIsString($pos->getChar());
    }
    
    public function testCharPositionWithIntCoordinates(): void
    {
        $pos = new CharPosition('B', 200, 150);
        
        $this->assertSame(200, $pos->getX());
        $this->assertSame(150, $pos->getY());
        $this->assertIsInt($pos->getX());
        $this->assertIsInt($pos->getY());
    }
    
    public function testCharPositionToArrayReturnsCorrectTypes(): void
    {
        $pos = new CharPosition('C', 300, 250);
        $arr = $pos->toArray();
        
        $this->assertIsArray($arr);
        $this->assertArrayHasKey('char', $arr);
        $this->assertArrayHasKey('x', $arr);
        $this->assertArrayHasKey('y', $arr);
        $this->assertIsString($arr['char']);
        $this->assertIsInt($arr['x']);
        $this->assertIsInt($arr['y']);
    }
    
    public function testCaptchaXExceptionWithStringMessage(): void
    {
        $exception = new CaptchaXException('Error message');
        
        $this->assertSame('Error message', $exception->getMessage());
        $this->assertIsString($exception->getMessage());
    }
    
    public function testCaptchaXExceptionWithIntCodes(): void
    {
        $exception = new CaptchaXException('Error', 404, 404);
        
        $this->assertSame(404, $exception->getErrorCode());
        $this->assertSame(404, $exception->getStatusCode());
        $this->assertIsInt($exception->getErrorCode());
        $this->assertIsInt($exception->getStatusCode());
    }
    
    public function testCaptchaXExceptionWithArrayDetails(): void
    {
        $details = ['key' => 'value', 'nested' => ['a' => 1, 'b' => 2]];
        $exception = new CaptchaXException('Error', 500, 500, $details);
        
        $this->assertSame($details, $exception->getDetails());
        $this->assertIsArray($exception->getDetails());
    }
    
    public function testCaptchaXExceptionWithThrowablePrevious(): void
    {
        $previous = new \InvalidArgumentException('Previous error');
        $exception = new CaptchaXException('Error', 500, 500, null, $previous);
        
        $this->assertSame($previous, $exception->getPrevious());
        $this->assertInstanceOf(\Throwable::class, $exception->getPrevious());
    }
    
    public function testApiVersionConstants(): void
    {
        $this->assertSame('v1', ApiVersion::V1);
        $this->assertSame('v2', ApiVersion::V2);
        $this->assertIsString(ApiVersion::V1);
        $this->assertIsString(ApiVersion::V2);
    }
    
    public function testClientPrivateMethodsViaReflection(): void
    {
        $client = CaptchaXClient::create('https://api.example.com');
        $reflection = new ReflectionClass($client);
        
        $getApiPrefix = $reflection->getMethod('getApiPrefix');
        $getApiPrefix->setAccessible(true);
        $apiPrefix = $getApiPrefix->invoke($client);
        
        $this->assertSame('/api/v1', $apiPrefix);
        $this->assertIsString($apiPrefix);
        
        $getBaseUrl = $reflection->getMethod('getBaseUrl');
        $getBaseUrl->setAccessible(true);
        $baseUrl = $getBaseUrl->invoke($client);
        
        $this->assertSame('https://api.example.com', $baseUrl);
        $this->assertIsString($baseUrl);
    }
    
    public function testClientPrivateMethodsWithTrailingSlash(): void
    {
        $config = new CaptchaConfig('https://api.example.com///');
        $client = new CaptchaXClient($config);
        
        $reflection = new ReflectionClass($client);
        $getBaseUrl = $reflection->getMethod('getBaseUrl');
        $getBaseUrl->setAccessible(true);
        $baseUrl = $getBaseUrl->invoke($client);
        
        $this->assertSame('https://api.example.com', $baseUrl);
    }
    
    public function testClientPrivateMethodsApiPrefixWithV2(): void
    {
        $client = CaptchaXClient::create('https://api.example.com');
        $client->setApiVersion(ApiVersion::V2);
        
        $reflection = new ReflectionClass($client);
        $getApiPrefix = $reflection->getMethod('getApiPrefix');
        $getApiPrefix->setAccessible(true);
        $apiPrefix = $getApiPrefix->invoke($client);
        
        $this->assertSame('/api/v2', $apiPrefix);
    }
    
    public function testClientHeadersViaReflection(): void
    {
        $config = new CaptchaConfig('https://api.example.com', 'app-123');
        $client = new CaptchaXClient($config);
        
        $reflection = new ReflectionClass($client);
        $headersProperty = $reflection->getProperty('headers');
        $headersProperty->setAccessible(true);
        $headers = $headersProperty->getValue($client);
        
        $this->assertIsArray($headers);
        $this->assertArrayHasKey('Content-Type', $headers);
        $this->assertArrayHasKey('Accept', $headers);
        $this->assertArrayHasKey('X-App-ID', $headers);
        $this->assertSame('app-123', $headers['X-App-ID']);
    }
    
    public function testClientHeadersWithoutAppId(): void
    {
        $config = new CaptchaConfig('https://api.example.com');
        $client = new CaptchaXClient($config);
        
        $reflection = new ReflectionClass($client);
        $headersProperty = $reflection->getProperty('headers');
        $headersProperty->setAccessible(true);
        $headers = $headersProperty->getValue($client);
        
        $this->assertArrayNotHasKey('X-App-ID', $headers);
    }
    
    public function testClientTimeoutViaReflection(): void
    {
        $config = new CaptchaConfig('https://api.example.com', null, 5000);
        $client = new CaptchaXClient($config);
        
        $reflection = new ReflectionClass($client);
        $timeoutProperty = $reflection->getProperty('timeout');
        $timeoutProperty->setAccessible(true);
        $timeout = $timeoutProperty->getValue($client);
        
        $this->assertSame(5.0, $timeout);
        $this->assertIsFloat($timeout);
    }
    
    public function testClientRetryTimesViaReflection(): void
    {
        $config = new CaptchaConfig('https://api.example.com', null, 10000, 5);
        $client = new CaptchaXClient($config);
        
        $reflection = new ReflectionClass($client);
        $retryTimesProperty = $reflection->getProperty('retryTimes');
        $retryTimesProperty->setAccessible(true);
        $retryTimes = $retryTimesProperty->getValue($client);
        
        $this->assertSame(5, $retryTimes);
        $this->assertIsInt($retryTimes);
    }
    
    public function testSetAppIdUpdatesHeaders(): void
    {
        $client = CaptchaXClient::create('https://api.example.com');
        
        $client->setAppId('new-app-id');
        
        $reflection = new ReflectionClass($client);
        $headersProperty = $reflection->getProperty('headers');
        $headersProperty->setAccessible(true);
        $headers = $headersProperty->getValue($client);
        
        $this->assertSame('new-app-id', $headers['X-App-ID']);
    }
}
