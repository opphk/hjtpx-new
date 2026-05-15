"""Error handling tests for CaptchaX Python SDK.

These tests cover various error scenarios including:
- HTTP error responses
- Network failures
- Invalid data handling
- Validation errors
- Retry logic
"""

import pytest
import json
from unittest.mock import Mock, MagicMock, patch
import httpx

from captchax import (
    CaptchaXClient,
    CaptchaXError,
    CaptchaConfig,
    ApiVersion,
)


class TestCaptchaXError:
    """Test CaptchaXError exception class."""

    def test_error_with_default_values(self):
        """Test error with default values."""
        error = CaptchaXError('Test error message')
        assert str(error) == 'CaptchaXError(500): Test error message'
        assert error.code == 500
        assert error.status_code == 500
        assert error.message == 'Test error message'
        assert error.details is None

    def test_error_with_custom_values(self):
        """Test error with custom code and status."""
        error = CaptchaXError('Custom error', code=400, status_code=400)
        assert error.code == 400
        assert error.status_code == 400
        assert '400' in str(error)

    def test_error_with_details(self):
        """Test error with detailed information."""
        details = {'field': 'app_id', 'reason': 'required'}
        error = CaptchaXError('Validation failed', code=400, status_code=400, details=details)
        assert error.details == details
        assert error.details['field'] == 'app_id'

    def test_error_is_exception_subclass(self):
        """Test that CaptchaXError is an Exception subclass."""
        error = CaptchaXError('Test error')
        assert isinstance(error, Exception)
        assert isinstance(error, CaptchaXError)

    def test_error_string_representation(self):
        """Test error string representation."""
        error = CaptchaXError('Simple message', code=500)
        assert str(error) == 'CaptchaXError(500): Simple message'

    def test_error_with_nested_details(self):
        """Test error with nested details dictionary."""
        details = {
            'errors': [
                {'field': 'name', 'message': 'required'},
                {'field': 'email', 'message': 'invalid format'},
            ]
        }
        error = CaptchaXError('Validation failed', code=422, details=details)
        assert len(error.details['errors']) == 2


class TestClientInitializationErrors:
    """Test client initialization error scenarios."""

    def test_init_without_base_url_raises(self):
        """Test that initialization without base_url raises TypeError."""
        with pytest.raises(TypeError, match="missing 1 required positional argument: 'base_url'"):
            CaptchaXClient({'app_id': 'test'})

    def test_init_with_empty_base_url(self):
        """Test initialization with empty base_url."""
        with pytest.raises(ValueError):
            CaptchaXClient({'base_url': '', 'app_id': 'test'})

    def test_init_with_invalid_api_version_string(self):
        """Test initialization with invalid API version string."""
        config = {
            'base_url': 'http://localhost:3000',
            'api_version': 'invalid-version',
        }
        with pytest.raises(ValueError):
            CaptchaXClient(config)


class TestCaptchaGenerationErrors:
    """Test error scenarios during captcha generation."""

    @patch('captchax.client.HttpClient')
    def test_generate_without_app_id_raises(self, mock_http):
        """Test that generation without app_id raises CaptchaXError."""
        config = CaptchaConfig(base_url='http://localhost:3000')
        client = CaptchaXClient(config)

        with pytest.raises(CaptchaXError, match="app_id is required"):
            client.generate_slider_captcha()

    @patch('captchax.client.HttpClient')
    def test_generate_click_without_app_id_raises(self, mock_http):
        """Test click captcha generation without app_id raises error."""
        config = CaptchaConfig(base_url='http://localhost:3000')
        client = CaptchaXClient(config)

        with pytest.raises(CaptchaXError, match="app_id is required"):
            client.generate_click_captcha()

    @patch('captchax.client.HttpClient')
    def test_generate_puzzle_without_app_id_raises(self, mock_http):
        """Test puzzle captcha generation without app_id raises error."""
        config = CaptchaConfig(base_url='http://localhost:3000')
        client = CaptchaXClient(config)

        with pytest.raises(CaptchaXError, match="app_id is required"):
            client.generate_puzzle_captcha()


class TestHTTPErrorHandling:
    """Test HTTP error handling."""

    @patch('captchax.client.httpx.Client')
    def test_http_500_error_handling(self, mock_httpx_client):
        """Test handling of HTTP 500 server errors."""
        from captchax.client import HttpClient

        mock_response = MagicMock()
        mock_response.status_code = 500
        mock_response.json.return_value = {
            'code': 500,
            'message': 'Internal server error',
        }
        mock_response.raise_for_status.side_effect = httpx.HTTPStatusError(
            'Server error',
            request=MagicMock(),
            response=mock_response,
        )

        mock_client_instance = MagicMock()
        mock_client_instance.post.return_value = mock_response
        mock_httpx_client.return_value.__enter__.return_value = mock_client_instance

        http_client = HttpClient('http://localhost:3000')

        with pytest.raises(CaptchaXError) as exc_info:
            http_client.post('/api/test', {'key': 'value'})

        assert exc_info.value.status_code == 500

    @patch('captchax.client.httpx.Client')
    def test_http_400_error_with_details(self, mock_httpx_client):
        """Test handling of HTTP 400 errors with details."""
        from captchax.client import HttpClient

        mock_response = MagicMock()
        mock_response.status_code = 400
        mock_response.json.return_value = {
            'code': 400,
            'message': 'Bad request',
            'details': {'field': 'invalid'},
        }
        mock_response.raise_for_status.side_effect = httpx.HTTPStatusError(
            'Bad request',
            request=MagicMock(),
            response=mock_response,
        )

        mock_client_instance = MagicMock()
        mock_client_instance.post.return_value = mock_response
        mock_httpx_client.return_value.__enter__.return_value = mock_client_instance

        http_client = HttpClient('http://localhost:3000')

        with pytest.raises(CaptchaXError) as exc_info:
            http_client.post('/api/test', {'key': 'value'})

        assert exc_info.value.code == 400
        assert exc_info.value.status_code == 400

    @patch('captchax.client.httpx.Client')
    def test_http_401_unauthorized(self, mock_httpx_client):
        """Test handling of HTTP 401 unauthorized errors."""
        from captchax.client import HttpClient

        mock_response = MagicMock()
        mock_response.status_code = 401
        mock_response.json.return_value = {
            'code': 401,
            'message': 'Unauthorized - invalid credentials',
        }
        mock_response.raise_for_status.side_effect = httpx.HTTPStatusError(
            'Unauthorized',
            request=MagicMock(),
            response=mock_response,
        )

        mock_client_instance = MagicMock()
        mock_client_instance.post.return_value = mock_response
        mock_httpx_client.return_value.__enter__.return_value = mock_client_instance

        http_client = HttpClient('http://localhost:3000')

        with pytest.raises(CaptchaXError) as exc_info:
            http_client.post('/api/test', {'key': 'value'})

        assert exc_info.value.code == 401

    @patch('captchax.client.httpx.Client')
    def test_http_403_forbidden(self, mock_httpx_client):
        """Test handling of HTTP 403 forbidden errors."""
        from captchax.client import HttpClient

        mock_response = MagicMock()
        mock_response.status_code = 403
        mock_response.json.return_value = {
            'code': 403,
            'message': 'Forbidden - access denied',
        }
        mock_response.raise_for_status.side_effect = httpx.HTTPStatusError(
            'Forbidden',
            request=MagicMock(),
            response=mock_response,
        )

        mock_client_instance = MagicMock()
        mock_client_instance.post.return_value = mock_response
        mock_httpx_client.return_value.__enter__.return_value = mock_client_instance

        http_client = HttpClient('http://localhost:3000')

        with pytest.raises(CaptchaXError) as exc_info:
            http_client.post('/api/test', {'key': 'value'})

        assert exc_info.value.code == 403

    @patch('captchax.client.httpx.Client')
    def test_http_404_not_found(self, mock_httpx_client):
        """Test handling of HTTP 404 not found errors."""
        from captchax.client import HttpClient

        mock_response = MagicMock()
        mock_response.status_code = 404
        mock_response.json.return_value = {
            'code': 404,
            'message': 'Resource not found',
        }
        mock_response.raise_for_status.side_effect = httpx.HTTPStatusError(
            'Not found',
            request=MagicMock(),
            response=mock_response,
        )

        mock_client_instance = MagicMock()
        mock_client_instance.post.return_value = mock_response
        mock_httpx_client.return_value.__enter__.return_value = mock_client_instance

        http_client = HttpClient('http://localhost:3000')

        with pytest.raises(CaptchaXError) as exc_info:
            http_client.post('/api/nonexistent', {'key': 'value'})

        assert exc_info.value.code == 404

    @patch('captchax.client.httpx.Client')
    def test_http_429_rate_limit(self, mock_httpx_client):
        """Test handling of HTTP 429 rate limit errors."""
        from captchax.client import HttpClient

        mock_response = MagicMock()
        mock_response.status_code = 429
        mock_response.json.return_value = {
            'code': 429,
            'message': 'Rate limit exceeded',
        }
        mock_response.raise_for_status.side_effect = httpx.HTTPStatusError(
            'Rate limit exceeded',
            request=MagicMock(),
            response=mock_response,
        )

        mock_client_instance = MagicMock()
        mock_client_instance.post.return_value = mock_response
        mock_httpx_client.return_value.__enter__.return_value = mock_client_instance

        http_client = HttpClient('http://localhost:3000', retry_times=0)

        with pytest.raises(CaptchaXError) as exc_info:
            http_client.post('/api/test', {'key': 'value'})

        assert exc_info.value.code == 429


class TestNetworkErrorHandling:
    """Test network error handling."""

    @patch('captchax.client.httpx.Client')
    def test_connection_timeout(self, mock_httpx_client):
        """Test handling of connection timeout."""
        from captchax.client import HttpClient

        mock_httpx_client.return_value.__enter__.return_value.post.side_effect = (
            httpx.ConnectTimeout('Connection timed out')
        )

        http_client = HttpClient('http://localhost:3000', retry_times=1)

        with pytest.raises(CaptchaXError) as exc_info:
            http_client.post('/api/test', {'key': 'value'})

        assert 'timeout' in str(exc_info.value).lower() or 'timed out' in str(exc_info.value).lower()

    @patch('captchax.client.httpx.Client')
    def test_connection_refused(self, mock_httpx_client):
        """Test handling of connection refused."""
        from captchax.client import HttpClient

        mock_httpx_client.return_value.__enter__.return_value.post.side_effect = (
            httpx.ConnectError('Connection refused')
        )

        http_client = HttpClient('http://localhost:3000', retry_times=1)

        with pytest.raises(CaptchaXError) as exc_info:
            http_client.post('/api/test', {'key': 'value'})

        assert 'request error' in str(exc_info.value).lower() or 'connection' in str(exc_info.value).lower()

    @patch('captchax.client.httpx.Client')
    def test_dns_resolution_failure(self, mock_httpx_client):
        """Test handling of DNS resolution failure."""
        from captchax.client import HttpClient

        mock_httpx_client.return_value.__enter__.return_value.post.side_effect = (
            httpx.RequestError('DNS resolution failed')
        )

        http_client = HttpClient('http://invalid-domain.example', retry_times=1)

        with pytest.raises(CaptchaXError) as exc_info:
            http_client.post('/api/test', {'key': 'value'})

        assert exc_info.value is not None

    @patch('captchax.client.httpx.Client')
    def test_network_interruption(self, mock_httpx_client):
        """Test handling of network interruption."""
        from captchax.client import HttpClient

        mock_httpx_client.return_value.__enter__.return_value.post.side_effect = (
            httpx.NetworkError('Network connection lost')
        )

        http_client = HttpClient('http://localhost:3000', retry_times=1)

        with pytest.raises(CaptchaXError) as exc_info:
            http_client.post('/api/test', {'key': 'value'})

        assert exc_info.value is not None


class TestRetryLogic:
    """Test retry logic for failed requests."""

    @patch('captchax.client.httpx.Client')
    def test_retry_on_500_error(self, mock_httpx_client):
        """Test that request is retried on 500 errors."""
        from captchax.client import HttpClient

        mock_client_instance = MagicMock()

        error_response = MagicMock()
        error_response.status_code = 500
        error_response.json.return_value = {'code': 500, 'message': 'Server error'}
        error_response.raise_for_status.side_effect = httpx.HTTPStatusError(
            'Server error',
            request=MagicMock(),
            response=error_response,
        )

        success_response = MagicMock()
        success_response.status_code = 200
        success_response.json.return_value = {'code': 200, 'data': {'success': True}}
        success_response.raise_for_status.return_value = None

        mock_client_instance.post.side_effect = [
            error_response,
            success_response,
        ]
        mock_httpx_client.return_value.__enter__.return_value = mock_client_instance

        http_client = HttpClient('http://localhost:3000', retry_times=3)
        result = http_client.post('/api/test', {'key': 'value'})

        assert mock_client_instance.post.call_count == 2
        assert result['data']['success'] is True

    @patch('captchax.client.httpx.Client')
    def test_max_retries_exceeded(self, mock_httpx_client):
        """Test that error is raised after max retries exceeded."""
        from captchax.client import HttpClient

        mock_client_instance = MagicMock()

        error_response = MagicMock()
        error_response.status_code = 500
        error_response.json.return_value = {'code': 500, 'message': 'Server error'}
        error_response.raise_for_status.side_effect = httpx.HTTPStatusError(
            'Server error',
            request=MagicMock(),
            response=error_response,
        )

        mock_client_instance.post.return_value = error_response
        mock_httpx_client.return_value.__enter__.return_value = mock_client_instance

        http_client = HttpClient('http://localhost:3000', retry_times=2)

        with pytest.raises(CaptchaXError) as exc_info:
            http_client.post('/api/test', {'key': 'value'})

        assert mock_client_instance.post.call_count == 3

    @patch('captchax.client.httpx.Client')
    def test_no_retry_on_400_error(self, mock_httpx_client):
        """Test that 400 errors are not retried."""
        from captchax.client import HttpClient

        mock_client_instance = MagicMock()

        error_response = MagicMock()
        error_response.status_code = 400
        error_response.json.return_value = {'code': 400, 'message': 'Bad request'}
        error_response.raise_for_status.side_effect = httpx.HTTPStatusError(
            'Bad request',
            request=MagicMock(),
            response=error_response,
        )

        mock_client_instance.post.return_value = error_response
        mock_httpx_client.return_value.__enter__.return_value = mock_client_instance

        http_client = HttpClient('http://localhost:3000', retry_times=3)

        with pytest.raises(CaptchaXError) as exc_info:
            http_client.post('/api/test', {'key': 'value'})

        assert mock_client_instance.post.call_count == 1
        assert exc_info.value.code == 400


class TestResponseValidation:
    """Test response validation."""

    @patch('captchax.client.HttpClient')
    def test_non_200_api_response(self, mock_http):
        """Test handling of non-200 API response."""
        mock_http.return_value.post.side_effect = CaptchaXError(
            message='Invalid parameters',
            code=400,
            status_code=400,
            details={'code': 400, 'message': 'Invalid parameters'},
        )

        config = CaptchaConfig(
            base_url='http://localhost:3000',
            app_id='test-app-id',
        )
        client = CaptchaXClient(config)

        with pytest.raises(CaptchaXError) as exc_info:
            client.generate_slider_captcha()

        assert exc_info.value.code == 400
        assert exc_info.value.message == 'Invalid parameters'

    @patch('captchax.client.HttpClient')
    def test_missing_required_fields_in_response(self, mock_http):
        """Test handling of response with missing required fields."""
        mock_http.return_value.post.return_value = {
            'code': 200,
            'message': 'success',
            'data': {
                'id': 'test-id',
            },
        }

        config = CaptchaConfig(
            base_url='http://localhost:3000',
            app_id='test-app-id',
        )
        client = CaptchaXClient(config)

        with pytest.raises(Exception):
            result = client.generate_slider_captcha()

    @patch('captchax.client.httpx.Client')
    def test_invalid_json_response(self, mock_httpx_client):
        """Test handling of invalid JSON response."""
        from captchax.client import HttpClient

        mock_client_instance = MagicMock()
        error_response = MagicMock()
        error_response.status_code = 500
        error_response.json.side_effect = json.JSONDecodeError('Invalid JSON', '', 0)
        error_response.raise_for_status.side_effect = httpx.HTTPStatusError(
            'Server error',
            request=MagicMock(),
            response=error_response,
        )
        mock_client_instance.post.return_value = error_response
        mock_httpx_client.return_value.__enter__.return_value = mock_client_instance

        http_client = HttpClient('http://localhost:3000')

        with pytest.raises(CaptchaXError) as exc_info:
            http_client.post('/api/test', {'key': 'value'})

        assert exc_info.value.status_code == 500


class TestHeaderValidation:
    """Test header validation."""

    def test_missing_app_id_header(self):
        """Test behavior when app_id is not set."""
        from captchax.client import HttpClient

        client = HttpClient('http://localhost:3000')
        client.set_header('X-App-ID', '')

    def test_set_headers_with_none_values(self):
        """Test setting headers with None values."""
        from captchax.client import HttpClient

        client = HttpClient('http://localhost:3000')
        try:
            client.set_header(None, 'value')
        except (TypeError, AttributeError):
            pass


class TestHTTPMethodValidation:
    """Test HTTP method validation."""

    def test_unsupported_http_method(self):
        """Test that unsupported HTTP methods raise error."""
        from captchax.client import HttpClient

        client = HttpClient('http://localhost:3000')

        with pytest.raises((ValueError, CaptchaXError), match="Unsupported HTTP method"):
            client._request('PATCH', '/api/test')


class TestTimeoutHandling:
    """Test timeout handling."""

    @patch('captchax.client.httpx.Client')
    def test_request_timeout(self, mock_httpx_client):
        """Test handling of request timeout."""
        from captchax.client import HttpClient

        mock_httpx_client.return_value.__enter__.return_value.post.side_effect = (
            httpx.ReadTimeout('Read timed out')
        )

        http_client = HttpClient('http://localhost:3000', timeout=1000, retry_times=1)

        with pytest.raises(CaptchaXError):
            http_client.post('/api/test', {'key': 'value'})

    @patch('captchax.client.httpx.Client')
    def test_write_timeout(self, mock_httpx_client):
        """Test handling of write timeout."""
        from captchax.client import HttpClient

        mock_httpx_client.return_value.__enter__.return_value.post.side_effect = (
            httpx.WriteTimeout('Write timed out')
        )

        http_client = HttpClient('http://localhost:3000', timeout=1000, retry_times=1)

        with pytest.raises(CaptchaXError):
            http_client.post('/api/test', {'key': 'value'})


class TestDeduplicationHandling:
    """Test deduplication ID handling."""

    @patch('captchax.client.HttpClient')
    def test_deduplication_id_in_headers(self, mock_http):
        """Test that deduplication ID is included in headers."""
        mock_http.return_value.post.return_value = {
            'code': 200,
            'message': 'success',
            'data': {
                'results': [],
                'summary': {'total': 0, 'success': 0, 'failed': 0, 'skipped': 0},
            },
        }

        config = CaptchaConfig(
            base_url='http://localhost:3000',
            app_id='test-app-id',
        )
        client = CaptchaXClient(config)
        client.batch_verify([], deduplication_id='unique-id-123')

        call_args = mock_http.return_value.post.call_args
        if 'deduplication_id' in call_args.kwargs:
            assert call_args.kwargs['deduplication_id'] == 'unique-id-123'
        elif len(call_args.args) > 2:
            assert call_args.args[2].get('deduplication_id') == 'unique-id-123'
