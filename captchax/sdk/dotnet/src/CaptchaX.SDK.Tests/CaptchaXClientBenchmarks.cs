using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using BenchmarkDotNet.Attributes;
using BenchmarkDotNet.Running;
using CaptchaX.SDK;
using Moq;
using Moq.Protected;

namespace CaptchaX.SDK.Benchmarks;

[MemoryDiagnoser]
[Orderer(BenchmarkDotNet.Order.SummaryOrderPolicy.FastestToSlowest)]
[RankColumn]
public class CaptchaXClientBenchmarks
{
    private CaptchaXClient? _client;
    private Mock<HttpMessageHandler>? _mockHandler;
    private HttpClient? _httpClient;
    private CaptchaConfig? _config;

    private readonly string _sliderCaptchaResponse = @"{
        ""code"": 0,
        ""message"": ""success"",
        ""data"": {
            ""id"": ""captcha-123"",
            ""background_b64"": ""base64backgrounddata"",
            ""slider_b64"": ""base64sliderdata"",
            ""target_x"": 100,
            ""target_y"": 50
        }
    }";

    private readonly string _clickCaptchaResponse = @"{
        ""code"": 0,
        ""message"": ""success"",
        ""data"": {
            ""id"": ""click-456"",
            ""image"": ""base64imagedata"",
            ""target_chars"": [""A"", ""B"", ""C""],
            ""char_positions"": [
                { ""char"": ""A"", ""x"": 100, ""y"": 50 },
                { ""char"": ""B"", ""x"": 200, ""y"": 100 },
                { ""char"": ""C"", ""x"": 300, ""y"": 150 }
            ]
        }
    }";

    private readonly string _puzzleCaptchaResponse = @"{
        ""code"": 0,
        ""message"": ""success"",
        ""data"": {
            ""id"": ""puzzle-789"",
            ""background_b64"": ""base64bgdata"",
            ""puzzle_b64"": ""base64puzzledata"",
            ""target_x"": 150,
            ""target_y"": 75
        }
    }";

    private readonly string _verifySuccessResponse = @"{
        ""code"": 0,
        ""message"": ""success"",
        ""data"": {
            ""success"": true,
            ""message"": ""Verification passed""
        }
    }";

    private readonly string _clickVerifySuccessResponse = @"{
        ""code"": 0,
        ""message"": ""success"",
        ""data"": {
            ""success"": true,
            ""score"": 0.95,
            ""message"": ""Verification passed""
        }
    }";

    private readonly string _healthCheckResponse = @"{
        ""code"": 0,
        ""message"": ""success"",
        ""data"": {
            ""status"": ""healthy"",
            ""service"": ""captchax"",
            ""timestamp"": ""2024-01-01T00:00:00Z"",
            ""version"": ""1.0.0""
        }
    }";

    private readonly string _batchVerifyResponse = @"{
        ""code"": 0,
        ""message"": ""success"",
        ""data"": {
            ""results"": [
                { ""captcha_id"": ""captcha-1"", ""success"": true, ""message"": ""OK"" },
                { ""captcha_id"": ""captcha-2"", ""success"": true, ""message"": ""OK"" }
            ],
            ""summary"": {
                ""total"": 2,
                ""success"": 2,
                ""failed"": 0,
                ""skipped"": 0
            }
        }
    }";

    private readonly string _scenarioResponse = @"{
        ""code"": 0,
        ""message"": ""success"",
        ""data"": {
            ""id"": ""scenario-123"",
            ""name"": ""Test Scenario"",
            ""description"": ""Test Description"",
            ""difficulty"": ""medium""
        }
    }";

    private readonly string _webhookResponse = @"{
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

    [GlobalSetup]
    public void Setup()
    {
        _mockHandler = new Mock<HttpMessageHandler>();
        _httpClient = new HttpClient(_mockHandler.Object)
        {
            BaseAddress = new Uri("https://api.example.com/")
        };
        _config = new CaptchaConfig("https://api.example.com")
        {
            AppId = "benchmark-app-id",
            Timeout = 30000,
            RetryTimes = 1,
            ApiVersion = ApiVersion.V1
        };
        _client = new CaptchaXClient(_config, _httpClient);

        SetupMockResponses();
    }

    private void SetupMockResponses()
    {
        _mockHandler!
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync((HttpRequestMessage request, CancellationToken cancellationToken) =>
            {
                var url = request.RequestUri?.ToString() ?? "";

                string response;
                if (url.Contains("health"))
                {
                    response = _healthCheckResponse;
                }
                else if (url.Contains("captcha/slider") && url.Contains("verify"))
                {
                    response = _verifySuccessResponse;
                }
                else if (url.Contains("captcha/slider"))
                {
                    response = _sliderCaptchaResponse;
                }
                else if (url.Contains("captcha/click") && url.Contains("verify"))
                {
                    response = _clickVerifySuccessResponse;
                }
                else if (url.Contains("captcha/click"))
                {
                    response = _clickCaptchaResponse;
                }
                else if (url.Contains("captcha/puzzle") && url.Contains("verify"))
                {
                    response = _verifySuccessResponse;
                }
                else if (url.Contains("captcha/puzzle"))
                {
                    response = _puzzleCaptchaResponse;
                }
                else if (url.Contains("captcha/batch"))
                {
                    response = _batchVerifyResponse;
                }
                else if (url.Contains("scenarios"))
                {
                    response = _scenarioResponse;
                }
                else if (url.Contains("webhooks"))
                {
                    response = _webhookResponse;
                }
                else
                {
                    response = _healthCheckResponse;
                }

                return new HttpResponseMessage
                {
                    StatusCode = HttpStatusCode.OK,
                    Content = new StringContent(response)
                };
            });
    }

    [GlobalCleanup]
    public void Cleanup()
    {
        _client?.Dispose();
        _httpClient?.Dispose();
    }

    [Benchmark]
    public async Task<HealthStatus> HealthCheckBenchmark()
    {
        return await _client!.HealthCheckAsync();
    }

    [Benchmark]
    public async Task<SliderCaptchaResult> GenerateSliderCaptchaBenchmark()
    {
        return await _client!.GenerateSliderCaptchaAsync();
    }

    [Benchmark]
    public async Task<SliderVerifyResult> VerifySliderCaptchaBenchmark()
    {
        return await _client!.VerifySliderCaptchaAsync("captcha-123", 100);
    }

    [Benchmark]
    public async Task<ClickCaptchaResult> GenerateClickCaptchaBenchmark()
    {
        return await _client!.GenerateClickCaptchaAsync();
    }

    [Benchmark]
    public async Task<ClickVerifyResult> VerifyClickCaptchaBenchmark()
    {
        var clicks = new List<CharPosition>
        {
            new CharPosition("A", 100, 50),
            new CharPosition("B", 200, 100),
            new CharPosition("C", 300, 150)
        };
        return await _client!.VerifyClickCaptchaAsync("click-456", clicks);
    }

    [Benchmark]
    public async Task<PuzzleCaptchaResult> GeneratePuzzleCaptchaBenchmark()
    {
        return await _client!.GeneratePuzzleCaptchaAsync();
    }

    [Benchmark]
    public async Task<PuzzleVerifyResult> VerifyPuzzleCaptchaBenchmark()
    {
        return await _client!.VerifyPuzzleCaptchaAsync("puzzle-789", 150);
    }

    [Benchmark]
    public async Task<BatchVerifyResponse> BatchVerifyBenchmark()
    {
        var items = new List<BatchVerifyItem>
        {
            new BatchVerifyItem { CaptchaId = "captcha-1", Type = "slider", TargetX = 100 },
            new BatchVerifyItem { CaptchaId = "captcha-2", Type = "slider", TargetX = 50 }
        };
        return await _client!.BatchVerifyAsync(items);
    }

    [Benchmark]
    public async Task<List<Scenario>> ListScenariosBenchmark()
    {
        return await _client!.ListScenariosAsync();
    }

    [Benchmark]
    public async Task<Scenario> CreateScenarioBenchmark()
    {
        return await _client!.CreateScenarioAsync("Benchmark Scenario", "Benchmark Description", "medium");
    }

    [Benchmark]
    public async Task<Scenario> GetScenarioBenchmark()
    {
        return await _client!.GetScenarioAsync("scenario-123");
    }

    [Benchmark]
    public async Task<Scenario> UpdateScenarioBenchmark()
    {
        return await _client!.UpdateScenarioAsync("scenario-123", "Updated Name");
    }

    [Benchmark]
    public async Task<List<Webhook>> ListWebhooksBenchmark()
    {
        return await _client!.ListWebhooksAsync();
    }

    [Benchmark]
    public async Task<Webhook> CreateWebhookBenchmark()
    {
        return await _client!.CreateWebhookAsync(
            "https://example.com/benchmark-webhook",
            new List<string> { "verify.success" });
    }

    [Benchmark]
    public async Task<Webhook> GetWebhookBenchmark()
    {
        return await _client!.GetWebhookAsync("webhook-123");
    }

    [Benchmark]
    public async Task<Webhook> UpdateWebhookBenchmark()
    {
        return await _client!.UpdateWebhookAsync("webhook-123", enabled: false);
    }
}

[MemoryDiagnoser]
[Orderer(BenchmarkDotNet.Order.SummaryOrderPolicy.FastestToSlowest)]
[RankColumn]
public class CaptchaXClientConcurrentBenchmarks
{
    private CaptchaXClient? _client;
    private Mock<HttpMessageHandler>? _mockHandler;
    private HttpClient? _httpClient;
    private CaptchaConfig? _config;

    [GlobalSetup]
    public void Setup()
    {
        _mockHandler = new Mock<HttpMessageHandler>();
        _httpClient = new HttpClient(_mockHandler.Object)
        {
            BaseAddress = new Uri("https://api.example.com/")
        };
        _config = new CaptchaConfig("https://api.example.com")
        {
            AppId = "concurrent-benchmark-app",
            Timeout = 30000,
            RetryTimes = 1,
            ApiVersion = ApiVersion.V1
        };
        _client = new CaptchaXClient(_config, _httpClient);

        var sliderResponse = @"{
            ""code"": 0,
            ""message"": ""success"",
            ""data"": {
                ""id"": ""captcha-concurrent"",
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
                Content = new StringContent(sliderResponse)
            });
    }

    [GlobalCleanup]
    public void Cleanup()
    {
        _client?.Dispose();
        _httpClient?.Dispose();
    }

    [Benchmark]
    public async Task ConcurrentSliderCaptchaGeneration_10Parallel()
    {
        var tasks = new List<Task<SliderCaptchaResult>>();
        for (int i = 0; i < 10; i++)
        {
            tasks.Add(_client!.GenerateSliderCaptchaAsync());
        }
        await Task.WhenAll(tasks);
    }

    [Benchmark]
    public async Task ConcurrentSliderCaptchaGeneration_50Parallel()
    {
        var tasks = new List<Task<SliderCaptchaResult>>();
        for (int i = 0; i < 50; i++)
        {
            tasks.Add(_client!.GenerateSliderCaptchaAsync());
        }
        await Task.WhenAll(tasks);
    }

    [Benchmark]
    public async Task SequentialCaptchaGeneration_10Iterations()
    {
        for (int i = 0; i < 10; i++)
        {
            await _client!.GenerateSliderCaptchaAsync();
        }
    }

    [Benchmark]
    public async Task SequentialCaptchaGeneration_100Iterations()
    {
        for (int i = 0; i < 100; i++)
        {
            await _client!.GenerateSliderCaptchaAsync();
        }
    }
}

public class BenchmarkProgram
{
    public static void Main(string[] args)
    {
        var summary = BenchmarkRunner.Run<CaptchaXClientBenchmarks>();
        Console.WriteLine("\n--- Concurrent Benchmarks ---\n");
        var concurrentSummary = BenchmarkRunner.Run<CaptchaXClientConcurrentBenchmarks>();
    }
}
