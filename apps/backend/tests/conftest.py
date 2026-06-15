import numpy as np
import pytest

from tests.mock_source import MockAudioSource


@pytest.fixture
def mock_audio_source() -> MockAudioSource:
    tone = np.linspace(-0.2, 0.2, 3200, dtype=np.float32)
    return MockAudioSource([tone, tone, tone])
