"""CaptchaX Python SDK - Python client for CaptchaX verification service."""

__version__ = '1.0.0'
__author__ = 'CaptchaX Team'
__license__ = 'MIT'

from .client import CaptchaXClient, CaptchaXError
from .types import (
    ApiVersion,
    CaptchaConfig,
    SliderCaptchaResult,
    SliderVerifyResult,
    ClickCaptchaResult,
    ClickVerifyResult,
    PuzzleCaptchaResult,
    PuzzleVerifyResult,
    Scenario,
    Webhook,
    BatchVerifyItem,
    BatchVerifyResult,
    BatchVerifyResponse,
    BatchVerifySummary,
    HealthStatus,
    CharPosition,
    CaptchaResponse,
)

__all__ = [
    'CaptchaXClient',
    'CaptchaXError',
    'ApiVersion',
    'CaptchaConfig',
    'SliderCaptchaResult',
    'SliderVerifyResult',
    'ClickCaptchaResult',
    'ClickVerifyResult',
    'PuzzleCaptchaResult',
    'PuzzleVerifyResult',
    'Scenario',
    'Webhook',
    'BatchVerifyItem',
    'BatchVerifyResult',
    'BatchVerifyResponse',
    'BatchVerifySummary',
    'HealthStatus',
    'CharPosition',
    'CaptchaResponse',
]
