using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using Moq;
using Moq.Protected;
using Xunit;

namespace CaptchaX.SDK.Tests;

public class CaptchaXClientRetryTests
{
    private readonly Mock<HttpMessageHandler> _mockHandler;
    private readonly HttpClient _httpClient;
    private readonly CaptchaConfig _config;

    public CaptchaXClientRetryTests()
    {
        _mockHandler = new Mock<HttpMessageHandler>();
        _httpClient = new HttpClient(_mockHandler.Object)
        {
            BaseAddress = new Uri("https://api.example.com/")
        };
        _config = new CaptchaConfig("https://api.example.com")
        {
            AppId = "test-app-id",
            Timeout = 5000,
            RetryTimes = 3,
            ApiVersion = ApiVersion.V1
        };
    }

    private CaptchaXClient CreateClient()
    {
        return new CaptchaXClient(_config, _httpClient);
    }

    [Fact]
    public async Task HealthCheckAsync_WithTransientFailure_RetriesAndSucceeds()
    {
        var callCount = 0;
        var jsonResponse = @"{
            ""code"": 0,
            ""message"": ""success"",
            ""data"": {
                ""status"": ""healthy"",
                ""service"": ""captchax"",
                ""timestamp"": ""2024-01-01T00:00:00Z"",
                ""version"": ""1.0.0""
            }
        }";

        _mockHandler
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(() =>
            {
                callCount++;
                if (callCount < 2)
                {
                    throw new HttpRequestException("Temporary failure");
                }
                return new HttpResponseMessage
                {
                    StatusCode = HttpStatusCode.OK,
                    Content = new StringContent(jsonResponse)
                };
            });

        var client = CreateClient();
        var result = await client.HealthCheckAsync();

        callCount.Should().BeGreaterThanOrEqualTo(2);
        result.Should().NotBeNull();
        result.Status.Should().Be("healthy");
    }

    [Fact]
    public async Task GenerateSliderCaptchaAsync_WithTransientFailure_RetriesAndSucceeds()
    {
        var callCount = 0;
        var jsonResponse = @"{
            ""code"": 0,
            ""message"": ""success"",
            ""data"": {
                ""id"": ""captcha-123"",
                ""background_b64"": ""base64background"",
                ""slider_b64"": ""base64slider"",
                ""target_x"": 100,
                ""target_y"": 50
            }
        }";

        _mockHandler
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(() =>
            {
                callCount++;
                if (callCount < 3)
                {
                    throw new TaskCanceledException();
                }
                return new HttpResponseMessage
                {
                    StatusCode = HttpStatusCode.OK,
                    Content = new StringContent(jsonResponse)
                };
            });

        var client = CreateClient();
        var result = await client.GenerateSliderCaptchaAsync();

        callCount.Should().BeGreaterThanOrEqualTo(3);
        result.Should().NotBeNull();
        result.Id.Should().Be("captcha-123");
    }

    [Fact]
    public async Task VerifySliderCaptchaAsync_WithMultipleTransientFailures_RetriesAndSucceeds()
    {
        var callCount = 0;
        var jsonResponse = @"{
            ""code"": 0,
            ""message"": ""success"",
            ""data"": {
                ""success"": true,
                ""message"": ""Verification passed""
            }
        }";

        _mockHandler
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(() =>
            {
                callCount++;
                if (callCount < _config.RetryTimes)
                {
                    throw new OperationCanceledException();
                }
                return new HttpResponseMessage
                {
                    StatusCode = HttpStatusCode.OK,
                    Content = new StringContent(jsonResponse)
                };
            });

        var client = CreateClient();
        var result = await client.VerifySliderCaptchaAsync("captcha-123", 0.95);

        callCount.Should().BeGreaterThanOrEqualTo(_config.RetryTimes);
        result.Should().NotBeNull();
        result.Success.Should().BeTrue();
    }

    [Fact]
    public async Task BatchVerifyAsync_WithTransientFailure_RetriesAndSucceeds()
    {
        var callCount = 0;
        var jsonResponse = @"{
            ""code"": 0,
            ""message"": ""success"",
            ""data"": {
                ""results"": [{""captcha_id"": ""captcha-1"", ""success"": true, ""message"": ""OK""}],
                ""summary"": {""total"": 1, ""success"": 1, ""failed"": 0, ""skipped"": 0}
            }
        }";

        _mockHandler
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(() =>
            {
                callCount++;
                if (callCount < 2)
                {
                    throw new HttpRequestException("Connection reset");
                }
                return new HttpResponseMessage
                {
                    StatusCode = HttpStatusCode.OK,
                    Content = new StringContent(jsonResponse)
                };
            });

        var client = CreateClient();
        var items = new List<BatchVerifyItem>
        {
            new BatchVerifyItem { CaptchaId = "captcha-1", Type = "slider", TargetX = 100 }
        };

        var result = await client.BatchVerifyAsync(items);

        callCount.Should().BeGreaterOrEqualTo(2);
        result.Should().NotBeNull();
        result.Summary.Total.Should().Be(1);
    }

    [Fact]
    public async Task HealthCheckAsync_WithPersistentFailure_ThrowsAfterMaxRetries()
    {
        var callCount = 0;

        _mockHandler
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ThrowsAsync(() =>
            {
                callCount++;
                return new HttpRequestException("Persistent failure");
            });

        var client = CreateClient();

        var exception = await Assert.ThrowsAsync<CaptchaXException>(
            () => client.HealthCheckAsync());

        callCount.Should().Be(_config.RetryTimes);
        exception.Should().NotBeNull();
        exception.Message.Should().Contain("failed after");
    }

    [Fact]
    public async Task HealthCheckAsync_WithRetryCountZero_ThrowsImmediately()
    {
        var config = new CaptchaConfig("https://api.example.com")
        {
            RetryTimes = 0
        };

        var callCount = 0;

        _mockHandler
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ThrowsAsync(() =>
            {
                callCount++;
                return new HttpRequestException("Error");
            });

        var client = new CaptchaXClient(config, _httpClient);

        var exception = await Assert.ThrowsAsync<CaptchaXException>(
            () => client.HealthCheckAsync());

        callCount.Should().Be(0);
    }

    [Fact]
    public async Task HealthCheckAsync_WithNonRetryableException_ThrowsImmediately()
    {
        var callCount = 0;

        _mockHandler
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ThrowsAsync(() =>
            {
                callCount++;
                return new InvalidOperationException("Non-retryable error");
            });

        var client = CreateClient();

        var exception = await Assert.ThrowsAsync<CaptchaXException>(
            () => client.HealthCheckAsync());

        callCount.Should().Be(1);
        exception.InnerException.Should().BeOfType<InvalidOperationException>();
    }

    [Fact]
    public async Task GenerateClickCaptchaAsync_WithTransientFailure_RetriesAndSucceeds()
    {
        var callCount = 0;
        var jsonResponse = @"{
            ""code"": 0,
            ""message"": ""success"",
            ""data"": {
                ""id"": ""click-456"",
                ""image"": ""base64image"",
                ""target_chars"": [""A"", ""B"", ""C""],
                ""char_positions"": [
                    { ""char"": ""A"", ""x"": 100, ""y"": 50 },
                    { ""char"": ""B"", ""x"": 200, ""y"": 100 },
                    { ""char"": ""C"", ""x"": 300, ""y"": 150 }
                ]
            }
        }";

        _mockHandler
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(() =>
            {
                callCount++;
                if (callCount < 2)
                {
                    throw new HttpRequestException("Timeout");
                }
                return new HttpResponseMessage
                {
                    StatusCode = HttpStatusCode.OK,
                    Content = new StringContent(jsonResponse)
                };
            });

        var client = CreateClient();
        var result = await client.GenerateClickCaptchaAsync();

        callCount.Should().BeGreaterOrEqualTo(2);
        result.Should().NotBeNull();
        result.Id.Should().Be("click-456");
    }

    [Fact]
    public async Task GeneratePuzzleCaptchaAsync_WithTransientFailure_RetriesAndSucceeds()
    {
        var callCount = 0;
        var jsonResponse = @"{
            ""code"": 0,
            ""message"": ""success"",
            ""data"": {
                ""id"": ""puzzle-789"",
                ""background_b64"": ""base64bg"",
                ""puzzle_b64"": ""base64puzzle"",
                ""target_x"": 150,
                ""target_y"": 75
            }
        }";

        _mockHandler
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(() =>
            {
                callCount++;
                if (callCount < 2)
                {
                    throw new TaskCanceledException();
                }
                return new HttpResponseMessage
                {
                    StatusCode = HttpStatusCode.OK,
                    Content = new StringContent(jsonResponse)
                };
            });

        var client = CreateClient();
        var result = await client.GeneratePuzzleCaptchaAsync();

        callCount.Should().BeGreaterOrEqualTo(2);
        result.Should().NotBeNull();
        result.Id.Should().Be("puzzle-789");
    }

    [Fact]
    public async Task CreateScenarioAsync_WithTransientFailure_RetriesAndSucceeds()
    {
        var callCount = 0;
        var jsonResponse = @"{
            ""code"": 0,
            ""message"": ""success"",
            ""data"": {
                ""id"": ""scenario-new"",
                ""name"": ""New Scenario"",
                ""description"": ""A new scenario"",
                ""difficulty"": ""easy""
            }
        }";

        _mockHandler
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(() =>
            {
                callCount++;
                if (callCount < 2)
                {
                    throw new HttpRequestException("Service unavailable");
                }
                return new HttpResponseMessage
                {
                    StatusCode = HttpStatusCode.OK,
                    Content = new StringContent(jsonResponse)
                };
            });

        var client = CreateClient();
        var result = await client.CreateScenarioAsync("New Scenario", "A new scenario", "easy");

        callCount.Should().BeGreaterOrEqualTo(2);
        result.Should().NotBeNull();
        result.Name.Should().Be("New Scenario");
    }

    [Fact]
    public async Task CreateWebhookAsync_WithTransientFailure_RetriesAndSucceeds()
    {
        var callCount = 0;
        var jsonResponse = @"{
            ""code"": 0,
            ""message"": ""success"",
            ""data"": {
                ""id"": ""webhook-new"",
                ""app_id"": ""app-123"",
                ""url"": ""https://example.com/newhook"",
                ""events"": [""verify.success""],
                ""enabled"": true
            }
        }";

        _mockHandler
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(() =>
            {
                callCount++;
                if (callCount < 2)
                {
                    throw new OperationCanceledException();
                }
                return new HttpResponseMessage
                {
                    StatusCode = HttpStatusCode.OK,
                    Content = new StringContent(jsonResponse)
                };
            });

        var client = CreateClient();
        var result = await client.CreateWebhookAsync(
            "https://example.com/newhook",
            new List<string> { "verify.success" });

        callCount.Should().BeGreaterOrEqualTo(2);
        result.Should().NotBeNull();
        result.Url.Should().Be("https://example.com/newhook");
    }

    [Fact]
    public async Task VerifySliderCaptchaAsync_WithExponentialBackoff_RetriesCorrectly()
    {
        var callTimestamps = new List<DateTime>();
        var callCount = 0;
        var jsonResponse = @"{
            ""code"": 0,
            ""message"": ""success"",
            ""data"": {
                ""success"": true,
                ""message"": ""Verification passed""
            }
        }";

        _mockHandler
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(() =>
            {
                callTimestamps.Add(DateTime.UtcNow);
                callCount++;
                if (callCount < 3)
                {
                    throw new HttpRequestException("Temporary failure");
                }
                return new HttpResponseMessage
                {
                    StatusCode = HttpStatusCode.OK,
                    Content = new StringContent(jsonResponse)
                };
            });

        var client = CreateClient();
        var result = await client.VerifySliderCaptchaAsync("captcha-123", 0.95);

        callCount.Should().Be(3);
        result.Should().NotBeNull();
        result.Success.Should().BeTrue();

        if (callTimestamps.Count >= 3)
        {
            var firstDelay = (callTimestamps[1] - callTimestamps[0]).TotalMilliseconds;
            var secondDelay = (callTimestamps[2] - callTimestamps[1]).TotalMilliseconds;
            
            firstDelay.Should().BeGreaterOrEqualTo(400);
            secondDelay.Should().BeGreaterThan(firstDelay);
        }
    }

    [Fact]
    public async Task GetScenarioAsync_WithTransientFailure_RetriesAndSucceeds()
    {
        var callCount = 0;
        var jsonResponse = @"{
            ""code"": 0,
            ""message"": ""success"",
            ""data"": {
                ""id"": ""scenario-123"",
                ""name"": ""Test Scenario"",
                ""description"": ""Test"",
                ""difficulty"": ""hard""
            }
        }";

        _mockHandler
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(() =>
            {
                callCount++;
                if (callCount < 2)
                {
                    throw new HttpRequestException("Connection timeout");
                }
                return new HttpResponseMessage
                {
                    StatusCode = HttpStatusCode.OK,
                    Content = new StringContent(jsonResponse)
                };
            });

        var client = CreateClient();
        var result = await client.GetScenarioAsync("scenario-123");

        callCount.Should().BeGreaterOrEqualTo(2);
        result.Should().NotBeNull();
        result.Id.Should().Be("scenario-123");
    }

    [Fact]
    public async Task UpdateScenarioAsync_WithTransientFailure_RetriesAndSucceeds()
    {
        var callCount = 0;
        var jsonResponse = @"{
            ""code"": 0,
            ""message"": ""success"",
            ""data"": {
                ""id"": ""scenario-123"",
                ""name"": ""Updated Scenario"",
                ""description"": ""Updated"",
                ""difficulty"": ""hard""
            }
        }";

        _mockHandler
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(() =>
            {
                callCount++;
                if (callCount < 2)
                {
                    throw new TaskCanceledException();
                }
                return new HttpResponseMessage
                {
                    StatusCode = HttpStatusCode.OK,
                    Content = new StringContent(jsonResponse)
                };
            });

        var client = CreateClient();
        var result = await client.UpdateScenarioAsync("scenario-123", "Updated Scenario");

        callCount.Should().BeGreaterOrEqualTo(2);
        result.Should().NotBeNull();
        result.Name.Should().Be("Updated Scenario");
    }

    [Fact]
    public async Task GetWebhookAsync_WithTransientFailure_RetriesAndSucceeds()
    {
        var callCount = 0;
        var jsonResponse = @"{
            ""code"": 0,
            ""message"": ""success"",
            ""data"": {
                ""id"": ""webhook-123"",
                ""app_id"": ""app-123"",
                ""url"": ""https://example.com/webhook"",
                ""events"": [""verify.success""],
                ""enabled"": true
            }
        }";

        _mockHandler
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(() =>
            {
                callCount++;
                if (callCount < 2)
                {
                    throw new HttpRequestException("Network error");
                }
                return new HttpResponseMessage
                {
                    StatusCode = HttpStatusCode.OK,
                    Content = new StringContent(jsonResponse)
                };
            });

        var client = CreateClient();
        var result = await client.GetWebhookAsync("webhook-123");

        callCount.Should().BeGreaterOrEqualTo(2);
        result.Should().NotBeNull();
        result.Id.Should().Be("webhook-123");
    }

    [Fact]
    public async Task UpdateWebhookAsync_WithTransientFailure_RetriesAndSucceeds()
    {
        var callCount = 0;
        var jsonResponse = @"{
            ""code"": 0,
            ""message"": ""success"",
            ""data"": {
                ""id"": ""webhook-123"",
                ""app_id"": ""app-123"",
                ""url"": ""https://example.com/updated"",
                ""events"": [""verify.success"", ""verify.fail""],
                ""enabled"": true
            }
        }";

        _mockHandler
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(() =>
            {
                callCount++;
                if (callCount < 2)
                {
                    throw new OperationCanceledException();
                }
                return new HttpResponseMessage
                {
                    StatusCode = HttpStatusCode.OK,
                    Content = new StringContent(jsonResponse)
                };
            });

        var client = CreateClient();
        var result = await client.UpdateWebhookAsync(
            "webhook-123",
            url: "https://example.com/updated");

        callCount.Should().BeGreaterOrEqualTo(2);
        result.Should().NotBeNull();
        result.Url.Should().Be("https://example.com/updated");
    }
}
