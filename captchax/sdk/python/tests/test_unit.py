"""Unit tests for CaptchaX Python SDK."""

import pytest
from unittest.mock import Mock, patch, MagicMock
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
    BatchVerifyResult,
    BatchVerifyResponse,
    BatchVerifySummary,
    Scenario,
    Webhook,
    HealthStatus,
)


class TestHttpClient:
    """Test HttpClient class."""

    def test_http_client_initialization(self):
        """Test HttpClient initialization with default values."""
        from captchax.client import HttpClient

        client = HttpClient(base_url='https://example.com')
        assert client.base_url == 'https://example.com'
        assert client.timeout == 10.0
        assert client.retry_times == 3
        assert 'Content-Type' in client._headers
        assert 'Accept' in client._headers

    def test_http_client_custom_timeout(self):
        """Test HttpClient with custom timeout."""
        from captchax.client import HttpClient

        client = HttpClient(base_url='https://example.com', timeout=5000)
        assert client.timeout == 5.0

    def test_http_client_custom_retry_times(self):
        """Test HttpClient with custom retry times."""
        from captchax.client import HttpClient

        client = HttpClient(base_url='https://example.com', retry_times=5)
        assert client.retry_times == 5

    def test_set_header(self):
        """Test setting a single header."""
        from captchax.client import HttpClient

        client = HttpClient(base_url='https://example.com')
        client.set_header('X-Custom-Header', 'custom-value')
        assert client._headers['X-Custom-Header'] == 'custom-value'

    def test_set_headers(self):
        """Test setting multiple headers."""
        from captchax.client import HttpClient

        client = HttpClient(base_url='https://example.com')
        client.set_headers({
            'X-Header-1': 'value1',
            'X-Header-2': 'value2',
        })
        assert client._headers['X-Header-1'] == 'value1'
        assert client._headers['X-Header-2'] == 'value2'

    def test_url_trailing_slash_handling(self):
        """Test that trailing slashes are removed from base_url."""
        from captchax.client import HttpClient

        client = HttpClient(base_url='https://example.com/')
        assert client.base_url == 'https://example.com'


class TestCaptchaXClientInitialization:
    """Test CaptchaXClient initialization."""

    def test_init_with_captcha_config(self):
        """Test initialization with CaptchaConfig object."""
        config = CaptchaConfig(
            base_url='http://localhost:3000',
            app_id='test-app-id',
            timeout=15000,
            retry_times=5,
        )
        client = CaptchaXClient(config)
        assert client.get_api_version() == 'v1'

    def test_init_with_dict_config(self):
        """Test initialization with dictionary config."""
        config_dict = {
            'base_url': 'http://localhost:3000',
            'app_id': 'test-app-id',
            'timeout': 15000,
            'retry_times': 5,
            'api_version': 'v2',
        }
        client = CaptchaXClient(config_dict)
        assert client.get_api_version() == 'v2'

    def test_init_without_app_id(self):
        """Test initialization without app_id."""
        config = CaptchaConfig(base_url='http://localhost:3000')
        client = CaptchaXClient(config)
        assert client._app_id is None

    def test_init_raises_without_base_url(self):
        """Test that initialization raises error without base_url."""
        with pytest.raises(TypeError, match="missing 1 required positional argument: 'base_url'"):
            CaptchaXClient({'app_id': 'test-app'})

    def test_api_version_string_conversion(self):
        """Test that string api_version is converted to enum."""
        config = {
            'base_url': 'http://localhost:3000',
            'app_id': 'test-app',
            'api_version': 'v2',
        }
        client = CaptchaXClient(config)
        assert client._api_version == ApiVersion.V2


class TestCaptchaXClientMethods:
    """Test CaptchaXClient public methods."""

    @pytest.fixture
    def mock_http_client(self):
        """Create a mock HttpClient."""
        with patch('captchax.client.HttpClient') as mock:
            mock_instance = MagicMock()
            mock.return_value = mock_instance
            yield mock_instance

    @pytest.fixture
    def client(self, mock_http_client):
        """Create a CaptchaXClient with mocked HttpClient."""
        config = CaptchaConfig(
            base_url='http://localhost:3000',
            app_id='test-app-id',
        )
        return CaptchaXClient(config)

    def test_set_app_id(self, client):
        """Test setting app_id."""
        client.set_app_id('new-app-id')
        assert client._app_id == 'new-app-id'

    def test_set_api_version_string(self, client):
        """Test setting API version with string."""
        client.set_api_version('v2')
        assert client.get_api_version() == 'v2'

    def test_set_api_version_enum(self, client):
        """Test setting API version with enum."""
        client.set_api_version(ApiVersion.V2)
        assert client.get_api_version() == 'v2'

    def test_get_api_version(self, client):
        """Test getting current API version."""
        assert client.get_api_version() == 'v1'

    def test_create_client_info_structure(self):
        """Test create_client_info returns valid JSON."""
        config = CaptchaConfig(base_url='http://localhost:3000')
        client = CaptchaXClient(config)
        import json
        info = client.create_client_info()
        parsed = json.loads(info)
        assert 'platform' in parsed
        assert 'timestamp' in parsed
        assert 'request_id' in parsed

    def test_create_client_info_with_custom_fields(self):
        """Test create_client_info with custom fields."""
        config = CaptchaConfig(base_url='http://localhost:3000')
        client = CaptchaXClient(config)
        import json
        info = client.create_client_info(user_id='123', session_id='abc')
        parsed = json.loads(info)
        assert parsed['user_id'] == '123'
        assert parsed['session_id'] == 'abc'


class TestSliderCaptcha:
    """Test slider captcha operations."""

    @pytest.fixture
    def mock_http_post(self):
        """Mock HTTP POST request."""
        with patch('captchax.client.HttpClient') as mock:
            mock_instance = MagicMock()
            mock_instance.post.return_value = {
                'code': 200,
                'message': 'success',
                'data': {
                    'id': 'slider-123',
                    'background_b64': 'base64_background_data',
                    'slider_b64': 'base64_slider_data',
                    'target_x': 150,
                    'target_y': 50,
                },
            }
            mock.return_value = mock_instance
            yield mock_instance

    def test_generate_slider_captcha_success(self, mock_http_post):
        """Test successful slider captcha generation."""
        config = CaptchaConfig(
            base_url='http://localhost:3000',
            app_id='test-app-id',
        )
        client = CaptchaXClient(config)
        result = client.generate_slider_captcha(width=300, height=200)

        assert isinstance(result, SliderCaptchaResult)
        assert result.id == 'slider-123'
        assert result.target_x == 150
        assert result.target_y == 50
        mock_http_post.post.assert_called_once()

    def test_generate_slider_captcha_requires_app_id(self):
        """Test that slider captcha generation requires app_id."""
        config = CaptchaConfig(base_url='http://localhost:3000')
        client = CaptchaXClient(config)

        with pytest.raises(CaptchaXError, match="app_id is required"):
            client.generate_slider_captcha()

    def test_generate_slider_captcha_with_all_params(self, mock_http_post):
        """Test slider captcha generation with all parameters."""
        config = CaptchaConfig(
            base_url='http://localhost:3000',
            app_id='test-app-id',
        )
        client = CaptchaXClient(config)
        result = client.generate_slider_captcha(
            width=400,
            height=300,
            client_info='test-client',
            scenario_id='scenario-1',
        )

        assert result.id == 'slider-123'
        call_args = mock_http_post.post.call_args
        body = call_args[0][1] if len(call_args[0]) > 1 else call_args[1].get('body', {})
        assert body.get('width') == 400
        assert body.get('height') == 300
        assert body.get('client_info') == 'test-client'
        assert body.get('scenario_id') == 'scenario-1'

    def test_verify_slider_captcha_success(self, mock_http_post):
        """Test successful slider captcha verification."""
        mock_http_post.post.return_value = {
            'code': 200,
            'message': 'success',
            'data': {
                'success': True,
                'message': 'Verification passed',
            },
        }

        config = CaptchaConfig(
            base_url='http://localhost:3000',
            app_id='test-app-id',
        )
        client = CaptchaXClient(config)
        result = client.verify_slider_captcha(
            captcha_id='slider-123',
            target_x=150,
            target_y=50,
        )

        assert isinstance(result, SliderVerifyResult)
        assert result.success is True
        assert result.message == 'Verification passed'


class TestClickCaptcha:
    """Test click captcha operations."""

    @pytest.fixture
    def mock_http_post(self):
        """Mock HTTP POST request."""
        with patch('captchax.client.HttpClient') as mock:
            mock_instance = MagicMock()
            mock.return_value = mock_instance
            yield mock_instance

    def test_generate_click_captcha_success(self, mock_http_post):
        """Test successful click captcha generation."""
        mock_http_post.post.return_value = {
            'code': 200,
            'message': 'success',
            'data': {
                'id': 'click-123',
                'image': 'base64_image_data',
                'target_chars': ['中', '国', '人'],
                'char_positions': [
                    {'char': '中', 'x': 50, 'y': 30},
                    {'char': '国', 'x': 100, 'y': 25},
                    {'char': '人', 'x': 75, 'y': 55},
                ],
            },
        }

        config = CaptchaConfig(
            base_url='http://localhost:3000',
            app_id='test-app-id',
        )
        client = CaptchaXClient(config)
        result = client.generate_click_captcha(char_count=3)

        assert isinstance(result, ClickCaptchaResult)
        assert result.id == 'click-123'
        assert len(result.target_chars) == 3
        assert len(result.char_positions) == 3

    def test_generate_click_captcha_requires_app_id(self):
        """Test that click captcha generation requires app_id."""
        config = CaptchaConfig(base_url='http://localhost:3000')
        client = CaptchaXClient(config)

        with pytest.raises(CaptchaXError, match="app_id is required"):
            client.generate_click_captcha()

    def test_verify_click_captcha_success(self, mock_http_post):
        """Test successful click captcha verification."""
        mock_http_post.post.return_value = {
            'code': 200,
            'message': 'success',
            'data': {
                'success': True,
                'score': 0.95,
                'message': 'Verification passed',
            },
        }

        config = CaptchaConfig(
            base_url='http://localhost:3000',
            app_id='test-app-id',
        )
        client = CaptchaXClient(config)
        result = client.verify_click_captcha(
            captcha_id='click-123',
            clicks=[
                CharPosition(char='中', x=50, y=30),
                CharPosition(char='国', x=100, y=25),
                CharPosition(char='人', x=75, y=55),
            ],
        )

        assert isinstance(result, ClickVerifyResult)
        assert result.success is True
        assert result.score == 0.95


class TestPuzzleCaptcha:
    """Test puzzle captcha operations."""

    @pytest.fixture
    def mock_http_post(self):
        """Mock HTTP POST request."""
        with patch('captchax.client.HttpClient') as mock:
            mock_instance = MagicMock()
            mock.return_value = mock_instance
            yield mock_instance

    def test_generate_puzzle_captcha_success(self, mock_http_post):
        """Test successful puzzle captcha generation."""
        mock_http_post.post.return_value = {
            'code': 200,
            'message': 'success',
            'data': {
                'id': 'puzzle-123',
                'background_b64': 'base64_background_data',
                'puzzle_b64': 'base64_puzzle_data',
                'target_x': 120,
                'target_y': 80,
            },
        }

        config = CaptchaConfig(
            base_url='http://localhost:3000',
            app_id='test-app-id',
        )
        client = CaptchaXClient(config)
        result = client.generate_puzzle_captcha(width=300, height=200)

        assert isinstance(result, PuzzleCaptchaResult)
        assert result.id == 'puzzle-123'
        assert result.target_x == 120
        assert result.target_y == 80

    def test_generate_puzzle_captcha_requires_app_id(self):
        """Test that puzzle captcha generation requires app_id."""
        config = CaptchaConfig(base_url='http://localhost:3000')
        client = CaptchaXClient(config)

        with pytest.raises(CaptchaXError, match="app_id is required"):
            client.generate_puzzle_captcha()

    def test_verify_puzzle_captcha_success(self, mock_http_post):
        """Test successful puzzle captcha verification."""
        mock_http_post.post.return_value = {
            'code': 200,
            'message': 'success',
            'data': {
                'success': True,
                'message': 'Verification passed',
            },
        }

        config = CaptchaConfig(
            base_url='http://localhost:3000',
            app_id='test-app-id',
        )
        client = CaptchaXClient(config)
        result = client.verify_puzzle_captcha(
            captcha_id='puzzle-123',
            target_x=120,
            target_y=80,
        )

        assert isinstance(result, PuzzleVerifyResult)
        assert result.success is True


class TestHealthCheck:
    """Test health check functionality."""

    @pytest.fixture
    def mock_http_get(self):
        """Mock HTTP GET request."""
        with patch('captchax.client.HttpClient') as mock:
            mock_instance = MagicMock()
            mock_instance.get.return_value = {
                'code': 200,
                'message': 'success',
                'data': {
                    'status': 'healthy',
                    'service': 'captchax-api',
                    'timestamp': '2024-01-01T00:00:00Z',
                    'version': '1.0.0',
                },
            }
            mock.return_value = mock_instance
            yield mock_instance

    def test_health_check_success(self, mock_http_get):
        """Test successful health check."""
        config = CaptchaConfig(base_url='http://localhost:3000')
        client = CaptchaXClient(config)
        result = client.health_check()

        assert isinstance(result, HealthStatus)
        assert result.status == 'healthy'
        assert result.service == 'captchax-api'
        assert result.version == '1.0.0'


class TestBatchVerify:
    """Test batch verification functionality."""

    @pytest.fixture
    def mock_http_post(self):
        """Mock HTTP POST request."""
        with patch('captchax.client.HttpClient') as mock:
            mock_instance = MagicMock()
            mock.return_value = mock_instance
            yield mock_instance

    def test_batch_verify_success(self, mock_http_post):
        """Test successful batch verification."""
        mock_http_post.post.return_value = {
            'code': 200,
            'message': 'success',
            'data': {
                'results': [
                    {
                        'captcha_id': 'slider-1',
                        'success': True,
                        'message': 'Passed',
                        'score': None,
                    },
                    {
                        'captcha_id': 'click-1',
                        'success': True,
                        'message': 'Passed',
                        'score': 0.95,
                    },
                ],
                'summary': {
                    'total': 2,
                    'success': 2,
                    'failed': 0,
                    'skipped': 0,
                },
            },
        }

        config = CaptchaConfig(
            base_url='http://localhost:3000',
            app_id='test-app-id',
        )
        client = CaptchaXClient(config)
        items = [
            BatchVerifyItem(
                captcha_id='slider-1',
                type='slider',
                target_x=150,
                target_y=50,
            ),
            BatchVerifyItem(
                captcha_id='click-1',
                type='click',
                target_x=0,
                clicks=[
                    CharPosition(char='A', x=10, y=20),
                    CharPosition(char='B', x=30, y=40),
                ],
            ),
        ]
        result = client.batch_verify(items, deduplication_id='dedup-123')

        assert isinstance(result, BatchVerifyResponse)
        assert len(result.results) == 2
        assert result.summary.total == 2
        assert result.summary.success == 2


class TestScenarioManagement:
    """Test scenario management functionality."""

    @pytest.fixture
    def mock_http(self):
        """Mock HTTP requests."""
        with patch('captchax.client.HttpClient') as mock:
            mock_instance = MagicMock()
            mock.return_value = mock_instance
            yield mock_instance

    def test_list_scenarios(self, mock_http):
        """Test listing scenarios."""
        mock_http.get.return_value = {
            'code': 200,
            'message': 'success',
            'data': [
                {'id': 's1', 'name': 'Scenario 1'},
                {'id': 's2', 'name': 'Scenario 2'},
            ],
        }

        config = CaptchaConfig(base_url='http://localhost:3000')
        client = CaptchaXClient(config)
        result = client.list_scenarios()

        assert isinstance(result, list)
        assert len(result) == 2

    def test_create_scenario(self, mock_http):
        """Test creating a scenario."""
        mock_http.post.return_value = {
            'code': 200,
            'message': 'success',
            'data': {
                'id': 'new-scenario',
                'name': 'Test Scenario',
                'description': 'Test description',
                'difficulty': 'medium',
            },
        }

        config = CaptchaConfig(base_url='http://localhost:3000')
        client = CaptchaXClient(config)
        result = client.create_scenario(
            name='Test Scenario',
            description='Test description',
            difficulty='medium',
        )

        assert isinstance(result, Scenario)
        assert result.id == 'new-scenario'
        assert result.name == 'Test Scenario'

    def test_get_scenario(self, mock_http):
        """Test getting a scenario by ID."""
        mock_http.get.return_value = {
            'code': 200,
            'message': 'success',
            'data': {
                'id': 'scenario-123',
                'name': 'Test Scenario',
                'description': 'Test description',
            },
        }

        config = CaptchaConfig(base_url='http://localhost:3000')
        client = CaptchaXClient(config)
        result = client.get_scenario('scenario-123')

        assert isinstance(result, Scenario)
        assert result.id == 'scenario-123'

    def test_update_scenario(self, mock_http):
        """Test updating a scenario."""
        mock_http.put.return_value = {
            'code': 200,
            'message': 'success',
            'data': {
                'id': 'scenario-123',
                'name': 'Updated Scenario',
                'description': 'Updated description',
            },
        }

        config = CaptchaConfig(base_url='http://localhost:3000')
        client = CaptchaXClient(config)
        result = client.update_scenario(
            scenario_id='scenario-123',
            name='Updated Scenario',
        )

        assert isinstance(result, Scenario)
        assert result.name == 'Updated Scenario'

    def test_delete_scenario(self, mock_http):
        """Test deleting a scenario."""
        mock_http.delete.return_value = {
            'code': 200,
            'message': 'success',
            'data': {'deleted': True},
        }

        config = CaptchaConfig(base_url='http://localhost:3000')
        client = CaptchaXClient(config)
        result = client.delete_scenario('scenario-123')

        assert result == {'deleted': True}


class TestWebhookManagement:
    """Test webhook management functionality."""

    @pytest.fixture
    def mock_http(self):
        """Mock HTTP requests."""
        with patch('captchax.client.HttpClient') as mock:
            mock_instance = MagicMock()
            mock.return_value = mock_instance
            yield mock_instance

    def test_register_webhook(self, mock_http):
        """Test registering a webhook."""
        mock_http.post.return_value = {
            'code': 200,
            'message': 'success',
            'data': {
                'id': 'webhook-123',
                'app_id': 'test-app-id',
                'url': 'https://example.com/webhook',
                'events': ['verification.success', 'verification.failed'],
                'enabled': True,
            },
        }

        config = CaptchaConfig(base_url='http://localhost:3000')
        client = CaptchaXClient(config)
        result = client.register_webhook(
            app_id='test-app-id',
            url='https://example.com/webhook',
            events=['verification.success', 'verification.failed'],
            secret='secret-key',
        )

        assert isinstance(result, Webhook)
        assert result.id == 'webhook-123'
        assert result.url == 'https://example.com/webhook'

    def test_list_webhooks(self, mock_http):
        """Test listing webhooks."""
        mock_http.get.return_value = {
            'code': 200,
            'message': 'success',
            'data': [
                {'id': 'webhook-1', 'url': 'https://example.com/webhook1'},
                {'id': 'webhook-2', 'url': 'https://example.com/webhook2'},
            ],
        }

        config = CaptchaConfig(base_url='http://localhost:3000')
        client = CaptchaXClient(config)
        result = client.list_webhooks()

        assert isinstance(result, list)
        assert len(result) == 2

    def test_list_webhooks_with_app_id_filter(self, mock_http):
        """Test listing webhooks with app_id filter."""
        mock_http.get.return_value = {
            'code': 200,
            'message': 'success',
            'data': [
                {'id': 'webhook-1', 'url': 'https://example.com/webhook1'},
            ],
        }

        config = CaptchaConfig(base_url='http://localhost:3000')
        client = CaptchaXClient(config)
        result = client.list_webhooks(app_id='test-app')

        assert isinstance(result, list)
        call_args = mock_http.get.call_args
        endpoint = call_args[0][0] if call_args[0] else call_args[1].get('endpoint', '')
        assert 'app_id=test-app' in endpoint

    def test_update_webhook(self, mock_http):
        """Test updating a webhook."""
        mock_http.put.return_value = {
            'code': 200,
            'message': 'success',
            'data': {
                'id': 'webhook-123',
                'url': 'https://example.com/new-webhook',
                'enabled': False,
            },
        }

        config = CaptchaConfig(base_url='http://localhost:3000')
        client = CaptchaXClient(config)
        result = client.update_webhook(
            webhook_id='webhook-123',
            url='https://example.com/new-webhook',
            enabled=False,
        )

        assert isinstance(result, Webhook)
        assert result.url == 'https://example.com/new-webhook'
        assert result.enabled is False

    def test_unregister_webhook(self, mock_http):
        """Test unregistering a webhook."""
        mock_http.delete.return_value = {
            'code': 200,
            'message': 'success',
            'data': {'deleted': True},
        }

        config = CaptchaConfig(base_url='http://localhost:3000')
        client = CaptchaXClient(config)
        result = client.unregister_webhook('webhook-123')

        assert result == {'deleted': True}


class TestCombinedOperations:
    """Test combined captcha operations."""

    @pytest.fixture
    def mock_http(self):
        """Mock HTTP requests."""
        with patch('captchax.client.HttpClient') as mock:
            mock_instance = MagicMock()
            mock.return_value = mock_instance
            yield mock_instance

    def test_generate_and_verify_slider(self, mock_http):
        """Test generate and verify slider captcha."""
        mock_http.post.side_effect = [
            {
                'code': 200,
                'message': 'success',
                'data': {
                    'id': 'slider-123',
                    'background_b64': 'base64_background_data',
                    'slider_b64': 'base64_slider_data',
                    'target_x': 150,
                    'target_y': 50,
                },
            },
            {
                'code': 200,
                'message': 'success',
                'data': {
                    'success': True,
                    'message': 'Verification passed',
                },
            },
        ]

        config = CaptchaConfig(
            base_url='http://localhost:3000',
            app_id='test-app-id',
        )
        client = CaptchaXClient(config)
        captcha, result = client.generate_and_verify_slider()

        assert isinstance(captcha, SliderCaptchaResult)
        assert isinstance(result, SliderVerifyResult)
        assert result.success is True
        assert mock_http.post.call_count == 2

    def test_generate_and_verify_click(self, mock_http):
        """Test generate and verify click captcha."""
        mock_http.post.side_effect = [
            {
                'code': 200,
                'message': 'success',
                'data': {
                    'id': 'click-123',
                    'image': 'base64_image_data',
                    'target_chars': ['中', '国'],
                    'char_positions': [
                        {'char': '中', 'x': 50, 'y': 30},
                        {'char': '国', 'x': 100, 'y': 25},
                    ],
                },
            },
            {
                'code': 200,
                'message': 'success',
                'data': {
                    'success': True,
                    'score': 0.98,
                    'message': 'Verification passed',
                },
            },
        ]

        config = CaptchaConfig(
            base_url='http://localhost:3000',
            app_id='test-app-id',
        )
        client = CaptchaXClient(config)
        captcha, result = client.generate_and_verify_click()

        assert isinstance(captcha, ClickCaptchaResult)
        assert isinstance(result, ClickVerifyResult)
        assert result.success is True
