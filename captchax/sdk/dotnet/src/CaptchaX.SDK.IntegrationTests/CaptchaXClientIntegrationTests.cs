using System;
using System.Collections.Generic;
using System.Net;
using System.Threading.Tasks;
using FluentAssertions;
using Xunit;

namespace CaptchaX.SDK.IntegrationTests;

public class CaptchaXClientIntegrationTests
{
    private readonly string _baseUrl;
    private readonly string _appId;

    public CaptchaXClientIntegrationTests()
    {
        _baseUrl = Environment.GetEnvironmentVariable("CAPTCHAX_BASE_URL") ?? "http://localhost:3000";
        _appId = Environment.GetEnvironmentVariable("CAPTCHAX_APP_ID") ?? "test-app-id";
    }

    private CaptchaConfig CreateConfig()
    {
        return new CaptchaConfig(_baseUrl)
        {
            AppId = _appId,
            Timeout = 30000,
            RetryTimes = 3,
            ApiVersion = ApiVersion.V1
        };
    }

    private CaptchaConfig CreateConfigV2()
    {
        return new CaptchaConfig(_baseUrl)
        {
            AppId = _appId,
            Timeout = 30000,
            RetryTimes = 3,
            ApiVersion = ApiVersion.V2
        };
    }

    [Fact(Skip = "Requires running CaptchaX server")]
    public async Task HealthCheckAsync_WithValidServer_ReturnsHealthStatus()
    {
        using var client = new CaptchaXClient(CreateConfig());

        var result = await client.HealthCheckAsync();

        result.Should().NotBeNull();
        result.Status.Should().NotBeNullOrEmpty();
        result.Service.Should().Be("captchax");
    }

    [Fact(Skip = "Requires running CaptchaX server")]
    public async Task GenerateSliderCaptchaAsync_WithValidConfig_ReturnsCaptcha()
    {
        using var client = new CaptchaXClient(CreateConfig());

        var result = await client.GenerateSliderCaptchaAsync();

        result.Should().NotBeNull();
        result.Id.Should().NotBeNullOrEmpty();
        result.BackgroundB64.Should().NotBeNullOrEmpty();
        result.SliderB64.Should().NotBeNullOrEmpty();
        result.TargetX.Should().BeGreaterThan(0);
    }

    [Fact(Skip = "Requires running CaptchaX server")]
    public async Task GenerateSliderCaptchaAsync_WithScenarioId_ReturnsCaptcha()
    {
        using var client = new CaptchaXClient(CreateConfig());

        var result = await client.GenerateSliderCaptchaAsync("test-scenario");

        result.Should().NotBeNull();
        result.Id.Should().NotBeNullOrEmpty();
    }

    [Fact(Skip = "Requires running CaptchaX server")]
    public async Task VerifySliderCaptchaAsync_WithValidDistance_ReturnsResult()
    {
        using var client = new CaptchaXClient(CreateConfig());

        var captcha = await client.GenerateSliderCaptchaAsync();
        var result = await client.VerifySliderCaptchaAsync(captcha.Id, captcha.TargetX);

        result.Should().NotBeNull();
        result.Success.Should().BeTrue();
    }

    [Fact(Skip = "Requires running CaptchaX server")]
    public async Task VerifySliderCaptchaAsync_WithInvalidDistance_ReturnsFailure()
    {
        using var client = new CaptchaXClient(CreateConfig());

        var captcha = await client.GenerateSliderCaptchaAsync();
        var result = await client.VerifySliderCaptchaAsync(captcha.Id, 0);

        result.Should().NotBeNull();
        result.Success.Should().BeFalse();
    }

    [Fact(Skip = "Requires running CaptchaX server")]
    public async Task GenerateClickCaptchaAsync_WithValidConfig_ReturnsCaptcha()
    {
        using var client = new CaptchaXClient(CreateConfig());

        var result = await client.GenerateClickCaptchaAsync();

        result.Should().NotBeNull();
        result.Id.Should().NotBeNullOrEmpty();
        result.Image.Should().NotBeNullOrEmpty();
        result.TargetChars.Should().NotBeEmpty();
        result.CharPositions.Should().NotBeEmpty();
    }

    [Fact(Skip = "Requires running CaptchaX server")]
    public async Task VerifyClickCaptchaAsync_WithValidClicks_ReturnsResult()
    {
        using var client = new CaptchaXClient(CreateConfig());

        var captcha = await client.GenerateClickCaptchaAsync();
        var result = await client.VerifyClickCaptchaAsync(captcha.Id, captcha.CharPositions);

        result.Should().NotBeNull();
        result.Score.Should().BeGreaterOrEqualTo(0);
    }

    [Fact(Skip = "Requires running CaptchaX server")]
    public async Task GeneratePuzzleCaptchaAsync_WithValidConfig_ReturnsCaptcha()
    {
        using var client = new CaptchaXClient(CreateConfig());

        var result = await client.GeneratePuzzleCaptchaAsync();

        result.Should().NotBeNull();
        result.Id.Should().NotBeNullOrEmpty();
        result.BackgroundB64.Should().NotBeNullOrEmpty();
        result.PuzzleB64.Should().NotBeNullOrEmpty();
    }

    [Fact(Skip = "Requires running CaptchaX server")]
    public async Task VerifyPuzzleCaptchaAsync_WithValidDistance_ReturnsResult()
    {
        using var client = new CaptchaXClient(CreateConfig());

        var captcha = await client.GeneratePuzzleCaptchaAsync();
        var result = await client.VerifyPuzzleCaptchaAsync(captcha.Id, captcha.TargetX);

        result.Should().NotBeNull();
    }

    [Fact(Skip = "Requires running CaptchaX server")]
    public async Task BatchVerifyAsync_WithMultipleItems_ReturnsResults()
    {
        using var client = new CaptchaXClient(CreateConfig());

        var sliderCaptcha = await client.GenerateSliderCaptchaAsync();
        var clickCaptcha = await client.GenerateClickCaptchaAsync();

        var items = new List<BatchVerifyItem>
        {
            new BatchVerifyItem
            {
                CaptchaId = sliderCaptcha.Id,
                Type = "slider",
                TargetX = sliderCaptcha.TargetX
            },
            new BatchVerifyItem
            {
                CaptchaId = clickCaptcha.Id,
                Type = "click",
                Clicks = clickCaptcha.CharPositions
            }
        };

        var result = await client.BatchVerifyAsync(items);

        result.Should().NotBeNull();
        result.Results.Should().HaveCount(2);
        result.Summary.Total.Should().Be(2);
    }

    [Fact(Skip = "Requires running CaptchaX server")]
    public async Task ListScenariosAsync_WithValidConfig_ReturnsScenarios()
    {
        using var client = new CaptchaXClient(CreateConfig());

        var result = await client.ListScenariosAsync();

        result.Should().NotBeNull();
    }

    [Fact(Skip = "Requires running CaptchaX server")]
    public async Task CreateScenarioAsync_WithValidData_ReturnsScenario()
    {
        using var client = new CaptchaXClient(CreateConfig());
        var scenarioName = $"Test-Scenario-{Guid.NewGuid()}";

        var result = await client.CreateScenarioAsync(scenarioName, "Test Description", "medium");

        result.Should().NotBeNull();
        result.Id.Should().NotBeNullOrEmpty();
        result.Name.Should().Be(scenarioName);

        try
        {
            await client.DeleteScenarioAsync(result.Id!);
        }
        catch
        {
        }
    }

    [Fact(Skip = "Requires running CaptchaX server")]
    public async Task GetScenarioAsync_WithValidId_ReturnsScenario()
    {
        using var client = new CaptchaXClient(CreateConfig());
        var createdScenario = await client.CreateScenarioAsync($"Test-Scenario-{Guid.NewGuid()}");

        try
        {
            var result = await client.GetScenarioAsync(createdScenario.Id!);

            result.Should().NotBeNull();
            result.Id.Should().Be(createdScenario.Id);
        }
        finally
        {
            await client.DeleteScenarioAsync(createdScenario.Id!);
        }
    }

    [Fact(Skip = "Requires running CaptchaX server")]
    public async Task UpdateScenarioAsync_WithValidData_ReturnsUpdatedScenario()
    {
        using var client = new CaptchaXClient(CreateConfig());
        var createdScenario = await client.CreateScenarioAsync($"Test-Scenario-{Guid.NewGuid()}");

        try
        {
            var result = await client.UpdateScenarioAsync(
                createdScenario.Id!,
                name: "Updated Name",
                description: "Updated Description");

            result.Should().NotBeNull();
            result.Name.Should().Be("Updated Name");
            result.Description.Should().Be("Updated Description");
        }
        finally
        {
            await client.DeleteScenarioAsync(createdScenario.Id!);
        }
    }

    [Fact(Skip = "Requires running CaptchaX server")]
    public async Task DeleteScenarioAsync_WithValidId_CompletesSuccessfully()
    {
        using var client = new CaptchaXClient(CreateConfig());
        var createdScenario = await client.CreateScenarioAsync($"Test-Scenario-{Guid.NewGuid()}");

        await client.DeleteScenarioAsync(createdScenario.Id!);

        var exception = await Assert.ThrowsAsync<CaptchaXException>(
            () => client.GetScenarioAsync(createdScenario.Id!));
    }

    [Fact(Skip = "Requires running CaptchaX server")]
    public async Task ListWebhooksAsync_WithValidConfig_ReturnsWebhooks()
    {
        using var client = new CaptchaXClient(CreateConfig());

        var result = await client.ListWebhooksAsync();

        result.Should().NotBeNull();
    }

    [Fact(Skip = "Requires running CaptchaX server")]
    public async Task CreateWebhookAsync_WithValidData_ReturnsWebhook()
    {
        using var client = new CaptchaXClient(CreateConfig());
        var webhookUrl = $"https://example.com/webhook-{Guid.NewGuid()}";

        var result = await client.CreateWebhookAsync(
            webhookUrl,
            new List<string> { "verify.success" });

        result.Should().NotBeNull();
        result.Id.Should().NotBeNullOrEmpty();
        result.Url.Should().Be(webhookUrl);

        try
        {
            await client.DeleteWebhookAsync(result.Id!);
        }
        catch
        {
        }
    }

    [Fact(Skip = "Requires running CaptchaX server")]
    public async Task GetWebhookAsync_WithValidId_ReturnsWebhook()
    {
        using var client = new CaptchaXClient(CreateConfig());
        var webhookUrl = $"https://example.com/webhook-{Guid.NewGuid()}";
        var createdWebhook = await client.CreateWebhookAsync(
            webhookUrl,
            new List<string> { "verify.success" });

        try
        {
            var result = await client.GetWebhookAsync(createdWebhook.Id!);

            result.Should().NotBeNull();
            result.Id.Should().Be(createdWebhook.Id);
        }
        finally
        {
            await client.DeleteWebhookAsync(createdWebhook.Id!);
        }
    }

    [Fact(Skip = "Requires running CaptchaX server")]
    public async Task UpdateWebhookAsync_WithValidData_ReturnsUpdatedWebhook()
    {
        using var client = new CaptchaXClient(CreateConfig());
        var webhookUrl = $"https://example.com/webhook-{Guid.NewGuid()}";
        var createdWebhook = await client.CreateWebhookAsync(
            webhookUrl,
            new List<string> { "verify.success" });

        try
        {
            var result = await client.UpdateWebhookAsync(
                createdWebhook.Id!,
                enabled: false);

            result.Should().NotBeNull();
            result.Enabled.Should().BeFalse();
        }
        finally
        {
            await client.DeleteWebhookAsync(createdWebhook.Id!);
        }
    }

    [Fact(Skip = "Requires running CaptchaX server")]
    public async Task DeleteWebhookAsync_WithValidId_CompletesSuccessfully()
    {
        using var client = new CaptchaXClient(CreateConfig());
        var webhookUrl = $"https://example.com/webhook-{Guid.NewGuid()}";
        var createdWebhook = await client.CreateWebhookAsync(
            webhookUrl,
            new List<string> { "verify.success" });

        await client.DeleteWebhookAsync(createdWebhook.Id!);

        var exception = await Assert.ThrowsAsync<CaptchaXException>(
            () => client.GetWebhookAsync(createdWebhook.Id!));
    }

    [Fact(Skip = "Requires running CaptchaX server")]
    public async Task ApiVersion_V2_UsesCorrectEndpoint()
    {
        using var client = new CaptchaXClient(CreateConfigV2());

        var result = await client.ListScenariosAsync();

        result.Should().NotBeNull();
    }

    [Fact(Skip = "Requires running CaptchaX server")]
    public async Task WithShortTimeout_ThrowsTimeoutException()
    {
        var shortTimeoutConfig = new CaptchaConfig(_baseUrl)
        {
            AppId = _appId,
            Timeout = 1,
            RetryTimes = 1,
            ApiVersion = ApiVersion.V1
        };

        using var client = new CaptchaXClient(shortTimeoutConfig);

        var exception = await Assert.ThrowsAsync<CaptchaXException>(
            () => client.HealthCheckAsync());

        exception.Should().NotBeNull();
    }

    [Fact(Skip = "Requires running CaptchaX server")]
    public async Task WithInvalidAppId_ThrowsUnauthorizedException()
    {
        var invalidConfig = new CaptchaConfig(_baseUrl)
        {
            AppId = "invalid-app-id",
            Timeout = 10000,
            RetryTimes = 1,
            ApiVersion = ApiVersion.V1
        };

        using var client = new CaptchaXClient(invalidConfig);

        var exception = await Assert.ThrowsAsync<CaptchaXException>(
            () => client.HealthCheckAsync());

        exception.Should().NotBeNull();
    }

    [Fact(Skip = "Requires running CaptchaX server")]
    public async Task CaptchaFlow_EndToEndSliderVerification_Succeeds()
    {
        using var client = new CaptchaXClient(CreateConfig());

        var captcha = await client.GenerateSliderCaptchaAsync();
        captcha.Should().NotBeNull();
        captcha.Id.Should().NotBeNullOrEmpty();

        var verifyResult = await client.VerifySliderCaptchaAsync(captcha.Id, captcha.TargetX);
        verifyResult.Should().NotBeNull();
        verifyResult.Success.Should().BeTrue();
    }

    [Fact(Skip = "Requires running CaptchaX server")]
    public async Task CaptchaFlow_EndToEndClickVerification_Succeeds()
    {
        using var client = new CaptchaXClient(CreateConfig());

        var captcha = await client.GenerateClickCaptchaAsync();
        captcha.Should().NotBeNull();
        captcha.Id.Should().NotBeNullOrEmpty();
        captcha.CharPositions.Should().NotBeEmpty();

        var verifyResult = await client.VerifyClickCaptchaAsync(captcha.Id, captcha.CharPositions);
        verifyResult.Should().NotBeNull();
        verifyResult.Success.Should().BeTrue();
        verifyResult.Score.Should().BeGreaterOrEqualTo(0.8);
    }

    [Fact(Skip = "Requires running CaptchaX server")]
    public async Task CaptchaFlow_EndToEndPuzzleVerification_Succeeds()
    {
        using var client = new CaptchaXClient(CreateConfig());

        var captcha = await client.GeneratePuzzleCaptchaAsync();
        captcha.Should().NotBeNull();
        captcha.Id.Should().NotBeNullOrEmpty();

        var verifyResult = await client.VerifyPuzzleCaptchaAsync(captcha.Id, captcha.TargetX);
        verifyResult.Should().NotBeNull();
        verifyResult.Success.Should().BeTrue();
    }

    [Fact(Skip = "Requires running CaptchaX server")]
    public async Task ScenarioManagement_EndToEnd_CreatesUpdatesAndDeletes()
    {
        using var client = new CaptchaXClient(CreateConfig());
        var scenarioName = $"Test-Scenario-{Guid.NewGuid()}";

        var created = await client.CreateScenarioAsync(scenarioName, "Initial description", "easy");
        created.Should().NotBeNull();
        created.Name.Should().Be(scenarioName);

        var updated = await client.UpdateScenarioAsync(created.Id!, description: "Updated description", difficulty: "hard");
        updated.Should().NotBeNull();
        updated.Description.Should().Be("Updated description");
        updated.Difficulty.Should().Be("hard");

        await client.DeleteScenarioAsync(created.Id!);

        var exception = await Assert.ThrowsAsync<CaptchaXException>(
            () => client.GetScenarioAsync(created.Id!));
    }

    [Fact(Skip = "Requires running CaptchaX server")]
    public async Task WebhookManagement_EndToEnd_CreatesUpdatesAndDeletes()
    {
        using var client = new CaptchaXClient(CreateConfig());
        var webhookUrl = $"https://example.com/webhook-{Guid.NewGuid()}";

        var created = await client.CreateWebhookAsync(
            webhookUrl,
            new List<string> { "verify.success" },
            secret: "test-secret");
        created.Should().NotBeNull();
        created.Url.Should().Be(webhookUrl);

        var updated = await client.UpdateWebhookAsync(
            created.Id!,
            events: new List<string> { "verify.success", "verify.fail" });
        updated.Should().NotBeNull();
        updated.Events.Should().Contain("verify.fail");

        await client.DeleteWebhookAsync(created.Id!);

        var exception = await Assert.ThrowsAsync<CaptchaXException>(
            () => client.GetWebhookAsync(created.Id!));
    }
}
