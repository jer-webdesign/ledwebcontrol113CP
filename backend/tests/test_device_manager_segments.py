import pytest
from unittest.mock import patch, MagicMock
import os

from backend.app.utils.device_manager import DeviceManager


@pytest.fixture
def dm(tmp_path, monkeypatch):
    # Create a temporary network_devices.json with one device matching the attachment
    data = {
        "zones": [
            {
                "zone_id": 1,
                "groups": [
                    {
                        "group_id": 1,
                        "location": [
                            {
                                "location_id": "1",
                                "device": [
                                    {
                                        "device_id": 1,
                                        "device_name": "LED Strip1",
                                        "device_ip": "10.0.0.140",
                                        "device_mac": "20:6E:F1:6D:F4:78",
                                        "device_current_color": "#afab2c",
                                        "device_segment_colors": [
                                            "#3dd1db",
                                            "#a52222"
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }
        ]
    }
    file_path = tmp_path / "network_devices.json"
    with open(file_path, 'w') as f:
        import json
        json.dump(data, f)

    dm = DeviceManager(str(file_path))
    return dm


def test_segment_mapping_even_split(dm, monkeypatch):
    # Mock esp32_client methods
    mock_get_state = MagicMock(return_value={
        # Simulate device state without 'seg' start/stop but with top-level leds count
        'seg': [],
        'leds': 300
    })

    captured = {}

    def fake_set_device_state(ip, payload):
        # Capture payload for assertions
        captured['ip'] = ip
        captured['payload'] = payload
        return {'success': True}

    with patch('backend.app.utils.device_manager.esp32_client.get_device_state', mock_get_state), \
         patch('backend.app.utils.device_manager.esp32_client.set_device_state', fake_set_device_state):
        # Call set_device_power to trigger segment distribution
        res = dm.set_device_power(1, True)

    # Assertions
    assert 'payload' in captured, "No payload captured from set_device_state"
    payload = captured['payload']
    assert payload.get('on') is True
    segs = payload.get('seg')
    assert isinstance(segs, list)
    # Should build exactly 60 segments
    assert len(segs) == 60

    # First segment color should be '#3dd1db' -> RGB
    first_col = segs[0].get('col')[0]
    assert first_col == [0x3d, 0xd1, 0xdb]

    # Second segment color should be '#a52222'
    second_col = segs[1].get('col')[0]
    assert second_col == [0xa5, 0x22, 0x22]

    # Third through last should be current color '#afab2c'
    for i in range(2, 60):
        c = segs[i].get('col')[0]
        assert c == [0xaf, 0xab, 0x2c]

    # Check start/stop ranges are present when total_leds provided
    # first segment should have start 0
    assert 'start' in segs[0]
    assert 'stop' in segs[0]
    assert segs[0]['start'] == 0
    # last segment should end at leds-1
    assert segs[-1]['stop'] == 300 - 1
