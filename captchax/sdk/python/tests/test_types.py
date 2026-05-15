"""Type hint tests for CaptchaX Python SDK.

These tests verify that:
- Type hints are correctly defined
- Type annotations match expected behavior
- Type checking works with mypy
"""

import pytest
from dataclasses import dataclass
from typing import get_type_hints, get_origin, get_args, List, Optional, Dict, Any, Union

from captchax import (
    CaptchaXClient,
    CaptchaXError,
    CaptchaConfig,
    CaptchaXClient,
    ApiVersion,
    SliderCaptchaResult,
    SliderVerifyResult,
    ClickCaptchaResult,
    ClickVerifyResult,
    PuzzleCaptchaResult,
    PuzzleVerifyResult,
    CharPosition,
    BatchVerifyItem,
    BatchVerifyResult,
    BatchVerifyResponse,
    BatchVerifySummary,
    Scenario,
    Webhook,
    HealthStatus,
    CaptchaResponse,
)
from captchax.client import HttpClient


class TestApiVersionEnum:
    """Test ApiVersion enum type."""

    def test_api_version_values(self):
        """Test ApiVersion enum values."""
        assert ApiVersion.V1.value == 'v1'
        assert ApiVersion.V2.value == 'v2'

    def test_api_version_is_enum(self):
        """Test ApiVersion is an enum."""
        from enum import Enum
        assert issubclass(ApiVersion, Enum)


class TestCaptchaConfigType:
    """Test CaptchaConfig type hints."""

    def test_captcha_config_fields(self):
        """Test CaptchaConfig has required fields."""
        config = CaptchaConfig(base_url='https://example.com')
        assert hasattr(config, 'base_url')
        assert hasattr(config, 'app_id')
        assert hasattr(config, 'timeout')
        assert hasattr(config, 'retry_times')
        assert hasattr(config, 'api_version')

    def test_captcha_config_defaults(self):
        """Test CaptchaConfig default values."""
        config = CaptchaConfig(base_url='https://example.com')
        assert config.app_id is None
        assert config.timeout == 10000
        assert config.retry_times == 3
        assert config.api_version == ApiVersion.V1

    def test_captcha_config_types(self):
        """Test CaptchaConfig field types."""
        config = CaptchaConfig(base_url='https://example.com', app_id='test')
        assert isinstance(config.base_url, str)
        assert isinstance(config.timeout, int)
        assert isinstance(config.retry_times, int)
        assert isinstance(config.api_version, ApiVersion)


class TestSliderCaptchaResultType:
    """Test SliderCaptchaResult type hints."""

    def test_slider_captcha_result_fields(self):
        """Test SliderCaptchaResult has required fields."""
        result = SliderCaptchaResult(
            id='test-id',
            background_b64='base64data',
            slider_b64='sliderdata',
            target_x=100,
            target_y=50,
        )
        assert hasattr(result, 'id')
        assert hasattr(result, 'background_b64')
        assert hasattr(result, 'slider_b64')
        assert hasattr(result, 'target_x')
        assert hasattr(result, 'target_y')

    def test_slider_captcha_result_types(self):
        """Test SliderCaptchaResult field types."""
        result = SliderCaptchaResult(
            id='test-id',
            background_b64='base64data',
            slider_b64='sliderdata',
            target_x=100,
            target_y=50,
        )
        assert isinstance(result.id, str)
        assert isinstance(result.background_b64, str)
        assert isinstance(result.slider_b64, str)
        assert isinstance(result.target_x, int)
        assert isinstance(result.target_y, int)


class TestSliderVerifyResultType:
    """Test SliderVerifyResult type hints."""

    def test_slider_verify_result_fields(self):
        """Test SliderVerifyResult has required fields."""
        result = SliderVerifyResult(success=True, message='Success')
        assert hasattr(result, 'success')
        assert hasattr(result, 'message')

    def test_slider_verify_result_types(self):
        """Test SliderVerifyResult field types."""
        result = SliderVerifyResult(success=True, message='Success')
        assert isinstance(result.success, bool)
        assert isinstance(result.message, str)


class TestCharPositionType:
    """Test CharPosition type hints."""

    def test_char_position_fields(self):
        """Test CharPosition has required fields."""
        pos = CharPosition(char='中', x=100, y=50)
        assert hasattr(pos, 'char')
        assert hasattr(pos, 'x')
        assert hasattr(pos, 'y')

    def test_char_position_types(self):
        """Test CharPosition field types."""
        pos = CharPosition(char='中', x=100, y=50)
        assert isinstance(pos.char, str)
        assert isinstance(pos.x, int)
        assert isinstance(pos.y, int)


class TestClickCaptchaResultType:
    """Test ClickCaptchaResult type hints."""

    def test_click_captcha_result_fields(self):
        """Test ClickCaptchaResult has required fields."""
        result = ClickCaptchaResult(
            id='test-id',
            image='base64image',
            target_chars=['中', '国'],
            char_positions=[
                CharPosition(char='中', x=50, y=30),
                CharPosition(char='国', x=100, y=60),
            ],
        )
        assert hasattr(result, 'id')
        assert hasattr(result, 'image')
        assert hasattr(result, 'target_chars')
        assert hasattr(result, 'char_positions')

    def test_click_captcha_result_types(self):
        """Test ClickCaptchaResult field types."""
        result = ClickCaptchaResult(
            id='test-id',
            image='base64image',
            target_chars=['中', '国'],
            char_positions=[CharPosition(char='中', x=50, y=30)],
        )
        assert isinstance(result.id, str)
        assert isinstance(result.image, str)
        assert isinstance(result.target_chars, list)
        assert isinstance(result.char_positions, list)
        assert all(isinstance(p, CharPosition) for p in result.char_positions)


class TestClickVerifyResultType:
    """Test ClickVerifyResult type hints."""

    def test_click_verify_result_fields(self):
        """Test ClickVerifyResult has required fields."""
        result = ClickVerifyResult(success=True, score=0.95, message='Success')
        assert hasattr(result, 'success')
        assert hasattr(result, 'score')
        assert hasattr(result, 'message')

    def test_click_verify_result_types(self):
        """Test ClickVerifyResult field types."""
        result = ClickVerifyResult(success=True, score=0.95, message='Success')
        assert isinstance(result.success, bool)
        assert isinstance(result.score, float)
        assert isinstance(result.message, str)


class TestPuzzleCaptchaResultType:
    """Test PuzzleCaptchaResult type hints."""

    def test_puzzle_captcha_result_fields(self):
        """Test PuzzleCaptchaResult has required fields."""
        result = PuzzleCaptchaResult(
            id='test-id',
            background_b64='base64bg',
            puzzle_b64='puzzledata',
            target_x=100,
            target_y=50,
        )
        assert hasattr(result, 'id')
        assert hasattr(result, 'background_b64')
        assert hasattr(result, 'puzzle_b64')
        assert hasattr(result, 'target_x')
        assert hasattr(result, 'target_y')


class TestPuzzleVerifyResultType:
    """Test PuzzleVerifyResult type hints."""

    def test_puzzle_verify_result_fields(self):
        """Test PuzzleVerifyResult has required fields."""
        result = PuzzleVerifyResult(success=True, message='Success')
        assert hasattr(result, 'success')
        assert hasattr(result, 'message')


class TestScenarioType:
    """Test Scenario type hints."""

    def test_scenario_fields(self):
        """Test Scenario has expected fields."""
        scenario = Scenario(
            id='scenario-1',
            name='Test Scenario',
            description='A test scenario',
            difficulty='medium',
        )
        assert hasattr(scenario, 'id')
        assert hasattr(scenario, 'name')
        assert hasattr(scenario, 'description')
        assert hasattr(scenario, 'difficulty')
        assert hasattr(scenario, 'config')
        assert hasattr(scenario, 'created_at')
        assert hasattr(scenario, 'updated_at')

    def test_scenario_optional_fields(self):
        """Test Scenario optional fields are optional."""
        scenario = Scenario()
        assert scenario.id is None
        assert scenario.name is None
        assert scenario.description is None
        assert scenario.difficulty is None
        assert scenario.config is None


class TestWebhookType:
    """Test Webhook type hints."""

    def test_webhook_fields(self):
        """Test Webhook has expected fields."""
        webhook = Webhook(
            id='webhook-1',
            app_id='app-1',
            url='https://example.com/webhook',
            events=['verify.success'],
        )
        assert hasattr(webhook, 'id')
        assert hasattr(webhook, 'app_id')
        assert hasattr(webhook, 'url')
        assert hasattr(webhook, 'events')
        assert hasattr(webhook, 'secret')
        assert hasattr(webhook, 'headers')
        assert hasattr(webhook, 'enabled')

    def test_webhook_events_list(self):
        """Test Webhook events is a list."""
        webhook = Webhook(
            id='webhook-1',
            events=['verify.success', 'verify.failed'],
        )
        assert isinstance(webhook.events, list)
        assert len(webhook.events) == 2


class TestBatchVerifyItemType:
    """Test BatchVerifyItem type hints."""

    def test_batch_verify_item_fields(self):
        """Test BatchVerifyItem has required fields."""
        item = BatchVerifyItem(
            captcha_id='captcha-1',
            type='slider',
            target_x=100,
        )
        assert hasattr(item, 'captcha_id')
        assert hasattr(item, 'type')
        assert hasattr(item, 'target_x')
        assert hasattr(item, 'target_y')
        assert hasattr(item, 'clicks')

    def test_batch_verify_item_with_clicks(self):
        """Test BatchVerifyItem with clicks."""
        item = BatchVerifyItem(
            captcha_id='captcha-1',
            type='click',
            target_x=0,
            clicks=[
                CharPosition(char='A', x=10, y=20),
                CharPosition(char='B', x=30, y=40),
            ],
        )
        assert isinstance(item.clicks, list)
        assert all(isinstance(c, CharPosition) for c in item.clicks)


class TestBatchVerifyResultType:
    """Test BatchVerifyResult type hints."""

    def test_batch_verify_result_fields(self):
        """Test BatchVerifyResult has required fields."""
        result = BatchVerifyResult(
            captcha_id='captcha-1',
            success=True,
            message='Success',
            score=0.95,
        )
        assert hasattr(result, 'captcha_id')
        assert hasattr(result, 'success')
        assert hasattr(result, 'message')
        assert hasattr(result, 'score')


class TestBatchVerifySummaryType:
    """Test BatchVerifySummary type hints."""

    def test_batch_verify_summary_fields(self):
        """Test BatchVerifySummary has required fields."""
        summary = BatchVerifySummary(
            total=10,
            success=8,
            failed=1,
            skipped=1,
        )
        assert hasattr(summary, 'total')
        assert hasattr(summary, 'success')
        assert hasattr(summary, 'failed')
        assert hasattr(summary, 'skipped')


class TestBatchVerifyResponseType:
    """Test BatchVerifyResponse type hints."""

    def test_batch_verify_response_fields(self):
        """Test BatchVerifyResponse has required fields."""
        response = BatchVerifyResponse(
            results=[
                BatchVerifyResult(captcha_id='c1', success=True, message='OK'),
            ],
            summary=BatchVerifySummary(total=1, success=1, failed=0, skipped=0),
        )
        assert hasattr(response, 'results')
        assert hasattr(response, 'summary')

    def test_batch_verify_response_types(self):
        """Test BatchVerifyResponse field types."""
        response = BatchVerifyResponse(
            results=[
                BatchVerifyResult(captcha_id='c1', success=True, message='OK'),
            ],
            summary=BatchVerifySummary(total=1, success=1, failed=0, skipped=0),
        )
        assert isinstance(response.results, list)
        assert isinstance(response.summary, BatchVerifySummary)


class TestHealthStatusType:
    """Test HealthStatus type hints."""

    def test_health_status_fields(self):
        """Test HealthStatus has required fields."""
        status = HealthStatus(
            status='healthy',
            service='captchax-api',
            timestamp='2024-01-01T00:00:00Z',
            version='1.0.0',
        )
        assert hasattr(status, 'status')
        assert hasattr(status, 'service')
        assert hasattr(status, 'timestamp')
        assert hasattr(status, 'version')

    def test_health_status_types(self):
        """Test HealthStatus field types."""
        status = HealthStatus(
            status='healthy',
            service='captchax-api',
            timestamp='2024-01-01T00:00:00Z',
            version='1.0.0',
        )
        assert isinstance(status.status, str)
        assert isinstance(status.service, str)
        assert isinstance(status.timestamp, str)
        assert isinstance(status.version, str)


class TestHttpClientType:
    """Test HttpClient type hints."""

    def test_http_client_initialization(self):
        """Test HttpClient can be initialized."""
        client = HttpClient(base_url='https://example.com')
        assert client.base_url == 'https://example.com'
        assert client.timeout == 10.0
        assert client.retry_times == 3

    def test_http_client_has_required_methods(self):
        """Test HttpClient has required methods."""
        client = HttpClient(base_url='https://example.com')
        assert hasattr(client, 'get')
        assert hasattr(client, 'post')
        assert hasattr(client, 'put')
        assert hasattr(client, 'delete')
        assert hasattr(client, 'set_header')
        assert hasattr(client, 'set_headers')


class TestCaptchaXClientType:
    """Test CaptchaXClient type hints."""

    def test_client_has_required_methods(self):
        """Test CaptchaXClient has required methods."""
        config = CaptchaConfig(base_url='https://example.com', app_id='test')
        client = CaptchaXClient(config)

        assert hasattr(client, 'health_check')
        assert hasattr(client, 'generate_slider_captcha')
        assert hasattr(client, 'verify_slider_captcha')
        assert hasattr(client, 'generate_click_captcha')
        assert hasattr(client, 'verify_click_captcha')
        assert hasattr(client, 'generate_puzzle_captcha')
        assert hasattr(client, 'verify_puzzle_captcha')
        assert hasattr(client, 'batch_verify')
        assert hasattr(client, 'list_scenarios')
        assert hasattr(client, 'create_scenario')
        assert hasattr(client, 'get_scenario')
        assert hasattr(client, 'update_scenario')
        assert hasattr(client, 'delete_scenario')
        assert hasattr(client, 'register_webhook')
        assert hasattr(client, 'list_webhooks')
        assert hasattr(client, 'update_webhook')
        assert hasattr(client, 'unregister_webhook')
        assert hasattr(client, 'generate_and_verify_slider')
        assert hasattr(client, 'generate_and_verify_click')

    def test_client_return_types(self):
        """Test CaptchaXClient methods return expected types."""
        from unittest.mock import patch

        config = CaptchaConfig(base_url='https://example.com', app_id='test')
        client = CaptchaXClient(config)

        with patch.object(client, '_http') as mock_http:
            mock_http.get.return_value = {
                'code': 200,
                'data': {
                    'status': 'healthy',
                    'service': 'api',
                    'timestamp': '2024-01-01T00:00:00Z',
                    'version': '1.0.0',
                },
            }
            health = client.health_check()
            assert isinstance(health, HealthStatus)


class TestCaptchaXErrorType:
    """Test CaptchaXError type hints."""

    def test_error_has_required_attributes(self):
        """Test CaptchaXError has required attributes."""
        error = CaptchaXError('Test error', code=500, status_code=500)
        assert hasattr(error, 'message')
        assert hasattr(error, 'code')
        assert hasattr(error, 'status_code')
        assert hasattr(error, 'details')

    def test_error_types(self):
        """Test CaptchaXError attribute types."""
        error = CaptchaXError('Test error', code=500, status_code=500, details={'key': 'value'})
        assert isinstance(error.message, str)
        assert isinstance(error.code, int)
        assert isinstance(error.status_code, int)
        assert isinstance(error.details, dict)


class TestUnionTypes:
    """Test Union type handling."""

    def test_config_accepts_dict_or_config(self):
        """Test that config can be dict or CaptchaConfig."""
        config_dict = {'base_url': 'https://example.com', 'app_id': 'test'}
        client1 = CaptchaXClient(config_dict)
        assert client1 is not None

        config_obj = CaptchaConfig(base_url='https://example.com', app_id='test')
        client2 = CaptchaXClient(config_obj)
        assert client2 is not None

    def test_api_version_accepts_string_or_enum(self):
        """Test that API version accepts string or enum."""
        config = CaptchaConfig(base_url='https://example.com')
        client = CaptchaXClient(config)

        client.set_api_version('v2')
        assert client.get_api_version() == 'v2'

        client.set_api_version(ApiVersion.V1)
        assert client.get_api_version() == 'v1'


class TestOptionalTypes:
    """Test Optional type handling."""

    def test_optional_fields_can_be_none(self):
        """Test that optional fields can be None."""
        scenario = Scenario()
        assert scenario.id is None
        assert scenario.description is None
        assert scenario.difficulty is None
        assert scenario.config is None

    def test_optional_params_can_be_none(self):
        """Test that optional parameters can be None."""
        from unittest.mock import patch

        with patch('captchax.client.HttpClient') as mock:
            mock_instance = mock.return_value
            mock_instance.post.return_value = {
                'code': 200,
                'data': {
                    'id': 'test',
                    'background_b64': 'bg',
                    'slider_b64': 'slider',
                    'target_x': 100,
                    'target_y': 50,
                },
            }

            config = CaptchaConfig(base_url='https://example.com', app_id='test')
            client = CaptchaXClient(config)

            result = client.generate_slider_captcha(
                width=None,
                height=None,
                client_info=None,
                scenario_id=None,
            )
            assert result is not None
