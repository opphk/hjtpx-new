"""Tests for CaptchaX Python SDK."""

import pytest
from captchax import (
    CaptchaXClient,
    CaptchaXError,
    CaptchaConfig,
    ApiVersion,
    SliderCaptchaResult,
    SliderVerifyResult,
    ClickCaptchaResult,
    ClickVerifyResult,
    PuzzleCaptchaResult,
    PuzzleVerifyResult,
    CharPosition,
    BatchVerifyItem,
)


class TestCaptchaXClient:
    """Test CaptchaXClient."""

    def test_constructor_with_config_object(self):
        """Test constructor with CaptchaConfig object."""
        config = CaptchaConfig(base_url='https://captchax.example.com', app_id='test-app')
        client = CaptchaXClient(config)
        assert client.get_api_version() == 'v1'

    def test_constructor_with_dict(self):
        """Test constructor with dict."""
        config = {'base_url': 'https://captchax.example.com', 'app_id': 'test-app', 'api_version': 'v2'}
        client = CaptchaXClient(config)
        assert client.get_api_version() == 'v2'

    def test_constructor_raises_without_base_url(self):
        """Test constructor raises error without base_url."""
        with pytest.raises(TypeError, match="missing 1 required positional argument: 'base_url'"):
            CaptchaXClient({'app_id': 'test-app'})

    def test_set_app_id(self):
        """Test set_app_id method."""
        from unittest.mock import patch, MagicMock

        with patch('captchax.client.HttpClient') as MockHttpClient:
            mock_http = MockHttpClient.return_value
            mock_http.post.side_effect = [
                {
                    'code': 400,
                    'message': 'app_id is required',
                },
                {
                    'code': 200,
                    'message': 'success',
                    'data': {
                        'id': 'slider-123',
                        'background_b64': 'bg',
                        'slider_b64': 'slider',
                        'target_x': 100,
                        'target_y': 50,
                    },
                },
            ]

            config = CaptchaConfig(base_url='https://captchax.example.com')
            client = CaptchaXClient(config)
            client.set_app_id('new-app-id')

            assert client._app_id == 'new-app-id'

    def test_set_api_version(self):
        """Test set_api_version method."""
        config = CaptchaConfig(base_url='https://captchax.example.com')
        client = CaptchaXClient(config)
        assert client.get_api_version() == 'v1'
        client.set_api_version('v2')
        assert client.get_api_version() == 'v2'

    def test_set_api_version_with_enum(self):
        """Test set_api_version with ApiVersion enum."""
        config = CaptchaConfig(base_url='https://captchax.example.com')
        client = CaptchaXClient(config)
        client.set_api_version(ApiVersion.V2)
        assert client.get_api_version() == 'v2'

    def test_create_client_info(self):
        """Test create_client_info method."""
        config = CaptchaConfig(base_url='https://captchax.example.com')
        client = CaptchaXClient(config)
        info = client.create_client_info(custom_field='value')
        import json
        parsed = json.loads(info)
        assert 'timestamp' in parsed
        assert parsed['custom_field'] == 'value'


class TestCaptchaXError:
    """Test CaptchaXError exception."""

    def test_error_with_defaults(self):
        """Test error with default values."""
        error = CaptchaXError('Test error')
        assert str(error) == 'CaptchaXError(500): Test error'
        assert error.code == 500
        assert error.status_code == 500

    def test_error_with_custom_values(self):
        """Test error with custom values."""
        error = CaptchaXError('Test error', code=400, status_code=400, details={'field': 'value'})
        assert error.message == 'Test error'
        assert error.code == 400
        assert error.status_code == 400
        assert error.details == {'field': 'value'}

    def test_error_is_exception(self):
        """Test error is instance of Exception."""
        error = CaptchaXError('Test error')
        assert isinstance(error, Exception)


class TestTypes:
    """Test type definitions."""

    def test_captcha_config_defaults(self):
        """Test CaptchaConfig default values."""
        config = CaptchaConfig(base_url='https://example.com')
        assert config.timeout == 10000
        assert config.retry_times == 3
        assert config.api_version == ApiVersion.V1

    def test_char_position(self):
        """Test CharPosition dataclass."""
        pos = CharPosition(char='A', x=100, y=50)
        assert pos.char == 'A'
        assert pos.x == 100
        assert pos.y == 50

    def test_slider_captcha_result(self):
        """Test SliderCaptchaResult dataclass."""
        result = SliderCaptchaResult(
            id='cap-123',
            background_b64='data:image/png;base64,...',
            slider_b64='data:image/png;base64,...',
            target_x=150,
            target_y=40,
        )
        assert result.id == 'cap-123'
        assert result.target_x == 150

    def test_slider_verify_result(self):
        """Test SliderVerifyResult dataclass."""
        result = SliderVerifyResult(success=True, message='Verification successful')
        assert result.success is True
        assert 'successful' in result.message

    def test_click_captcha_result(self):
        """Test ClickCaptchaResult dataclass."""
        result = ClickCaptchaResult(
            id='cap-456',
            image='data:image/png;base64,...',
            target_chars=['中', '国', '人', '文'],
            char_positions=[
                CharPosition(char='中', x=50, y=30),
                CharPosition(char='国', x=120, y=25),
                CharPosition(char='人', x=80, y=60),
                CharPosition(char='文', x=150, y=45),
            ],
        )
        assert len(result.target_chars) == 4
        assert len(result.char_positions) == 4

    def test_batch_verify_item(self):
        """Test BatchVerifyItem dataclass."""
        item = BatchVerifyItem(
            captcha_id='cap-789',
            type='slider',
            target_x=150,
            target_y=40,
        )
        assert item.captcha_id == 'cap-789'
        assert item.type == 'slider'


class TestCaptchaXClientAdvanced:
    """Advanced tests for CaptchaXClient."""

    def test_api_prefix_generation_v1(self):
        """Test API prefix generation for v1."""
        config = CaptchaConfig(base_url='https://captchax.example.com', api_version=ApiVersion.V1)
        client = CaptchaXClient(config)
        assert client._get_api_prefix() == '/api/v1'

    def test_api_prefix_generation_v2(self):
        """Test API prefix generation for v2."""
        config = CaptchaConfig(base_url='https://captchax.example.com', api_version=ApiVersion.V2)
        client = CaptchaXClient(config)
        assert client._get_api_prefix() == '/api/v2'

    def test_client_with_custom_timeout(self):
        """Test client with custom timeout."""
        config = CaptchaConfig(
            base_url='https://captchax.example.com',
            timeout=20000,
        )
        client = CaptchaXClient(config)
        assert client._http.timeout == 20.0

    def test_client_with_custom_retry_times(self):
        """Test client with custom retry times."""
        config = CaptchaConfig(
            base_url='https://captchax.example.com',
            retry_times=5,
        )
        client = CaptchaXClient(config)
        assert client._http.retry_times == 5

    def test_client_headers_inheritance(self):
        """Test that client inherits headers from HttpClient."""
        from captchax.client import HttpClient
        config = CaptchaConfig(
            base_url='https://captchax.example.com',
            app_id='test-app',
        )
        client = CaptchaXClient(config)
        assert 'X-App-ID' in client._http._headers
        assert client._http._headers['X-App-ID'] == 'test-app'


class TestCaptchaXErrorAdvanced:
    """Advanced tests for CaptchaXError."""

    def test_error_str_with_zero_code(self):
        """Test error string representation with zero code."""
        error = CaptchaXError('Network error', code=0, status_code=0)
        assert '0' in str(error)

    def test_error_with_none_details(self):
        """Test error with None details."""
        error = CaptchaXError('Test', details=None)
        assert error.details is None

    def test_error_message_preserved(self):
        """Test that error message is preserved correctly."""
        message = 'This is a detailed error message with special chars: @#$%'
        error = CaptchaXError(message)
        assert error.message == message


class TestTypeConversions:
    """Test type conversions in SDK."""

    def test_dict_to_config_with_string_version(self):
        """Test conversion of dict with string api_version to Config."""
        config_dict = {
            'base_url': 'https://captchax.example.com',
            'app_id': 'test',
            'api_version': 'v2',
        }
        client = CaptchaXClient(config_dict)
        assert client._api_version == ApiVersion.V2

    def test_dict_to_config_with_enum_version(self):
        """Test conversion of dict with enum api_version to Config."""
        config_dict = {
            'base_url': 'https://captchax.example.com',
            'api_version': ApiVersion.V1,
        }
        client = CaptchaXClient(config_dict)
        assert client._api_version == ApiVersion.V1


class TestCharPositionAdvanced:
    """Advanced tests for CharPosition."""

    def test_char_position_with_chinese_char(self):
        """Test CharPosition with Chinese character."""
        pos = CharPosition(char='中', x=100, y=200)
        assert pos.char == '中'
        assert pos.x == 100
        assert pos.y == 200

    def test_char_position_with_emoji(self):
        """Test CharPosition with emoji character."""
        pos = CharPosition(char='⭐', x=150, y=250)
        assert pos.char == '⭐'

    def test_char_position_equality(self):
        """Test CharPosition equality."""
        pos1 = CharPosition(char='A', x=100, y=50)
        pos2 = CharPosition(char='A', x=100, y=50)
        assert pos1.char == pos2.char
        assert pos1.x == pos2.x
        assert pos1.y == pos2.y


class TestClientInfoGeneration:
    """Test client info generation."""

    def test_client_info_contains_platform(self):
        """Test that client info contains platform information."""
        config = CaptchaConfig(base_url='https://captchax.example.com')
        client = CaptchaXClient(config)
        import json
        info = json.loads(client.create_client_info())
        assert 'platform' in info
        assert isinstance(info['platform'], str)

    def test_client_info_contains_timestamp(self):
        """Test that client info contains timestamp."""
        config = CaptchaConfig(base_url='https://captchax.example.com')
        client = CaptchaXClient(config)
        import json
        info = json.loads(client.create_client_info())
        assert 'timestamp' in info
        assert isinstance(info['timestamp'], int)

    def test_client_info_contains_request_id(self):
        """Test that client info contains request ID."""
        config = CaptchaConfig(base_url='https://captchax.example.com')
        client = CaptchaXClient(config)
        import json
        info = json.loads(client.create_client_info())
        assert 'request_id' in info
        assert len(info['request_id']) > 0

    def test_client_info_multiple_custom_fields(self):
        """Test client info with multiple custom fields."""
        config = CaptchaConfig(base_url='https://captchax.example.com')
        client = CaptchaXClient(config)
        import json
        info = json.loads(client.create_client_info(
            user_id='12345',
            session_id='abcde',
            browser='Chrome',
        ))
        assert info['user_id'] == '12345'
        assert info['session_id'] == 'abcde'
        assert info['browser'] == 'Chrome'
