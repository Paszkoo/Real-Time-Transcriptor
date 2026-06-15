from fastapi.testclient import TestClient

from app.main import app


def test_devices_endpoint_returns_microphone_fields() -> None:
    client = TestClient(app)

    response = client.get("/api/devices")

    assert response.status_code == 200
    payload = response.json()
    assert "devices" in payload
    if payload["devices"]:
        device = payload["devices"][0]
        assert {"id", "name", "sample_rate", "is_default"} <= device.keys()


def test_capture_status_defaults() -> None:
    client = TestClient(app)

    response = client.get("/api/capture/status")

    assert response.status_code == 200
    assert response.json() == {
        "is_capturing": False,
        "is_paused": False,
        "device_id": None,
        "device_name": None,
        "source_type": "microphone",
        "session_id": None,
        "started_at": None,
        "elapsed_ms": 0,
        "audio_level": 0.0,
        "vad_active": False,
        "chunks_emitted": 0,
        "chunks_filtered": 0,
        "queue_size": 0,
    }
