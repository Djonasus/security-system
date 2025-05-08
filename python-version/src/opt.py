import os
import os.path as path

class Options():
    optical_stream_name = "cam/realmonitor?channel=1&subtype=1"
    thermal_stream_name = "cam/realmonitor?channel=2&subtype=1"
    # optical_stream_name = "1/h264major"
    # thermal_stream_name = "1/h264minor"
    cam_login = "admin"
    cam_password = "A96IW2Ud"
    cam_ip_addr = "192.168.1.101"
    relay_ip_addr = "192.168.1.20"
    rtsp_port = 554
    video_save_path = path.join(os.getcwd(), "Video")
    ffmpeg_opt = [
        "analyzeduration;0",
        "fflags;nobuffer",
        "flags;low_delay",
        "framedrop",
        "sync;video",
        "rtsp_transport;tcp",
    ]
