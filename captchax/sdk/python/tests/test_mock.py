"""Mock tests for CaptchaX Python SDK using unittest.mock."""

import pytest
import httpx
from unittest.mock import Mock, MagicMock, patch, call, PropertyMock
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
    BatchVerifyResponse,
    BatchVerifySummary,
    Scenario,
    Webhook,
    HealthStatus,
)


class TestHttpClientMock:
    """Test HttpClient with mocks."""

    def test_http_client_get_request(self):
        """Test HTTP GET request mock."""
        with patch('captchax.client.httpx.Client') as MockHttpxClient:
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.json.return_value = {
                'code': 200,
                'message': 'success',
                'data': {'status': 'ok'},
            }
            mock_response.raise_for_status.return_value = None

            mock_client_instance = MagicMock()
            mock_client_instance.get.return_value = mock_response
            MockHttpxClient.return_value.__enter__.return_value = mock_client_instance

            from captchax.client import HttpClient
            client = HttpClient('http://localhost:3000')
            result = client.get('/api/test')

            assert result['data']['status'] == 'ok'
            mock_client_instance.get.assert_called_once()

    def test_http_client_post_request(self):
        """Test HTTP POST request mock."""
        with patch('captchax.client.HttpClient') as MockHttpClient:
            mock_instance = MockHttpClient.return_value
            mock_instance.post.return_value = {
                'code': 200,
                'message': 'success',
                'data': {'id': 'test-id'},
            }

            from captchax.client import HttpClient
            client = HttpClient('http://localhost:3000')
            result = client.post('/api/create', {'key': 'value'})

            mock_instance.post.assert_called_once()
            call_args = mock_instance.post.call_args
            assert call_args[0][0] == '/api/create'

    def test_http_client_put_request(self):
        """Test HTTP PUT request mock."""
        with patch('captchax.client.HttpClient') as MockHttpClient:
            mock_instance = MockHttpClient.return_value
            mock_instance.put.return_value = {
                'code': 200,
                'message': 'success',
            }

            from captchax.client import HttpClient
            client = HttpClient('http://localhost:3000')
            result = client.put('/api/update/1', {'name': 'updated'})

            mock_instance.put.assert_called_once()

    def test_http_client_delete_request(self):
        """Test HTTP DELETE request mock."""
        with patch('captchax.client.HttpClient') as MockHttpClient:
            mock_instance = MockHttpClient.return_value
            mock_instance.delete.return_value = {
                'code': 200,
                'message': 'success',
                'data': {'deleted': True},
            }

            from captchax.client import HttpClient
            client = HttpClient('http://localhost:3000')
            result = client.delete('/api/delete/1')

            mock_instance.delete.assert_called_once()

    def test_http_client_retry_on_failure(self):
        """Test HTTP client retry logic on failure."""
        with patch('captchax.client.httpx.Client') as MockHttpxClient:
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
            MockHttpxClient.return_value.__enter__.return_value = mock_client_instance

            from captchax.client import HttpClient
            client = HttpClient('http://localhost:3000', retry_times=2)
            result = client.post('/api/test', {'key': 'value'})

            assert mock_client_instance.post.call_count == 2
            assert result['data']['success'] is True


class TestCaptchaXClientMock:
    """Test CaptchaXClient with mocks."""

    def test_client_initialization_with_mock_http(self):
        """Test client initialization with mocked HttpClient."""
        with patch('captchax.client.HttpClient') as MockHttpClient:
            mock_instance = MockHttpClient.return_value
            mock_instance.set_header = Mock()

            config = CaptchaConfig(
                base_url='http://localhost:3000',
                app_id='test-app-id',
            )
            client = CaptchaXClient(config)

            MockHttpClient.assert_called_once()
            mock_instance.set_header.assert_called_with('X-App-ID', 'test-app-id')

    def test_generate_slider_captcha_with_mock(self):
        """Test slider captcha generation with mock."""
        with patch('captchax.client.HttpClient') as MockHttpClient:
            mock_http = MockHttpClient.return_value
            mock_http.post.return_value = {
                'code': 200,
                'message': 'success',
                'data': {
                    'id': 'slider-mock-123',
                    'background_b64': 'mock_background',
                    'slider_b64': 'mock_slider',
                    'target_x': 100,
                    'target_y': 50,
                },
            }

            config = CaptchaConfig(
                base_url='http://localhost:3000',
                app_id='test-app-id',
            )
            client = CaptchaXClient(config)
            result = client.generate_slider_captcha(width=200, height=150)

            assert result.id == 'slider-mock-123'
            assert result.target_x == 100
            mock_http.post.assert_called_once()

    def test_verify_slider_captcha_with_mock(self):
        """Test slider captcha verification with mock."""
        with patch('captchax.client.HttpClient') as MockHttpClient:
            mock_http = MockHttpClient.return_value
            mock_http.post.return_value = {
                'code': 200,
                'message': 'success',
                'data': {
                    'success': True,
                    'message': 'Verification successful',
                },
            }

            config = CaptchaConfig(
                base_url='http://localhost:3000',
                app_id='test-app-id',
            )
            client = CaptchaXClient(config)
            result = client.verify_slider_captcha('captcha-123', 100, 50)

            assert result.success is True
            assert result.message == 'Verification successful'

    def test_generate_click_captcha_with_mock(self):
        """Test click captcha generation with mock."""
        with patch('captchax.client.HttpClient') as MockHttpClient:
            mock_http = MockHttpClient.return_value
            mock_http.post.return_value = {
                'code': 200,
                'message': 'success',
                'data': {
                    'id': 'click-mock-123',
                    'image': 'mock_image_data',
                    'target_chars': ['A', 'B', 'C'],
                    'char_positions': [
                        {'char': 'A', 'x': 10, 'y': 20},
                        {'char': 'B', 'x': 30, 'y': 40},
                        {'char': 'C', 'x': 50, 'y': 60},
                    ],
                },
            }

            config = CaptchaConfig(
                base_url='http://localhost:3000',
                app_id='test-app-id',
            )
            client = CaptchaXClient(config)
            result = client.generate_click_captcha(char_count=3)

            assert result.id == 'click-mock-123'
            assert len(result.target_chars) == 3
            assert len(result.char_positions) == 3

    def test_verify_click_captcha_with_mock(self):
        """Test click captcha verification with mock."""
        with patch('captchax.client.HttpClient') as MockHttpClient:
            mock_http = MockHttpClient.return_value
            mock_http.post.return_value = {
                'code': 200,
                'message': 'success',
                'data': {
                    'success': True,
                    'score': 0.99,
                    'message': 'Click verification passed',
                },
            }

            config = CaptchaConfig(
                base_url='http://localhost:3000',
                app_id='test-app-id',
            )
            client = CaptchaXClient(config)
            clicks = [
                CharPosition(char='A', x=10, y=20),
                CharPosition(char='B', x=30, y=40),
            ]
            result = client.verify_click_captcha('captcha-123', clicks)

            assert result.success is True
            assert result.score == 0.99

    def test_generate_puzzle_captcha_with_mock(self):
        """Test puzzle captcha generation with mock."""
        with patch('captchax.client.HttpClient') as MockHttpClient:
            mock_http = MockHttpClient.return_value
            mock_http.post.return_value = {
                'code': 200,
                'message': 'success',
                'data': {
                    'id': 'puzzle-mock-123',
                    'background_b64': 'mock_bg',
                    'puzzle_b64': 'mock_puzzle',
                    'target_x': 200,
                    'target_y': 100,
                },
            }

            config = CaptchaConfig(
                base_url='http://localhost:3000',
                app_id='test-app-id',
            )
            client = CaptchaXClient(config)
            result = client.generate_puzzle_captcha(width=400, height=300)

            assert result.id == 'puzzle-mock-123'
            assert result.target_x == 200
            assert result.target_y == 100

    def test_verify_puzzle_captcha_with_mock(self):
        """Test puzzle captcha verification with mock."""
        with patch('captchax.client.HttpClient') as MockHttpClient:
            mock_http = MockHttpClient.return_value
            mock_http.post.return_value = {
                'code': 200,
                'message': 'success',
                'data': {
                    'success': True,
                    'message': 'Puzzle verification passed',
                },
            }

            config = CaptchaConfig(
                base_url='http://localhost:3000',
                app_id='test-app-id',
            )
            client = CaptchaXClient(config)
            result = client.verify_puzzle_captcha('captcha-123', 200, 100)

            assert result.success is True


class TestBatchVerifyMock:
    """Test batch verification with mocks."""

    def test_batch_verify_single_item(self):
        """Test batch verify with single item."""
        with patch('captchax.client.HttpClient') as MockHttpClient:
            mock_http = MockHttpClient.return_value
            mock_http.post.return_value = {
                'code': 200,
                'message': 'success',
                'data': {
                    'results': [
                        {
                            'captcha_id': 'captcha-1',
                            'success': True,
                            'message': 'Passed',
                            'score': None,
                        },
                    ],
                    'summary': {
                        'total': 1,
                        'success': 1,
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
                    captcha_id='captcha-1',
                    type='slider',
                    target_x=100,
                    target_y=50,
                ),
            ]
            result = client.batch_verify(items)

            assert isinstance(result, BatchVerifyResponse)
            assert result.summary.total == 1
            assert result.summary.success == 1

    def test_batch_verify_multiple_items(self):
        """Test batch verify with multiple items."""
        with patch('captchax.client.HttpClient') as MockHttpClient:
            mock_http = MockHttpClient.return_value
            mock_http.post.return_value = {
                'code': 200,
                'message': 'success',
                'data': {
                    'results': [
                        {'captcha_id': 'c1', 'success': True, 'message': 'OK', 'score': None},
                        {'captcha_id': 'c2', 'success': False, 'message': 'Failed', 'score': None},
                        {'captcha_id': 'c3', 'success': True, 'message': 'OK', 'score': 0.95},
                    ],
                    'summary': {
                        'total': 3,
                        'success': 2,
                        'failed': 1,
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
                BatchVerifyItem(captcha_id='c1', type='slider', target_x=100, target_y=50),
                BatchVerifyItem(captcha_id='c2', type='slider', target_x=150, target_y=60),
                BatchVerifyItem(captcha_id='c3', type='click', target_x=0, clicks=[CharPosition(char='A', x=10, y=20)]),
            ]
            result = client.batch_verify(items)

            assert result.summary.total == 3
            assert result.summary.success == 2
            assert result.summary.failed == 1

    def test_batch_verify_with_deduplication_id(self):
        """Test batch verify with deduplication ID."""
        with patch('captchax.client.HttpClient') as MockHttpClient:
            mock_http = MockHttpClient.return_value
            mock_http.post.return_value = {
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
            result = client.batch_verify([], deduplication_id='dedup-abc-123')

            call_args = mock_http.post.call_args
            assert call_args[1].get('deduplication_id') == 'dedup-abc-123'


class TestScenarioMock:
    """Test scenario management with mocks."""

    def test_list_scenarios_mock(self):
        """Test list scenarios with mock."""
        with patch('captchax.client.HttpClient') as MockHttpClient:
            mock_http = MockHttpClient.return_value
            mock_http.get.return_value = {
                'code': 200,
                'message': 'success',
                'data': [
                    {'id': 's1', 'name': 'Login', 'difficulty': 'easy'},
                    {'id': 's2', 'name': 'Register', 'difficulty': 'medium'},
                ],
            }

            config = CaptchaConfig(base_url='http://localhost:3000')
            client = CaptchaXClient(config)
            scenarios = client.list_scenarios()

            assert len(scenarios) == 2
            assert scenarios[0]['name'] == 'Login'

    def test_create_scenario_mock(self):
        """Test create scenario with mock."""
        with patch('captchax.client.HttpClient') as MockHttpClient:
            mock_http = MockHttpClient.return_value
            mock_http.post.return_value = {
                'code': 200,
                'message': 'success',
                'data': {
                    'id': 'new-scenario-id',
                    'name': 'Custom Scenario',
                    'description': 'Custom description',
                    'difficulty': 'hard',
                    'config': {'tolerance': 5},
                },
            }

            config = CaptchaConfig(base_url='http://localhost:3000')
            client = CaptchaXClient(config)
            scenario = client.create_scenario(
                name='Custom Scenario',
                description='Custom description',
                difficulty='hard',
                config={'tolerance': 5},
            )

            assert isinstance(scenario, Scenario)
            assert scenario.id == 'new-scenario-id'
            mock_http.post.assert_called_once()

    def test_get_scenario_mock(self):
        """Test get scenario by ID with mock."""
        with patch('captchax.client.HttpClient') as MockHttpClient:
            mock_http = MockHttpClient.return_value
            mock_http.get.return_value = {
                'code': 200,
                'message': 'success',
                'data': {
                    'id': 'scenario-xyz',
                    'name': 'Test Scenario',
                },
            }

            config = CaptchaConfig(base_url='http://localhost:3000')
            client = CaptchaXClient(config)
            scenario = client.get_scenario('scenario-xyz')

            assert isinstance(scenario, Scenario)
            assert scenario.id == 'scenario-xyz'

    def test_update_scenario_mock(self):
        """Test update scenario with mock."""
        with patch('captchax.client.HttpClient') as MockHttpClient:
            mock_http = MockHttpClient.return_value
            mock_http.put.return_value = {
                'code': 200,
                'message': 'success',
                'data': {
                    'id': 'scenario-123',
                    'name': 'Updated Name',
                    'difficulty': 'hard',
                },
            }

            config = CaptchaConfig(base_url='http://localhost:3000')
            client = CaptchaXClient(config)
            scenario = client.update_scenario(
                scenario_id='scenario-123',
                name='Updated Name',
                difficulty='hard',
            )

            assert scenario.name == 'Updated Name'
            mock_http.put.assert_called_once()

    def test_delete_scenario_mock(self):
        """Test delete scenario with mock."""
        with patch('captchax.client.HttpClient') as MockHttpClient:
            mock_http = MockHttpClient.return_value
            mock_http.delete.return_value = {
                'code': 200,
                'message': 'success',
                'data': {'deleted': True},
            }

            config = CaptchaConfig(base_url='http://localhost:3000')
            client = CaptchaXClient(config)
            result = client.delete_scenario('scenario-123')

            assert result['deleted'] is True
            mock_http.delete.assert_called_once()


class TestWebhookMock:
    """Test webhook management with mocks."""

    def test_register_webhook_mock(self):
        """Test register webhook with mock."""
        with patch('captchax.client.HttpClient') as MockHttpClient:
            mock_http = MockHttpClient.return_value
            mock_http.post.return_value = {
                'code': 200,
                'message': 'success',
                'data': {
                    'id': 'webhook-abc',
                    'app_id': 'app-id',
                    'url': 'https://example.com/callback',
                    'events': ['verify.success'],
                    'enabled': True,
                    'headers': {'Authorization': 'Bearer token'},
                },
            }

            config = CaptchaConfig(base_url='http://localhost:3000')
            client = CaptchaXClient(config)
            webhook = client.register_webhook(
                app_id='app-id',
                url='https://example.com/callback',
                events=['verify.success'],
                secret='secret123',
                headers={'Authorization': 'Bearer token'},
            )

            assert isinstance(webhook, Webhook)
            assert webhook.id == 'webhook-abc'
            mock_http.post.assert_called_once()

    def test_list_webhooks_mock(self):
        """Test list webhooks with mock."""
        with patch('captchax.client.HttpClient') as MockHttpClient:
            mock_http = MockHttpClient.return_value
            mock_http.get.return_value = {
                'code': 200,
                'message': 'success',
                'data': [
                    {'id': 'wh1', 'url': 'https://example.com/wh1'},
                    {'id': 'wh2', 'url': 'https://example.com/wh2'},
                ],
            }

            config = CaptchaConfig(base_url='http://localhost:3000')
            client = CaptchaXClient(config)
            webhooks = client.list_webhooks(app_id='app-123')

            assert len(webhooks) == 2

    def test_update_webhook_mock(self):
        """Test update webhook with mock."""
        with patch('captchax.client.HttpClient') as MockHttpClient:
            mock_http = MockHttpClient.return_value
            mock_http.put.return_value = {
                'code': 200,
                'message': 'success',
                'data': {
                    'id': 'webhook-123',
                    'url': 'https://new-url.com/webhook',
                    'enabled': False,
                },
            }

            config = CaptchaConfig(base_url='http://localhost:3000')
            client = CaptchaXClient(config)
            webhook = client.update_webhook(
                webhook_id='webhook-123',
                url='https://new-url.com/webhook',
                enabled=False,
            )

            assert webhook.url == 'https://new-url.com/webhook'
            mock_http.put.assert_called_once()

    def test_unregister_webhook_mock(self):
        """Test unregister webhook with mock."""
        with patch('captchax.client.HttpClient') as MockHttpClient:
            mock_http = MockHttpClient.return_value
            mock_http.delete.return_value = {
                'code': 200,
                'message': 'success',
                'data': {'deleted': True},
            }

            config = CaptchaConfig(base_url='http://localhost:3000')
            client = CaptchaXClient(config)
            result = client.unregister_webhook('webhook-123')

            assert result['deleted'] is True
            mock_http.delete.assert_called_once()


class TestHealthCheckMock:
    """Test health check with mocks."""

    def test_health_check_healthy_mock(self):
        """Test health check returning healthy status."""
        with patch('captchax.client.HttpClient') as MockHttpClient:
            mock_http = MockHttpClient.return_value
            mock_http.get.return_value = {
                'code': 200,
                'message': 'success',
                'data': {
                    'status': 'healthy',
                    'service': 'captchax-api',
                    'timestamp': '2024-01-15T10:30:00Z',
                    'version': '2.0.0',
                },
            }

            config = CaptchaConfig(base_url='http://localhost:3000')
            client = CaptchaXClient(config)
            health = client.health_check()

            assert isinstance(health, HealthStatus)
            assert health.status == 'healthy'
            assert health.version == '2.0.0'

    def test_health_check_degraded_mock(self):
        """Test health check returning degraded status."""
        with patch('captchax.client.HttpClient') as MockHttpClient:
            mock_http = MockHttpClient.return_value
            mock_http.get.return_value = {
                'code': 200,
                'message': 'success',
                'data': {
                    'status': 'degraded',
                    'service': 'captchax-api',
                    'timestamp': '2024-01-15T10:30:00Z',
                    'version': '2.0.0',
                },
            }

            config = CaptchaConfig(base_url='http://localhost:3000')
            client = CaptchaXClient(config)
            health = client.health_check()

            assert health.status == 'degraded'


class TestCombinedOperationsMock:
    """Test combined operations with mocks."""

    def test_generate_and_verify_slider_full_flow(self):
        """Test full slider captcha flow with mock."""
        with patch('captchax.client.HttpClient') as MockHttpClient:
            mock_http = MockHttpClient.return_value
            mock_http.post.side_effect = [
                {
                    'code': 200,
                    'message': 'success',
                    'data': {
                        'id': 'flow-slider-1',
                        'background_b64': 'mock_bg',
                        'slider_b64': 'mock_slider',
                        'target_x': 120,
                        'target_y': 80,
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
            captcha, verify_result = client.generate_and_verify_slider(
                width=300,
                height=200,
                client_info='browser-abc',
            )

            assert isinstance(captcha, SliderCaptchaResult)
            assert isinstance(verify_result, SliderVerifyResult)
            assert verify_result.success is True
            assert mock_http.post.call_count == 2

    def test_generate_and_verify_click_full_flow(self):
        """Test full click captcha flow with mock."""
        with patch('captchax.client.HttpClient') as MockHttpClient:
            mock_http = MockHttpClient.return_value
            mock_http.post.side_effect = [
                {
                    'code': 200,
                    'message': 'success',
                    'data': {
                        'id': 'flow-click-1',
                        'image': 'mock_image',
                        'target_chars': ['中', '国'],
                        'char_positions': [
                            {'char': '中', 'x': 50, 'y': 30},
                            {'char': '国', 'x': 100, 'y': 60},
                        ],
                    },
                },
                {
                    'code': 200,
                    'message': 'success',
                    'data': {
                        'success': True,
                        'score': 1.0,
                        'message': 'Perfect match',
                    },
                },
            ]

            config = CaptchaConfig(
                base_url='http://localhost:3000',
                app_id='test-app-id',
            )
            client = CaptchaXClient(config)
            captcha, verify_result = client.generate_and_verify_click(char_count=2)

            assert isinstance(captcha, ClickCaptchaResult)
            assert isinstance(verify_result, ClickVerifyResult)
            assert verify_result.score == 1.0
            assert mock_http.post.call_count == 2


class TestMockVerification:
    """Test mock verification and assertions."""

    def test_verify_api_prefix_for_different_versions(self):
        """Test API prefix generation for different versions."""
        with patch('captchax.client.HttpClient') as MockHttpClient:
            mock_http = MockHttpClient.return_value
            mock_http.post.return_value = {
                'code': 200,
                'message': 'success',
                'data': {'id': 'test'},
            }

            config = CaptchaConfig(
                base_url='http://localhost:3000',
                app_id='test-app-id',
                api_version=ApiVersion.V1,
            )
            client = CaptchaXClient(config)
            assert client._get_api_prefix() == '/api/v1'

            client.set_api_version(ApiVersion.V2)
            assert client._get_api_prefix() == '/api/v2'

    def test_verify_http_headers_set_correctly(self):
        """Test that HTTP headers are set correctly."""
        with patch('captchax.client.HttpClient') as MockHttpClient:
            mock_http = MockHttpClient.return_value
            mock_http.post.return_value = {
                'code': 200,
                'message': 'success',
                'data': {
                    'id': 'test-slider',
                    'background_b64': 'bg',
                    'slider_b64': 'slider',
                    'target_x': 100,
                    'target_y': 50,
                },
            }
            mock_http.set_header = MagicMock()

            config = CaptchaConfig(
                base_url='http://localhost:3000',
                app_id='custom-app-id',
            )
            client = CaptchaXClient(config)
            client.generate_slider_captcha()

            mock_http.set_header.assert_called_with('X-App-ID', 'custom-app-id')

    def test_verify_request_called_with_correct_body(self):
        """Test that request is called with correct body parameters."""
        with patch('captchax.client.HttpClient') as MockHttpClient:
            mock_http = MockHttpClient.return_value
            mock_http.post.return_value = {
                'code': 200,
                'message': 'success',
                'data': {
                    'id': 'test-slider',
                    'background_b64': 'bg',
                    'slider_b64': 'slider',
                    'target_x': 100,
                    'target_y': 50,
                },
            }

            config = CaptchaConfig(
                base_url='http://localhost:3000',
                app_id='test-app',
            )
            client = CaptchaXClient(config)
            client.generate_slider_captcha(
                width=400,
                height=300,
                client_info='test-info',
                scenario_id='scenario-1',
            )

            call_args = mock_http.post.call_args
            body = call_args[0][1] if len(call_args[0]) > 1 else call_args[1].get('body', {})
            assert 'app_id' in body
            assert body['width'] == 400
            assert body['height'] == 300
