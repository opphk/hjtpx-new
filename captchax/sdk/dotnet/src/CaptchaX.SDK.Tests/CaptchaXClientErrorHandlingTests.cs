using System;
using System.Net;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using Moq;
using Moq.Protected;
using Xunit;

namespace CaptchaX.SDK.Tests;

public class CaptchaXClientErrorHandlingTests
{
    private readonly Mock<HttpMessageHandler> _mockHandler;
    private readonly HttpClient _httpClient;
    private readonly CaptchaConfig _config;

    public CaptchaXClientErrorHandlingTests()
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

    private void SetupMockResponse(string jsonContent, HttpStatusCode statusCode = HttpStatusCode.OK)
    {
        _mockHandler
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = statusCode,
                Content = new StringContent(jsonContent)
            });
    }

    private void SetupMockException(Exception exception)
    {
        _mockHandler
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ThrowsAsync(exception);
    }

    [Fact]
    public async Task HealthCheckAsync_WithHttpError_ThrowsCaptchaXException()
    {
        var jsonResponse = @"{""code"": 500, ""message"": ""Internal Server Error""}";
        SetupMockResponse(jsonResponse, HttpStatusCode.InternalServerError);

        var client = CreateClient();

        var exception = await Assert.ThrowsAsync<CaptchaXException>(
            () => client.HealthCheckAsync());

        exception.Should().NotBeNull();
        exception.Message.Should().Contain("500");
    }

    [Fact]
    public async Task HealthCheckAsync_WithHttpRequestException_ThrowsCaptchaXException()
    {
        SetupMockException(new HttpRequestException("Network error"));

        var client = CreateClient();

        var exception = await Assert.ThrowsAsync<CaptchaXException>(
            () => client.HealthCheckAsync());

        exception.Should().NotBeNull();
        exception.InnerException.Should().BeOfType<HttpRequestException>();
    }

    [Fact]
    public async Task HealthCheckAsync_WithTaskCanceledException_ThrowsCaptchaXException()
    {
        SetupMockException(new TaskCanceledException());

        var client = CreateClient();

        var exception = await Assert.ThrowsAsync<CaptchaXException>(
            () => client.HealthCheckAsync());

        exception.Should().NotBeNull();
    }

    [Fact]
    public async Task HealthCheckAsync_WithEmptyResponse_ThrowsCaptchaXException()
    {
        SetupMockResponse("{}", HttpStatusCode.OK);

        var client = CreateClient();

        var exception = await Assert.ThrowsAsync<CaptchaXException>(
            () => client.HealthCheckAsync());

        exception.Message.Should().Contain("null");
    }

    [Fact]
    public async Task HealthCheckAsync_WithNullData_ThrowsCaptchaXException()
    {
        var jsonResponse = @"{""code"": 0, ""message"": ""success"", ""data"": null}";
        SetupMockResponse(jsonResponse, HttpStatusCode.OK);

        var client = CreateClient();

        var exception = await Assert.ThrowsAsync<CaptchaXException>(
            () => client.HealthCheckAsync());

        exception.Message.Should().Contain("null");
    }

    [Fact]
    public async Task GenerateSliderCaptchaAsync_WithHttpError_ThrowsCaptchaXException()
    {
        SetupMockResponse("{\"code\": 400, \"message\": \"Bad Request\"}", HttpStatusCode.BadRequest);

        var client = CreateClient();

        var exception = await Assert.ThrowsAsync<CaptchaXException>(
            () => client.GenerateSliderCaptchaAsync());

        exception.Should().NotBeNull();
        exception.Message.Should().Contain("400");
    }

    [Fact]
    public async Task VerifySliderCaptchaAsync_WithInvalidCaptchaId_ThrowsCaptchaXException()
    {
        SetupMockResponse("{\"code\": 404, \"message\": \"Captcha not found\"}", HttpStatusCode.NotFound);

        var client = CreateClient();

        var exception = await Assert.ThrowsAsync<CaptchaXException>(
            () => client.VerifySliderCaptchaAsync("invalid-id", 100));

        exception.Should().NotBeNull();
        exception.Message.Should().Contain("404");
    }

    [Fact]
    public async Task VerifySliderCaptchaAsync_WithEmptyResponse_ThrowsCaptchaXException()
    {
        SetupMockResponse("{}", HttpStatusCode.OK);

        var client = CreateClient();

        var exception = await Assert.ThrowsAsync<CaptchaXException>(
            () => client.VerifySliderCaptchaAsync("captcha-123", 100));

        exception.Message.Should().Contain("null").Or.Contain("empty");
    }

    [Fact]
    public async Task GenerateClickCaptchaAsync_WithEmptyResponse_ThrowsCaptchaXException()
    {
        SetupMockResponse("{}", HttpStatusCode.OK);

        var client = CreateClient();

        var exception = await Assert.ThrowsAsync<CaptchaXException>(
            () => client.GenerateClickCaptchaAsync());

        exception.Message.Should().Contain("null").Or.Contain("empty");
    }

    [Fact]
    public async Task GeneratePuzzleCaptchaAsync_WithEmptyResponse_ThrowsCaptchaXException()
    {
        SetupMockResponse("{}", HttpStatusCode.OK);

        var client = CreateClient();

        var exception = await Assert.ThrowsAsync<CaptchaXException>(
            () => client.GeneratePuzzleCaptchaAsync());

        exception.Message.Should().Contain("null").Or.Contain("empty");
    }

    [Fact]
    public async Task BatchVerifyAsync_WithEmptyResponse_ThrowsCaptchaXException()
    {
        SetupMockResponse("{}", HttpStatusCode.OK);

        var client = CreateClient();

        var exception = await Assert.ThrowsAsync<CaptchaXException>(
            () => client.BatchVerifyAsync(new List<BatchVerifyItem>()));

        exception.Message.Should().Contain("null").Or.Contain("empty");
    }

    [Fact]
    public async Task CreateScenarioAsync_WithEmptyResponse_ThrowsCaptchaXException()
    {
        SetupMockResponse("{}", HttpStatusCode.OK);

        var client = CreateClient();

        var exception = await Assert.ThrowsAsync<CaptchaXException>(
            () => client.CreateScenarioAsync("Test"));

        exception.Message.Should().Contain("null").Or.Contain("empty");
    }

    [Fact]
    public async Task GetScenarioAsync_WithNonExistentScenario_ThrowsCaptchaXException()
    {
        SetupMockResponse("{\"code\": 404, \"message\": \"Scenario not found\"}", HttpStatusCode.NotFound);

        var client = CreateClient();

        var exception = await Assert.ThrowsAsync<CaptchaXException>(
            () => client.GetScenarioAsync("non-existent-id"));

        exception.Should().NotBeNull();
        exception.Message.Should().Contain("404");
    }

    [Fact]
    public async Task CreateWebhookAsync_WithEmptyResponse_ThrowsCaptchaXException()
    {
        SetupMockResponse("{}", HttpStatusCode.OK);

        var client = CreateClient();

        var exception = await Assert.ThrowsAsync<CaptchaXException>(
            () => client.CreateWebhookAsync("https://example.com/webhook", new List<string>()));

        exception.Message.Should().Contain("null").Or.Contain("empty");
    }

    [Fact]
    public async Task GetWebhookAsync_WithNonExistentWebhook_ThrowsCaptchaXException()
    {
        SetupMockResponse("{\"code\": 404, \"message\": \"Webhook not found\"}", HttpStatusCode.NotFound);

        var client = CreateClient();

        var exception = await Assert.ThrowsAsync<CaptchaXException>(
            () => client.GetWebhookAsync("non-existent-id"));

        exception.Should().NotBeNull();
        exception.Message.Should().Contain("404");
    }

    [Fact]
    public async Task UpdateScenarioAsync_WithEmptyResponse_ThrowsCaptchaXException()
    {
        SetupMockResponse("{}", HttpStatusCode.OK);

        var client = CreateClient();

        var exception = await Assert.ThrowsAsync<CaptchaXException>(
            () => client.UpdateScenarioAsync("scenario-123"));

        exception.Message.Should().Contain("null").Or.Contain("empty");
    }

    [Fact]
    public async Task UpdateWebhookAsync_WithEmptyResponse_ThrowsCaptchaXException()
    {
        SetupMockResponse("{}", HttpStatusCode.OK);

        var client = CreateClient();

        var exception = await Assert.ThrowsAsync<CaptchaXException>(
            () => client.UpdateWebhookAsync("webhook-123"));

        exception.Message.Should().Contain("null").Or.Contain("empty");
    }

    [Fact]
    public async Task VerifyClickCaptchaAsync_WithEmptyClicksList_HandlesCorrectly()
    {
        var jsonResponse = @"{""code"": 0, ""message"": ""success"", ""data"": {""success"": false, ""message"": ""Invalid clicks""}}";
        SetupMockResponse(jsonResponse, HttpStatusCode.OK);

        var client = CreateClient();
        var clicks = new List<CharPosition>();

        var result = await client.VerifyClickCaptchaAsync("click-123", clicks);

        result.Should().NotBeNull();
        result.Success.Should().BeFalse();
    }

    [Fact]
    public void CaptchaConfig_WithNullBaseUrl_ThrowsArgumentNullException()
    {
        var exception = Assert.Throws<ArgumentNullException>(
            () => new CaptchaConfig(null!));

        exception.Should().NotBeNull();
        exception.ParamName.Should().Be("baseUrl");
    }

    [Fact]
    public void CaptchaConfig_WithEmptyBaseUrl_AllowsEmptyString()
    {
        var config = new CaptchaConfig("");

        config.BaseUrl.Should().BeEmpty();
    }

    [Fact]
    public void CaptchaConfig_DefaultValues_AreCorrect()
    {
        var config = new CaptchaConfig("https://api.example.com");

        config.Timeout.Should().Be(10000);
        config.RetryTimes.Should().Be(3);
        config.ApiVersion.Should().Be(ApiVersion.V1);
        config.AppId.Should().BeNull();
    }

    [Fact]
    public void CaptchaConfig_CanSetAllProperties()
    {
        var config = new CaptchaConfig("https://api.example.com")
        {
            AppId = "my-app-id",
            Timeout = 20000,
            RetryTimes = 5,
            ApiVersion = ApiVersion.V2
        };

        config.BaseUrl.Should().Be("https://api.example.com");
        config.AppId.Should().Be("my-app-id");
        config.Timeout.Should().Be(20000);
        config.RetryTimes.Should().Be(5);
        config.ApiVersion.Should().Be(ApiVersion.V2);
    }

    [Fact]
    public void CharPosition_DefaultValues_AreCorrect()
    {
        var position = new CharPosition();

        position.Char.Should().BeEmpty();
        position.X.Should().Be(0);
        position.Y.Should().Be(0);
    }

    [Fact]
    public void CharPosition_WithParameters_SetsValuesCorrectly()
    {
        var position = new CharPosition("A", 100, 200);

        position.Char.Should().Be("A");
        position.X.Should().Be(100);
        position.Y.Should().Be(200);
    }

    [Fact]
    public async Task ListScenariosAsync_WithEmptyResponse_ReturnsEmptyList()
    {
        SetupMockResponse("{\"code\": 0, \"message\": \"success\", \"data\": null}", HttpStatusCode.OK);

        var client = CreateClient();

        var result = await client.ListScenariosAsync();

        result.Should().NotBeNull();
        result.Should().BeEmpty();
    }

    [Fact]
    public async Task ListWebhooksAsync_WithEmptyResponse_ReturnsEmptyList()
    {
        SetupMockResponse("{\"code\": 0, \"message\": \"success\", \"data\": null}", HttpStatusCode.OK);

        var client = CreateClient();

        var result = await client.ListWebhooksAsync();

        result.Should().NotBeNull();
        result.Should().BeEmpty();
    }

    [Fact]
    public async Task CaptchaXException_WithMessageAndCode_SetsPropertiesCorrectly()
    {
        var exception = new CaptchaXException("Test error", 400, 404);

        exception.Message.Should().Be("Test error");
        exception.Code.Should().Be(400);
        exception.StatusCode.Should().Be(404);
    }

    [Fact]
    public async Task CaptchaXException_WithMessageAndInnerException_SetsPropertiesCorrectly()
    {
        var innerException = new HttpRequestException("Network error");
        var exception = new CaptchaXException("Request failed", innerException);

        exception.Message.Should().Be("Request failed");
        exception.InnerException.Should().Be(innerException);
        exception.Code.Should().Be(500);
        exception.StatusCode.Should().Be(500);
    }

    [Fact]
    public async Task HealthCheckAsync_WithUnauthorizedError_ThrowsCaptchaXException()
    {
        SetupMockResponse("{\"code\": 401, \"message\": \"Unauthorized\"}", HttpStatusCode.Unauthorized);

        var client = CreateClient();

        var exception = await Assert.ThrowsAsync<CaptchaXException>(
            () => client.HealthCheckAsync());

        exception.Should().NotBeNull();
        exception.Message.Should().Contain("401");
    }

    [Fact]
    public async Task HealthCheckAsync_WithForbiddenError_ThrowsCaptchaXException()
    {
        SetupMockResponse("{\"code\": 403, \"message\": \"Forbidden\"}", HttpStatusCode.Forbidden);

        var client = CreateClient();

        var exception = await Assert.ThrowsAsync<CaptchaXException>(
            () => client.HealthCheckAsync());

        exception.Should().NotBeNull();
        exception.Message.Should().Contain("403");
    }

    [Fact]
    public async Task HealthCheckAsync_WithRateLimitError_ThrowsCaptchaXException()
    {
        SetupMockResponse("{\"code\": 429, \"message\": \"Too Many Requests\"}", (HttpStatusCode)429);

        var client = CreateClient();

        var exception = await Assert.ThrowsAsync<CaptchaXException>(
            () => client.HealthCheckAsync());

        exception.Should().NotBeNull();
        exception.Message.Should().Contain("429");
    }

    [Fact]
    public async Task HealthCheckAsync_WithServiceUnavailableError_ThrowsCaptchaXException()
    {
        SetupMockResponse("{\"code\": 503, \"message\": \"Service Unavailable\"}", HttpStatusCode.ServiceUnavailable);

        var client = CreateClient();

        var exception = await Assert.ThrowsAsync<CaptchaXException>(
            () => client.HealthCheckAsync());

        exception.Should().NotBeNull();
        exception.Message.Should().Contain("503");
    }

    [Fact]
    public async Task GenerateSliderCaptchaAsync_WithScenarioId_PassesScenarioIdToApi()
    {
        var jsonResponse = @"{""code"": 0, ""message"": ""success"", ""data"": {""id"": ""captcha-123"", ""background_b64"": """", ""slider_b64"": """", ""target_x"": 100, ""target_y"": 50}}";
        
        string? capturedScenarioId = null;
        _mockHandler
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .Callback<HttpRequestMessage, CancellationToken>((request, _) =>
            {
                if (request.Content != null)
                {
                    var content = request.Content.ReadAsStringAsync().Result;
                    if (content.Contains("scenario_id"))
                    {
                        capturedScenarioId = "test-scenario";
                    }
                }
            })
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.OK,
                Content = new StringContent(jsonResponse)
            });

        var client = CreateClient();
        var result = await client.GenerateSliderCaptchaAsync("test-scenario");

        result.Should().NotBeNull();
        result.Id.Should().Be("captcha-123");
    }

    [Fact]
    public async Task GenerateSliderCaptchaAsync_WithExtraData_PassesExtraDataToApi()
    {
        var jsonResponse = @"{""code"": 0, ""message"": ""success"", ""data"": {""id"": ""captcha-123"", ""background_b64"": """", ""slider_b64"": """", ""target_x"": 100, ""target_y"": 50}}";
        
        bool extraDataReceived = false;
        _mockHandler
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .Callback<HttpRequestMessage, CancellationToken>((request, _) =>
            {
                if (request.Content != null)
                {
                    var content = request.Content.ReadAsStringAsync().Result;
                    if (content.Contains("extra_data"))
                    {
                        extraDataReceived = true;
                    }
                }
            })
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.OK,
                Content = new StringContent(jsonResponse)
            });

        var client = CreateClient();
        var result = await client.GenerateSliderCaptchaAsync(extraData: "test-data");

        result.Should().NotBeNull();
        extraDataReceived.Should().BeTrue();
    }

    [Fact]
    public async Task VerifySliderCaptchaAsync_WithNegativeDistance_HandlesCorrectly()
    {
        var jsonResponse = @"{""code"": 0, ""message"": ""success"", ""data"": {""success"": false, ""message"": ""Invalid distance""}}";
        SetupMockResponse(jsonResponse, HttpStatusCode.OK);

        var client = CreateClient();

        var result = await client.VerifySliderCaptchaAsync("captcha-123", -50);

        result.Should().NotBeNull();
        result.Success.Should().BeFalse();
    }

    [Fact]
    public async Task VerifySliderCaptchaAsync_WithLargeDistance_HandlesCorrectly()
    {
        var jsonResponse = @"{""code"": 0, ""message"": ""success"", ""data"": {""success"": false, ""message"": ""Distance too large""}}";
        SetupMockResponse(jsonResponse, HttpStatusCode.OK);

        var client = CreateClient();

        var result = await client.VerifySliderCaptchaAsync("captcha-123", 999999);

        result.Should().NotBeNull();
        result.Success.Should().BeFalse();
    }

    [Fact]
    public async Task BatchVerifyAsync_WithEmptyItemsList_HandlesCorrectly()
    {
        var jsonResponse = @"{""code"": 0, ""message"": ""success"", ""data"": {""results"": [], ""summary"": {""total"": 0, ""success"": 0, ""failed"": 0, ""skipped"": 0}}}";
        SetupMockResponse(jsonResponse, HttpStatusCode.OK);

        var client = CreateClient();

        var result = await client.BatchVerifyAsync(new List<BatchVerifyItem>());

        result.Should().NotBeNull();
        result.Summary.Total.Should().Be(0);
        result.Summary.SuccessCount.Should().Be(0);
    }

    [Fact]
    public async Task BatchVerifyAsync_WithMixedResults_HandlesCorrectly()
    {
        var jsonResponse = @"{""code"": 0, ""message"": ""success"", ""data"": {""results"": [
            {""captcha_id"": ""captcha-1"", ""success"": true, ""message"": ""OK"", ""score"": 1.0},
            {""captcha_id"": ""captcha-2"", ""success"": false, ""message"": ""Failed"", ""score"": null},
            {""captcha_id"": ""captcha-3"", ""success"": true, ""message"": ""OK"", ""score"": 0.95}
        ], ""summary"": {""total"": 3, ""success"": 2, ""failed"": 1, ""skipped"": 0}}}";
        SetupMockResponse(jsonResponse, HttpStatusCode.OK);

        var client = CreateClient();
        var items = new List<BatchVerifyItem>
        {
            new BatchVerifyItem { CaptchaId = "captcha-1", Type = "slider", TargetX = 100 },
            new BatchVerifyItem { CaptchaId = "captcha-2", Type = "slider", TargetX = 50 },
            new BatchVerifyItem { CaptchaId = "captcha-3", Type = "click", Clicks = new List<CharPosition>() }
        };

        var result = await client.BatchVerifyAsync(items);

        result.Should().NotBeNull();
        result.Summary.Total.Should().Be(3);
        result.Summary.SuccessCount.Should().Be(2);
        result.Summary.Failed.Should().Be(1);
        result.Results.Should().HaveCount(3);
    }

    [Fact]
    public async Task CreateScenarioAsync_WithAllParameters_HandlesCorrectly()
    {
        var jsonResponse = @"{""code"": 0, ""message"": ""success"", ""data"": {
            ""id"": ""scenario-new"",
            ""name"": ""Test Scenario"",
            ""description"": ""Test Description"",
            ""difficulty"": ""hard"",
            ""config"": {""timeout"": 30}
        }}";
        SetupMockResponse(jsonResponse, HttpStatusCode.OK);

        var client = CreateClient();
        var config = new Dictionary<string, object> { ["timeout"] = 30 };

        var result = await client.CreateScenarioAsync(
            "Test Scenario",
            "Test Description",
            "hard",
            config);

        result.Should().NotBeNull();
        result.Name.Should().Be("Test Scenario");
        result.Description.Should().Be("Test Description");
        result.Difficulty.Should().Be("hard");
        result.Config.Should().ContainKey("timeout");
    }

    [Fact]
    public async Task CreateWebhookAsync_WithAllParameters_HandlesCorrectly()
    {
        var jsonResponse = @"{""code"": 0, ""message"": ""success"", ""data"": {
            ""id"": ""webhook-new"",
            ""app_id"": ""app-123"",
            ""url"": ""https://example.com/newhook"",
            ""events"": [""verify.success"", ""verify.fail""],
            ""secret"": ""secret123"",
            ""headers"": {""Authorization"": ""Bearer token""},
            ""enabled"": true
        }}";
        SetupMockResponse(jsonResponse, HttpStatusCode.OK);

        var client = CreateClient();
        var events = new List<string> { "verify.success", "verify.fail" };
        var headers = new Dictionary<string, string> { ["Authorization"] = "Bearer token" };

        var result = await client.CreateWebhookAsync(
            "https://example.com/newhook",
            events,
            "secret123",
            headers,
            true);

        result.Should().NotBeNull();
        result.Url.Should().Be("https://example.com/newhook");
        result.Events.Should().HaveCount(2);
        result.Secret.Should().Be("secret123");
        result.Headers.Should().ContainKey("Authorization");
        result.Enabled.Should().BeTrue();
    }

    [Fact]
    public async Task UpdateWebhookAsync_WithPartialUpdate_HandlesCorrectly()
    {
        var jsonResponse = @"{""code"": 0, ""message"": ""success"", ""data"": {
            ""id"": ""webhook-123"",
            ""app_id"": ""app-123"",
            ""url"": ""https://example.com/updated"",
            ""events"": [""verify.success""],
            ""enabled"": false
        }}";
        SetupMockResponse(jsonResponse, HttpStatusCode.OK);

        var client = CreateClient();

        var result = await client.UpdateWebhookAsync(
            "webhook-123",
            enabled: false);

        result.Should().NotBeNull();
        result.Enabled.Should().BeFalse();
    }

    [Fact]
    public async Task UpdateScenarioAsync_WithPartialUpdate_HandlesCorrectly()
    {
        var jsonResponse = @"{""code"": 0, ""message"": ""success"", ""data"": {
            ""id"": ""scenario-123"",
            ""name"": ""Updated Name"",
            ""description"": ""Original Description"",
            ""difficulty"": ""medium""
        }}";
        SetupMockResponse(jsonResponse, HttpStatusCode.OK);

        var client = CreateClient();

        var result = await client.UpdateScenarioAsync(
            "scenario-123",
            name: "Updated Name");

        result.Should().NotBeNull();
        result.Name.Should().Be("Updated Name");
        result.Description.Should().Be("Original Description");
    }
}
