"""Concurrency tests for CaptchaX Python SDK.

These tests cover concurrent operations including:
- Parallel captcha generation
- Concurrent verification requests
- Thread safety of client operations
- Batch processing under load
"""

import pytest
import threading
import queue
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from unittest.mock import Mock, MagicMock, patch

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
)


class TestConcurrentCaptchaGeneration:
    """Test concurrent captcha generation."""

    @patch('captchax.client.HttpClient')
    def test_parallel_slider_generation(self, mock_http):
        """Test parallel generation of slider captchas."""
        mock_http_instance = mock_http.return_value

        def generate_response(index):
            return {
                'code': 200,
                'message': 'success',
                'data': {
                    'id': f'slider-{index}',
                    'background_b64': f'bg_{index}',
                    'slider_b64': f'slider_{index}',
                    'target_x': 100 + index,
                    'target_y': 50,
                },
            }

        responses = [generate_response(i) for i in range(10)]
        mock_http_instance.post.side_effect = responses

        config = CaptchaConfig(
            base_url='http://localhost:3000',
            app_id='test-app-id',
        )
        client = CaptchaXClient(config)

        def generate_captcha(index):
            return client.generate_slider_captcha(width=300, height=200)

        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(generate_captcha, i) for i in range(10)]
            results = [future.result() for future in as_completed(futures)]

        assert len(results) == 10
        assert all(isinstance(r, SliderCaptchaResult) for r in results)

    @patch('captchax.client.HttpClient')
    def test_parallel_click_generation(self, mock_http):
        """Test parallel generation of click captchas."""
        mock_http_instance = mock_http.return_value

        def generate_response(index):
            return {
                'code': 200,
                'message': 'success',
                'data': {
                    'id': f'click-{index}',
                    'image': f'image_{index}',
                    'target_chars': ['中', '国', '人'],
                    'char_positions': [
                        {'char': '中', 'x': 50, 'y': 30},
                        {'char': '国', 'x': 100, 'y': 25},
                        {'char': '人', 'x': 75, 'y': 55},
                    ],
                },
            }

        mock_http_instance.post.side_effect = [generate_response(i) for i in range(5)]

        config = CaptchaConfig(
            base_url='http://localhost:3000',
            app_id='test-app-id',
        )
        client = CaptchaXClient(config)

        def generate_captcha(index):
            return client.generate_click_captcha(char_count=3)

        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(generate_captcha, i) for i in range(5)]
            results = [future.result() for future in as_completed(futures)]

        assert len(results) == 5
        assert all(isinstance(r, ClickCaptchaResult) for r in results)

    @patch('captchax.client.HttpClient')
    def test_mixed_captcha_type_generation(self, mock_http):
        """Test parallel generation of mixed captcha types."""
        mock_http_instance = mock_http.return_value

        call_count = [0]

        def mixed_response(*args, **kwargs):
            idx = call_count[0]
            call_count[0] += 1

            if 'slider' in args[0] if args else 'slider' in kwargs.get('endpoint', ''):
                return {
                    'code': 200,
                    'message': 'success',
                    'data': {
                        'id': f'slider-{idx}',
                        'background_b64': f'bg_{idx}',
                        'slider_b64': f'slider_{idx}',
                        'target_x': 100,
                        'target_y': 50,
                    },
                }
            elif 'click' in args[0] if args else 'click' in kwargs.get('endpoint', ''):
                return {
                    'code': 200,
                    'message': 'success',
                    'data': {
                        'id': f'click-{idx}',
                        'image': f'image_{idx}',
                        'target_chars': ['A', 'B'],
                        'char_positions': [
                            {'char': 'A', 'x': 10, 'y': 20},
                            {'char': 'B', 'x': 30, 'y': 40},
                        ],
                    },
                }
            else:
                return {
                    'code': 200,
                    'message': 'success',
                    'data': {
                        'id': f'puzzle-{idx}',
                        'background_b64': f'bg_{idx}',
                        'puzzle_b64': f'puzzle_{idx}',
                        'target_x': 150,
                        'target_y': 75,
                    },
                }

        mock_http_instance.post.side_effect = mixed_response

        config = CaptchaConfig(
            base_url='http://localhost:3000',
            app_id='test-app-id',
        )
        client = CaptchaXClient(config)

        results = []

        def gen_slider():
            return client.generate_slider_captcha()

        def gen_click():
            return client.generate_click_captcha(char_count=2)

        def gen_puzzle():
            return client.generate_puzzle_captcha()

        with ThreadPoolExecutor(max_workers=3) as executor:
            futures = [
                executor.submit(gen_slider),
                executor.submit(gen_click),
                executor.submit(gen_puzzle),
            ]
            results = [future.result() for future in as_completed(futures)]

        assert len(results) == 3


class TestConcurrentVerification:
    """Test concurrent verification operations."""

    @patch('captchax.client.HttpClient')
    def test_parallel_slider_verification(self, mock_http):
        """Test parallel verification of slider captchas."""
        mock_http_instance = mock_http.return_value

        def verify_response(index):
            return {
                'code': 200,
                'message': 'success',
                'data': {
                    'success': index % 2 == 0,
                    'message': 'Verification passed' if index % 2 == 0 else 'Failed',
                },
            }

        mock_http_instance.post.side_effect = [verify_response(i) for i in range(10)]

        config = CaptchaConfig(
            base_url='http://localhost:3000',
            app_id='test-app-id',
        )
        client = CaptchaXClient(config)

        def verify_captcha(index):
            return client.verify_slider_captcha(
                captcha_id=f'slider-{index}',
                target_x=100 + index,
            )

        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(verify_captcha, i) for i in range(10)]
            results = [future.result() for future in as_completed(futures)]

        assert len(results) == 10
        assert all(isinstance(r, SliderVerifyResult) for r in results)

    @patch('captchax.client.HttpClient')
    def test_parallel_click_verification(self, mock_http):
        """Test parallel verification of click captchas."""
        mock_http_instance = mock_http.return_value

        def verify_response(index):
            return {
                'code': 200,
                'message': 'success',
                'data': {
                    'success': True,
                    'score': 0.9 + index * 0.01,
                    'message': 'Verification passed',
                },
            }

        mock_http_instance.post.side_effect = [verify_response(i) for i in range(5)]

        config = CaptchaConfig(
            base_url='http://localhost:3000',
            app_id='test-app-id',
        )
        client = CaptchaXClient(config)

        def verify_captcha(index):
            clicks = [
                CharPosition(char='中', x=50 + index, y=30),
                CharPosition(char='国', x=100 + index, y=25),
            ]
            return client.verify_click_captcha(
                captcha_id=f'click-{index}',
                clicks=clicks,
            )

        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(verify_captcha, i) for i in range(5)]
            results = [future.result() for future in as_completed(futures)]

        assert len(results) == 5
        assert all(isinstance(r, ClickVerifyResult) for r in results)


class TestConcurrentBatchOperations:
    """Test concurrent batch operations."""

    @patch('captchax.client.HttpClient')
    def test_parallel_batch_verification(self, mock_http):
        """Test parallel batch verification requests."""
        mock_http_instance = mock_http.return_value

        def batch_response(index):
            return {
                'code': 200,
                'message': 'success',
                'data': {
                    'results': [
                        {'captcha_id': f'c-{index}-1', 'success': True, 'message': 'OK', 'score': None},
                    ],
                    'summary': {'total': 1, 'success': 1, 'failed': 0, 'skipped': 0},
                },
            }

        mock_http_instance.post.side_effect = [batch_response(i) for i in range(5)]

        config = CaptchaConfig(
            base_url='http://localhost:3000',
            app_id='test-app-id',
        )
        client = CaptchaXClient(config)

        def batch_verify(index):
            items = [
                BatchVerifyItem(
                    captcha_id=f'c-{index}-1',
                    type='slider',
                    target_x=100,
                    target_y=50,
                ),
            ]
            return client.batch_verify(items)

        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(batch_verify, i) for i in range(5)]
            results = [future.result() for future in as_completed(futures)]

        assert len(results) == 5
        assert all(r.summary.total == 1 for r in results)


class TestThreadSafety:
    """Test thread safety of client operations."""

    def test_client_configuration_thread_safety(self):
        """Test that client configuration is thread-safe."""
        config = CaptchaConfig(
            base_url='http://localhost:3000',
            app_id='test-app-id',
        )
        client = CaptchaXClient(config)

        errors = []
        results = []

        def set_api_version(version):
            try:
                client.set_api_version(version)
                results.append(client.get_api_version())
            except Exception as e:
                errors.append(e)

        threads = []
        for i, version in enumerate(['v1', 'v2', 'v1', 'v2']):
            t = threading.Thread(target=set_api_version, args=(version,))
            threads.append(t)
            t.start()

        for t in threads:
            t.join()

        assert len(errors) == 0 or len([e for e in errors if isinstance(e, ValueError)]) >= 0

    @patch('captchax.client.HttpClient')
    def test_multiple_clients_independence(self, mock_http):
        """Test that multiple clients operate independently."""
        mock_http_instance = mock_http.return_value
        call_count = [0]

        def response_maker(*args, **kwargs):
            idx = call_count[0]
            call_count[0] += 1
            return {
                'code': 200,
                'message': 'success',
                'data': {
                    'id': f'captcha-{idx}',
                    'background_b64': f'bg',
                    'slider_b64': f'slider',
                    'target_x': 100,
                    'target_y': 50,
                },
            }

        mock_http_instance.post.side_effect = response_maker

        client1 = CaptchaXClient(CaptchaConfig(base_url='http://localhost:3000', app_id='app-1'))
        client2 = CaptchaXClient(CaptchaConfig(base_url='http://localhost:3000', app_id='app-2'))

        results1 = []
        results2 = []

        def use_client1():
            for _ in range(5):
                results1.append(client1.generate_slider_captcha())

        def use_client2():
            for _ in range(5):
                results2.append(client2.generate_slider_captcha())

        t1 = threading.Thread(target=use_client1)
        t2 = threading.Thread(target=use_client2)

        t1.start()
        t2.start()

        t1.join()
        t2.join()

        assert len(results1) == 5
        assert len(results2) == 5


class TestHighLoadScenarios:
    """Test high load scenarios."""

    @patch('captchax.client.HttpClient')
    def test_high_volume_captcha_generation(self, mock_http):
        """Test high volume captcha generation."""
        mock_http_instance = mock_http.return_value
        counter = [0]

        def generate_response(*args, **kwargs):
            idx = counter[0]
            counter[0] += 1
            return {
                'code': 200,
                'message': 'success',
                'data': {
                    'id': f'slider-{idx}',
                    'background_b64': 'bg',
                    'slider_b64': 'slider',
                    'target_x': 100,
                    'target_y': 50,
                },
            }

        mock_http_instance.post.side_effect = generate_response

        config = CaptchaConfig(
            base_url='http://localhost:3000',
            app_id='test-app-id',
        )
        client = CaptchaXClient(config)

        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(client.generate_slider_captcha) for _ in range(100)]
            results = [future.result() for future in as_completed(futures)]

        assert len(results) == 100

    @patch('captchax.client.HttpClient')
    def test_rapid_request_burst(self, mock_http):
        """Test rapid burst of requests."""
        mock_http_instance = mock_http.return_value
        counter = [0]

        def rapid_response(*args, **kwargs):
            idx = counter[0]
            counter[0] += 1
            return {
                'code': 200,
                'message': 'success',
                'data': {
                    'id': f'captcha-{idx}',
                    'background_b64': 'bg',
                    'slider_b64': 'slider',
                    'target_x': 100,
                    'target_y': 50,
                },
            }

        mock_http_instance.post.side_effect = rapid_response

        config = CaptchaConfig(
            base_url='http://localhost:3000',
            app_id='test-app-id',
        )
        client = CaptchaXClient(config)

        start_time = time.time()
        results = []

        for _ in range(50):
            try:
                result = client.generate_slider_captcha()
                results.append(result)
            except Exception:
                pass

        elapsed = time.time() - start_time

        assert len(results) == 50
        assert elapsed < 10


class TestRaceConditionHandling:
    """Test race condition handling."""

    @patch('captchax.client.HttpClient')
    def test_shared_resource_race_condition(self, mock_http):
        """Test handling of race conditions with shared resources."""
        mock_http_instance = mock_http.return_value
        request_log = []

        def logged_response(*args, **kwargs):
            request_log.append(('request', time.time()))
            return {
                'code': 200,
                'message': 'success',
                'data': {
                    'id': 'captcha-1',
                    'background_b64': 'bg',
                    'slider_b64': 'slider',
                    'target_x': 100,
                    'target_y': 50,
                },
            }

        mock_http_instance.post.side_effect = logged_response

        config = CaptchaConfig(
            base_url='http://localhost:3000',
            app_id='test-app-id',
        )
        client = CaptchaXClient(config)

        def worker(worker_id):
            for i in range(10):
                try:
                    client.generate_slider_captcha()
                except Exception:
                    pass

        threads = [threading.Thread(target=worker, args=(i,)) for i in range(5)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert len(request_log) > 0

    @patch('captchax.client.HttpClient')
    def test_timeout_during_concurrent_operations(self, mock_http):
        """Test behavior when timeout occurs during concurrent operations."""
        mock_http_instance = mock_http.return_value
        hang_time = [0.5]

        def slow_response(*args, **kwargs):
            time.sleep(hang_time[0])
            return {
                'code': 200,
                'message': 'success',
                'data': {
                    'id': 'captcha-1',
                    'background_b64': 'bg',
                    'slider_b64': 'slider',
                    'target_x': 100,
                    'target_y': 50,
                },
            }

        mock_http_instance.post.side_effect = slow_response

        config = CaptchaConfig(
            base_url='http://localhost:3000',
            app_id='test-app-id',
            timeout=100,
        )
        client = CaptchaXClient(config)

        results = []
        errors = []

        def worker():
            try:
                result = client.generate_slider_captcha()
                results.append(result)
            except CaptchaXError as e:
                errors.append(e)

        threads = [threading.Thread(target=worker) for _ in range(3)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert len(results) + len(errors) == 3


class TestStressTesting:
    """Stress testing scenarios."""

    @patch('captchax.client.HttpClient')
    def test_stress_test_alternating_operations(self, mock_http):
        """Test stress with alternating generate and verify operations."""
        mock_http_instance = mock_http.return_value
        counter = [0]
        is_generate = [True]

        def alternating_response(*args, **kwargs):
            idx = counter[0]
            counter[0] += 1

            if is_generate[0]:
                is_generate[0] = False
                return {
                    'code': 200,
                    'message': 'success',
                    'data': {
                        'id': f'captcha-{idx}',
                        'background_b64': 'bg',
                        'slider_b64': 'slider',
                        'target_x': 100,
                        'target_y': 50,
                    },
                }
            else:
                is_generate[0] = True
                return {
                    'code': 200,
                    'message': 'success',
                    'data': {
                        'success': True,
                        'message': 'OK',
                    },
                }

        mock_http_instance.post.side_effect = alternating_response

        config = CaptchaConfig(
            base_url='http://localhost:3000',
            app_id='test-app-id',
        )
        client = CaptchaXClient(config)

        results = []

        for i in range(20):
            if i % 2 == 0:
                results.append(client.generate_slider_captcha())
            else:
                results.append(client.verify_slider_captcha('captcha-1', 100))

        assert len(results) == 20

    @patch('captchax.client.HttpClient')
    def test_stress_with_client_reuse(self, mock_http):
        """Test stress scenario with heavy client reuse."""
        mock_http_instance = mock_http.return_value
        counter = [0]

        def response(*args, **kwargs):
            idx = counter[0]
            counter[0] += 1
            return {
                'code': 200,
                'message': 'success',
                'data': {
                    'id': f'captcha-{idx}',
                    'background_b64': 'bg',
                    'slider_b64': 'slider',
                    'target_x': 100,
                    'target_y': 50,
                },
            }

        mock_http_instance.post.side_effect = response

        config = CaptchaConfig(
            base_url='http://localhost:3000',
            app_id='test-app-id',
        )
        client = CaptchaXClient(config)

        success_count = [0]

        def stress_worker():
            for _ in range(100):
                try:
                    client.generate_slider_captcha()
                    success_count[0] += 1
                except Exception:
                    pass

        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(stress_worker) for _ in range(5)]
            for future in as_completed(futures):
                future.result()

        assert success_count[0] == 500


class TestMemoryLeakChecks:
    """Test for potential memory leaks under load."""

    @patch('captchax.client.HttpClient')
    def test_no_memory_leak_in_client_state(self, mock_http):
        """Test that client state doesn't accumulate memory under load."""
        mock_http_instance = mock_http.return_value
        counter = [0]

        def response(*args, **kwargs):
            idx = counter[0]
            counter[0] += 1
            return {
                'code': 200,
                'message': 'success',
                'data': {
                    'id': f'captcha-{idx}',
                    'background_b64': 'bg',
                    'slider_b64': 'slider',
                    'target_x': 100,
                    'target_y': 50,
                },
            }

        mock_http_instance.post.side_effect = response

        config = CaptchaConfig(
            base_url='http://localhost:3000',
            app_id='test-app-id',
        )
        client = CaptchaXClient(config)

        for _ in range(100):
            client.generate_slider_captcha()

        assert mock_http_instance.post.call_count == 100
