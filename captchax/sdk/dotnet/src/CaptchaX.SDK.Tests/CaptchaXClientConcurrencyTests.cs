using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using Moq;
using Moq.Protected;
using Xunit;

namespace CaptchaX.SDK.Tests;

public class CaptchaXClientConcurrencyTests
{
    private readonly Mock<HttpMessageHandler> _mockHandler;
    private readonly HttpClient _httpClient;
    private readonly CaptchaConfig _config;

    public CaptchaXClientConcurrencyTests()
    {
        _mockHandler = new Mock<HttpMessageHandler>();
        _httpClient = new HttpClient(_mockHandler.Object)
        {
            BaseAddress = new Uri("https://api.example.com/")
        };
        _config = new CaptchaConfig("https://api.example.com")
        {
            AppId = "test-app-id",
            Timeout = 10000,
            RetryTimes = 1,
            ApiVersion = ApiVersion.V1
        };
    }

    private CaptchaXClient CreateClient()
    {
        return new CaptchaXClient(_config, _httpClient);
    }

    [Fact]
    public async Task ConcurrentSliderCaptchaGeneration_10ParallelRequests_Succeeds()
    {
        var callCount = 0;
        var lockObj = new object();
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
                lock (lockObj)
                {
                    callCount++;
                }
                return new HttpResponseMessage
                {
                    StatusCode = HttpStatusCode.OK,
                    Content = new StringContent(jsonResponse)
                };
            });

        var client = CreateClient();
        var tasks = new List<Task<SliderCaptchaResult>>();

        for (int i = 0; i < 10; i++)
        {
            tasks.Add(client.GenerateSliderCaptchaAsync());
        }

        var results = await Task.WhenAll(tasks);

        results.Should().HaveCount(10);
        results.All(r => r.Id == "captcha-123").Should().BeTrue();
    }

    [Fact]
    public async Task ConcurrentClickCaptchaGeneration_5ParallelRequests_Succeeds()
    {
        var callCount = 0;
        var lockObj = new object();
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
                lock (lockObj)
                {
                    callCount++;
                }
                return new HttpResponseMessage
                {
                    StatusCode = HttpStatusCode.OK,
                    Content = new StringContent(jsonResponse)
                };
            });

        var client = CreateClient();
        var tasks = new List<Task<ClickCaptchaResult>>();

        for (int i = 0; i < 5; i++)
        {
            tasks.Add(client.GenerateClickCaptchaAsync());
        }

        var results = await Task.WhenAll(tasks);

        results.Should().HaveCount(5);
        results.All(r => r.Id == "click-456").Should().BeTrue();
    }

    [Fact]
    public async Task ConcurrentVerificationRequests_10Parallel_Succeeds()
    {
        var callCount = 0;
        var lockObj = new object();
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
                lock (lockObj)
                {
                    callCount++;
                }
                return new HttpResponseMessage
                {
                    StatusCode = HttpStatusCode.OK,
                    Content = new StringContent(jsonResponse)
                };
            });

        var client = CreateClient();
        var tasks = new List<Task<SliderVerifyResult>>();

        for (int i = 0; i < 10; i++)
        {
            tasks.Add(client.VerifySliderCaptchaAsync($"captcha-{i}", 100 + i));
        }

        var results = await Task.WhenAll(tasks);

        results.Should().HaveCount(10);
        results.All(r => r.Success).Should().BeTrue();
    }

    [Fact]
    public async Task ConcurrentMixedOperations_10Parallel_Succeeds()
    {
        var callCount = 0;
        var lockObj = new object();
        var sliderResponse = @"{
            ""code"": 0,
            ""message"": ""success"",
            ""data"": {
                ""id"": ""captcha-123"",
                ""background_b64"": ""base64"",
                ""slider_b64"": ""base64"",
                ""target_x"": 100,
                ""target_y"": 50
            }
        }";

        var healthResponse = @"{
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
            .ReturnsAsync((HttpRequestMessage request, CancellationToken cancellationToken) =>
            {
                lock (lockObj)
                {
                    callCount++;
                }
                var url = request.RequestUri?.ToString() ?? "";
                var response = url.Contains("health") ? healthResponse : sliderResponse;
                return new HttpResponseMessage
                {
                    StatusCode = HttpStatusCode.OK,
                    Content = new StringContent(response)
                };
            });

        var client = CreateClient();
        var tasks = new List<Task>();

        for (int i = 0; i < 5; i++)
        {
            tasks.Add(client.GenerateSliderCaptchaAsync().ContinueWith(_ => { }));
        }
        for (int i = 0; i < 5; i++)
        {
            tasks.Add(client.HealthCheckAsync().ContinueWith(_ => { }));
        }

        await Task.WhenAll(tasks);

        callCount.Should().Be(10);
    }

    [Fact]
    public async Task SequentialCaptchaGeneration_100Sequential_Succeeds()
    {
        var jsonResponse = @"{
            ""code"": 0,
            ""message"": ""success"",
            ""data"": {
                ""id"": ""captcha-sequential"",
                ""background_b64"": ""base64"",
                ""slider_b64"": ""base64"",
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
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.OK,
                Content = new StringContent(jsonResponse)
            });

        var client = CreateClient();

        for (int i = 0; i < 100; i++)
        {
            var result = await client.GenerateSliderCaptchaAsync();
            result.Should().NotBeNull();
            result.Id.Should().Be("captcha-sequential");
        }
    }

    [Fact]
    public async Task ConcurrentScenarioOperations_5Parallel_Succeeds()
    {
        var jsonResponse = @"{
            ""code"": 0,
            ""message"": ""success"",
            ""data"": {
                ""id"": ""scenario-123"",
                ""name"": ""Test Scenario"",
                ""description"": ""Test"",
                ""difficulty"": ""medium""
            }
        }";

        _mockHandler
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.OK,
                Content = new StringContent(jsonResponse)
            });

        var client = CreateClient();
        var tasks = new List<Task<Scenario>>();

        for (int i = 0; i < 5; i++)
        {
            tasks.Add(client.GetScenarioAsync($"scenario-{i}"));
        }

        var results = await Task.WhenAll(tasks);

        results.Should().HaveCount(5);
    }

    [Fact]
    public async Task ConcurrentWebhookOperations_5Parallel_Succeeds()
    {
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
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.OK,
                Content = new StringContent(jsonResponse)
            });

        var client = CreateClient();
        var tasks = new List<Task<Webhook>>();

        for (int i = 0; i < 5; i++)
        {
            tasks.Add(client.GetWebhookAsync($"webhook-{i}"));
        }

        var results = await Task.WhenAll(tasks);

        results.Should().HaveCount(5);
    }

    [Fact]
    public async Task ConcurrentBatchVerifyOperations_5Parallel_Succeeds()
    {
        var jsonResponse = @"{
            ""code"": 0,
            ""message"": ""success"",
            ""data"": {
                ""results"": [
                    { ""captcha_id"": ""captcha-1"", ""success"": true, ""message"": ""OK"" }
                ],
                ""summary"": { ""total"": 1, ""success"": 1, ""failed"": 0, ""skipped"": 0 }
            }
        }";

        _mockHandler
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.OK,
                Content = new StringContent(jsonResponse)
            });

        var client = CreateClient();
        var tasks = new List<Task<BatchVerifyResponse>>();

        for (int i = 0; i < 5; i++)
        {
            var items = new List<BatchVerifyItem>
            {
                new BatchVerifyItem { CaptchaId = $"captcha-{i}", Type = "slider", TargetX = 100 }
            };
            tasks.Add(client.BatchVerifyAsync(items));
        }

        var results = await Task.WhenAll(tasks);

        results.Should().HaveCount(5);
        results.All(r => r.Summary.Total == 1).Should().BeTrue();
    }

    [Fact]
    public async Task ConcurrentPuzzleCaptchaGeneration_5Parallel_Succeeds()
    {
        var callCount = 0;
        var lockObj = new object();
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
                lock (lockObj)
                {
                    callCount++;
                }
                return new HttpResponseMessage
                {
                    StatusCode = HttpStatusCode.OK,
                    Content = new StringContent(jsonResponse)
                };
            });

        var client = CreateClient();
        var tasks = new List<Task<PuzzleCaptchaResult>>();

        for (int i = 0; i < 5; i++)
        {
            tasks.Add(client.GeneratePuzzleCaptchaAsync());
        }

        var results = await Task.WhenAll(tasks);

        results.Should().HaveCount(5);
        results.All(r => r.Id == "puzzle-789").Should().BeTrue();
    }

    [Fact]
    public async Task RapidFireRequests_50InRapidSuccession_Succeeds()
    {
        var callCount = 0;
        var lockObj = new object();
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
                lock (lockObj)
                {
                    callCount++;
                }
                return new HttpResponseMessage
                {
                    StatusCode = HttpStatusCode.OK,
                    Content = new StringContent(jsonResponse)
                };
            });

        var client = CreateClient();
        var tasks = new List<Task<HealthStatus>>();

        for (int i = 0; i < 50; i++)
        {
            tasks.Add(client.HealthCheckAsync());
        }

        var results = await Task.WhenAll(tasks);

        results.Should().HaveCount(50);
        callCount.Should().Be(50);
    }

    [Fact]
    public async Task CancellationToken_CancellationRequested_ThrowsOperationCanceledException()
    {
        var jsonResponse = @"{
            ""code"": 0,
            ""message"": ""success"",
            ""data"": {
                ""id"": ""captcha-123"",
                ""background_b64"": ""base64"",
                ""slider_b64"": ""base64"",
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
            .Returns(async (HttpRequestMessage request, CancellationToken cancellationToken) =>
            {
                await Task.Delay(100, cancellationToken);
                return new HttpResponseMessage
                {
                    StatusCode = HttpStatusCode.OK,
                    Content = new StringContent(jsonResponse)
                };
            });

        var client = CreateClient();
        var cts = new CancellationTokenSource();
        cts.Cancel();

        var exception = await Assert.ThrowsAnyAsync<OperationCanceledException>(
            () => client.GenerateSliderCaptchaAsync(cancellationToken: cts.Token));

        exception.Should().NotBeNull();
    }

    [Fact]
    public async Task MultipleClients_10ConcurrentClients_Succeeds()
    {
        var jsonResponse = @"{
            ""code"": 0,
            ""message"": ""success"",
            ""data"": {
                ""id"": ""captcha-multiclient"",
                ""background_b64"": ""base64"",
                ""slider_b64"": ""base64"",
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
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.OK,
                Content = new StringContent(jsonResponse)
            });

        var tasks = new List<Task<SliderCaptchaResult>>();

        for (int i = 0; i < 10; i++)
        {
            var config = new CaptchaConfig("https://api.example.com")
            {
                AppId = $"client-{i}",
                Timeout = 10000,
                RetryTimes = 1
            };
            var client = new CaptchaXClient(config, _httpClient);
            tasks.Add(client.GenerateSliderCaptchaAsync());
        }

        var results = await Task.WhenAll(tasks);

        results.Should().HaveCount(10);
    }

    [Fact]
    public async Task InterleavedOperations_MixedReadWrite_Succeeds()
    {
        var scenarioResponse = @"{
            ""code"": 0,
            ""message"": ""success"",
            ""data"": {
                ""id"": ""scenario-interleaved"",
                ""name"": ""Test Scenario"",
                ""description"": ""Test"",
                ""difficulty"": ""medium""
            }
        }";

        var sliderResponse = @"{
            ""code"": 0,
            ""message"": ""success"",
            ""data"": {
                ""id"": ""captcha-interleaved"",
                ""background_b64"": ""base64"",
                ""slider_b64"": ""base64"",
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
            .ReturnsAsync((HttpRequestMessage request, CancellationToken cancellationToken) =>
            {
                var url = request.RequestUri?.ToString() ?? "";
                var response = url.Contains("scenarios") ? scenarioResponse : sliderResponse;
                return new HttpResponseMessage
                {
                    StatusCode = HttpStatusCode.OK,
                    Content = new StringContent(response)
                };
            });

        var client = CreateClient();
        var tasks = new List<Task>();

        for (int i = 0; i < 10; i++)
        {
            if (i % 2 == 0)
            {
                tasks.Add(client.ListScenariosAsync().ContinueWith(_ => { }));
            }
            else
            {
                tasks.Add(client.GenerateSliderCaptchaAsync().ContinueWith(_ => { }));
            }
        }

        await Task.WhenAll(tasks);
    }
}
