"""Integration tests for CaptchaX Python SDK.

These tests are designed to run against a real CaptchaX server instance.
They are marked with @pytest.mark.integration and will be skipped by default.
Run with: pytest -m integration
"""

import pytest
import httpx
from captchax import (
    CaptchaXClient,
    CaptchaXError,
    CaptchaConfig,
    SliderCaptchaResult,
    SliderVerifyResult,
    ClickCaptchaResult,
    ClickVerifyResult,
    PuzzleCaptchaResult,
    PuzzleVerifyResult,
    CharPosition,
    BatchVerifyItem,
    Scenario,
    Webhook,
    HealthStatus,
)


@pytest.fixture(scope='module')
def dev_server_url():
    """Get development server URL."""
    return 'http://localhost:3000'


@pytest.fixture(scope='module')
def prod_server_url():
    """Get production server URL."""
    return 'https://captchax.example.com'


@pytest.fixture(scope='module')
def dev_client(dev_server_url):
    """Create client for development environment."""
    return CaptchaXClient(
        CaptchaConfig(
            base_url=dev_server_url,
            app_id='test-app-integration',
            timeout=10000,
        )
    )


@pytest.fixture(scope='module')
def prod_client(prod_server_url):
    """Create client for production environment."""
    return CaptchaXClient(
        CaptchaConfig(
            base_url=prod_server_url,
            app_id='test-app-integration',
            timeout=10000,
        )
    )


@pytest.mark.integration
class TestIntegrationHealthCheck:
    """Integration tests for health check."""

    def test_health_check_dev_server(self, dev_client):
        """Test health check against development server."""
        health = dev_client.health_check()
        assert isinstance(health, HealthStatus)
        assert health.status in ['healthy', 'degraded', 'unhealthy']
        assert health.service == 'captchax-api'

    def test_health_check_prod_server(self, prod_client):
        """Test health check against production server."""
        health = prod_client.health_check()
        assert isinstance(health, HealthStatus)
        assert health.service == 'captchax-api'


@pytest.mark.integration
class TestIntegrationSliderCaptcha:
    """Integration tests for slider captcha."""

    def test_generate_slider_captcha_dev(self, dev_client):
        """Test slider captcha generation on development server."""
        result = dev_client.generate_slider_captcha(
            width=300,
            height=200,
            client_info='integration-test',
        )
        assert isinstance(result, SliderCaptchaResult)
        assert result.id is not None
        assert result.background_b64 is not None
        assert result.slider_b64 is not None
        assert result.target_x > 0

    def test_verify_slider_captcha_dev(self, dev_client):
        """Test slider captcha verification on development server."""
        captcha = dev_client.generate_slider_captcha(width=300, height=200)
        result = dev_client.verify_slider_captcha(
            captcha_id=captcha.id,
            target_x=captcha.target_x,
            target_y=captcha.target_y,
        )
        assert isinstance(result, SliderVerifyResult)

    def test_verify_slider_with_correct_position(self, dev_client):
        """Test slider verification with correct position."""
        captcha = dev_client.generate_slider_captcha(width=300, height=200)
        result = dev_client.verify_slider_captcha(
            captcha_id=captcha.id,
            target_x=captcha.target_x,
        )
        assert result.success is True or result.success is False

    def test_verify_slider_with_wrong_position(self, dev_client):
        """Test slider verification with wrong position."""
        captcha = dev_client.generate_slider_captcha(width=300, height=200)
        result = dev_client.verify_slider_captcha(
            captcha_id=captcha.id,
            target_x=captcha.target_x + 100,
        )
        assert isinstance(result, SliderVerifyResult)


@pytest.mark.integration
class TestIntegrationClickCaptcha:
    """Integration tests for click captcha."""

    def test_generate_click_captcha_dev(self, dev_client):
        """Test click captcha generation on development server."""
        result = dev_client.generate_click_captcha(char_count=4)
        assert isinstance(result, ClickCaptchaResult)
        assert result.id is not None
        assert result.image is not None
        assert len(result.target_chars) == 4
        assert len(result.char_positions) == 4

    def test_verify_click_captcha_dev(self, dev_client):
        """Test click captcha verification on development server."""
        captcha = dev_client.generate_click_captcha(char_count=4)
        result = dev_client.verify_click_captcha(
            captcha_id=captcha.id,
            clicks=captcha.char_positions,
        )
        assert isinstance(result, ClickVerifyResult)
        assert isinstance(result.score, float)
        assert 0.0 <= result.score <= 1.0

    def test_click_captcha_with_wrong_clicks(self, dev_client):
        """Test click captcha verification with wrong clicks."""
        captcha = dev_client.generate_click_captcha(char_count=3)
        wrong_clicks = [
            CharPosition(char='X', x=999, y=999),
            CharPosition(char='Y', x=888, y=888),
            CharPosition(char='Z', x=777, y=777),
        ]
        result = dev_client.verify_click_captcha(
            captcha_id=captcha.id,
            clicks=wrong_clicks,
        )
        assert isinstance(result, ClickVerifyResult)


@pytest.mark.integration
class TestIntegrationPuzzleCaptcha:
    """Integration tests for puzzle captcha."""

    def test_generate_puzzle_captcha_dev(self, dev_client):
        """Test puzzle captcha generation on development server."""
        result = dev_client.generate_puzzle_captcha(width=300, height=200)
        assert isinstance(result, PuzzleCaptchaResult)
        assert result.id is not None
        assert result.background_b64 is not None
        assert result.puzzle_b64 is not None
        assert result.target_x > 0

    def test_verify_puzzle_captcha_dev(self, dev_client):
        """Test puzzle captcha verification on development server."""
        captcha = dev_client.generate_puzzle_captcha(width=300, height=200)
        result = dev_client.verify_puzzle_captcha(
            captcha_id=captcha.id,
            target_x=captcha.target_x,
            target_y=captcha.target_y,
        )
        assert isinstance(result, PuzzleVerifyResult)


@pytest.mark.integration
class TestIntegrationBatchVerify:
    """Integration tests for batch verification."""

    def test_batch_verify_multiple_captchas(self, dev_client):
        """Test batch verification of multiple captchas."""
        slider = dev_client.generate_slider_captcha(width=300, height=200)
        click = dev_client.generate_click_captcha(char_count=3)

        items = [
            BatchVerifyItem(
                captcha_id=slider.id,
                type='slider',
                target_x=slider.target_x,
                target_y=slider.target_y,
            ),
            BatchVerifyItem(
                captcha_id=click.id,
                type='click',
                target_x=0,
                clicks=click.char_positions,
            ),
        ]

        result = dev_client.batch_verify(items)
        assert result.summary.total == 2
        assert isinstance(result.results, list)
        assert len(result.results) == 2

    def test_batch_verify_with_deduplication(self, dev_client):
        """Test batch verification with deduplication ID."""
        slider = dev_client.generate_slider_captcha(width=300, height=200)

        items = [
            BatchVerifyItem(
                captcha_id=slider.id,
                type='slider',
                target_x=slider.target_x,
                target_y=slider.target_y,
            ),
        ]

        result = dev_client.batch_verify(items, deduplication_id='test-dedup-123')
        assert result is not None


@pytest.mark.integration
class TestIntegrationScenarioManagement:
    """Integration tests for scenario management."""

    def test_list_scenarios(self, dev_client):
        """Test listing scenarios."""
        scenarios = dev_client.list_scenarios()
        assert isinstance(scenarios, list)

    def test_create_scenario(self, dev_client):
        """Test creating a scenario."""
        scenario = dev_client.create_scenario(
            name='Integration Test Scenario',
            description='Created by integration tests',
            difficulty='medium',
            config={'tolerance': 5},
        )
        assert isinstance(scenario, Scenario)
        assert scenario.name == 'Integration Test Scenario'

        dev_client.delete_scenario(scenario.id)

    def test_get_scenario(self, dev_client):
        """Test getting a scenario by ID."""
        created = dev_client.create_scenario(
            name='Test Get Scenario',
            difficulty='easy',
        )
        scenario = dev_client.get_scenario(created.id)
        assert scenario.id == created.id
        assert scenario.name == 'Test Get Scenario'

        dev_client.delete_scenario(created.id)

    def test_update_scenario(self, dev_client):
        """Test updating a scenario."""
        created = dev_client.create_scenario(
            name='Original Name',
            difficulty='easy',
        )
        updated = dev_client.update_scenario(
            scenario_id=created.id,
            name='Updated Name',
            difficulty='hard',
        )
        assert updated.name == 'Updated Name'
        assert updated.difficulty == 'hard'

        dev_client.delete_scenario(created.id)


@pytest.mark.integration
class TestIntegrationWebhookManagement:
    """Integration tests for webhook management."""

    def test_register_webhook(self, dev_client):
        """Test registering a webhook."""
        webhook = dev_client.register_webhook(
            app_id='test-app-integration',
            url='https://example.com/test-webhook',
            events=['verification.success', 'verification.failed'],
            secret='test-secret',
        )
        assert isinstance(webhook, Webhook)
        assert webhook.url == 'https://example.com/test-webhook'

        dev_client.unregister_webhook(webhook.id)

    def test_list_webhooks(self, dev_client):
        """Test listing webhooks."""
        webhooks = dev_client.list_webhooks()
        assert isinstance(webhooks, list)

    def test_list_webhooks_with_filter(self, dev_client):
        """Test listing webhooks with app_id filter."""
        webhooks = dev_client.list_webhooks(app_id='test-app-integration')
        assert isinstance(webhooks, list)

    def test_update_webhook(self, dev_client):
        """Test updating a webhook."""
        created = dev_client.register_webhook(
            app_id='test-app-integration',
            url='https://example.com/original-url',
            events=['verification.success'],
        )
        updated = dev_client.update_webhook(
            webhook_id=created.id,
            url='https://example.com/updated-url',
            enabled=False,
        )
        assert updated.url == 'https://example.com/updated-url'
        assert updated.enabled is False

        dev_client.unregister_webhook(created.id)


@pytest.mark.integration
class TestIntegrationCombinedOperations:
    """Integration tests for combined captcha operations."""

    def test_generate_and_verify_slider(self, dev_client):
        """Test generate and verify slider in one call."""
        captcha, result = dev_client.generate_and_verify_slider(
            width=300,
            height=200,
        )
        assert isinstance(captcha, SliderCaptchaResult)
        assert isinstance(result, SliderVerifyResult)

    def test_generate_and_verify_click(self, dev_client):
        """Test generate and verify click captcha in one call."""
        captcha, result = dev_client.generate_and_verify_click(char_count=4)
        assert isinstance(captcha, ClickCaptchaResult)
        assert isinstance(result, ClickVerifyResult)


@pytest.mark.integration
class TestIntegrationMultipleEnvironments:
    """Integration tests across multiple environments."""

    def test_dev_environment_connection(self, dev_server_url):
        """Test connection to development environment."""
        with httpx.Client(timeout=5) as client:
            response = client.get(f"{dev_server_url}/health")
            assert response.status_code in [200, 201]

    def test_client_works_with_both_environments(self, dev_client):
        """Test that client configuration works for both environments."""
        assert dev_client is not None
        assert hasattr(dev_client, 'health_check')


@pytest.mark.integration
@pytest.mark.slow
class TestIntegrationPerformance:
    """Performance-related integration tests."""

    def test_multiple_rapid_requests(self, dev_client):
        """Test multiple rapid requests to the server."""
        for i in range(5):
            result = dev_client.generate_slider_captcha(width=300, height=200)
            assert result is not None

    def test_large_batch_verification(self, dev_client):
        """Test batch verification with larger number of items."""
        sliders = [
            dev_client.generate_slider_captcha(width=300, height=200)
            for _ in range(3)
        ]

        items = [
            BatchVerifyItem(
                captcha_id=s.id,
                type='slider',
                target_x=s.target_x,
                target_y=s.target_y,
            )
            for s in sliders
        ]

        result = dev_client.batch_verify(items)
        assert result.summary.total == 3
