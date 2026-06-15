import numpy as np

from app.modules.audio.chunker import AudioChunker


def test_chunker_emits_fixed_size_chunks_with_overlap() -> None:
    chunker = AudioChunker(
        chunk_duration_s=1.0,
        overlap_duration_s=0.25,
        sample_rate=10,
    )
    sample = np.ones(10, dtype=np.float32)

    first_batch = chunker.push(sample)
    second_batch = chunker.push(sample * 2)

    assert len(first_batch) == 1
    assert first_batch[0].size == 10
    assert len(second_batch) == 1
    assert second_batch[0].size == 10


def test_chunker_flush_returns_remaining_buffer() -> None:
    chunker = AudioChunker(
        chunk_duration_s=1.0,
        overlap_duration_s=0.25,
        sample_rate=10,
    )
    sample = np.ones(6, dtype=np.float32)

    emitted = chunker.push(sample)
    remaining = chunker.flush()

    assert emitted == []
    assert remaining is not None
    assert remaining.size == 6
