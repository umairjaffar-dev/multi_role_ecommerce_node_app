"""
Count vehicles entering two zones (incoming / outgoing) in a video file or an RTSP camera.

Flow per frame: read -> resize to the zones' size -> YOLO + ByteTrack -> point-in-polygon
per tracked vehicle -> count each vehicle once per zone -> draw -> show.
"""

import os

# OpenCV reads this when it opens a stream; our MediaMTX accepts RTSP over TCP only.
os.environ.setdefault("OPENCV_FFMPEG_CAPTURE_OPTIONS", "rtsp_transport;tcp")

import time

import cv2
import numpy as np
from ultralytics import YOLO

# ── Settings ──────────────────────────────────────────────────────────────────
SOURCE = "videos/city.mp4"  # or "rtsp://localhost:8554/cam1"
MODEL_PATH = "yolo11n.pt"
SHOW_WINDOW = True

# The zone coordinates below are for this frame size (width, height). 16:9 like the
# source, so the picture is not stretched.
FRAME_SIZE = (1280, 720)

# COCO class ids: 2 car, 3 motorcycle, 5 bus, 7 truck. Vans and pickups are often "truck".
VEHICLE_CLASSES = [2, 3, 5, 7]
CONFIDENCE = 0.25
MIN_FRAMES_IN_ZONE = 5  # a car must stay inside this many frames in a row to be counted

GREEN = (0, 255, 0)
RED = (0, 0, 255)
BLUE = (255, 0, 0)
ORANGE = (0, 165, 255)
WHITE = (255, 255, 255)
DARK = (30, 30, 30)
FONT = cv2.FONT_HERSHEY_SIMPLEX

ZONES = {
    "incoming": {
        "label": "Zone A (Incoming)",
        "title": "INCOMING",
        # Your old points were for 1280x780; y is scaled by 720/780 (160 -> 148, 500 -> 462)
        "polygon": np.array([[330, 148], [795, 148], [900, 462], [200, 462]], np.int32),
        "color": GREEN,
        "panel_x": 20,
    },
    "outgoing": {
        "label": "Zone B (Outgoing)",
        "title": "OUTGOING",
        "polygon": np.array(
            [[800, 148], [1000, 148], [1200, 462], [905, 462]], np.int32
        ),
        "color": ORANGE,
        "panel_x": FRAME_SIZE[0] - 320,
    },
}


def anchor_point(x1: int, y1: int, x2: int, y2: int) -> tuple[int, int]:
    """Bottom-center of the box: where the vehicle touches the road. With a camera that
    looks at the road at an angle, this decides the zone better than the box center."""
    return (x1 + x2) // 2, y2


def draw_zones(frame: np.ndarray) -> None:
    for zone in ZONES.values():
        cv2.polylines(frame, [zone["polygon"]], isClosed=True, color=RED, thickness=2)
        x, y = zone["polygon"][0]
        cv2.putText(
            frame, zone["label"], (int(x), int(y) - 8), FONT, 0.7, zone["color"], 2
        )


def draw_panel(
    frame: np.ndarray, x: int, title: str, color, inside: int, total: int
) -> None:
    cv2.rectangle(frame, (x, 20), (x + 300, 155), DARK, -1)
    cv2.putText(frame, title, (x + 20, 50), FONT, 0.8, color, 2)
    cv2.putText(frame, f"Currently inside: {inside}", (x + 20, 90), FONT, 0.6, WHITE, 2)
    cv2.putText(frame, f"Total entered: {total}", (x + 20, 125), FONT, 0.6, WHITE, 2)


def main() -> None:
    model = YOLO(MODEL_PATH)
    cap = cv2.VideoCapture(SOURCE)
    if not cap.isOpened():
        print(f"Could not open {SOURCE}")
        return

    # Each vehicle is counted once per zone, even if its box jitters across the zone edge.
    # (Only small ints; for a 24/7 camera you would reset these e.g. once a day.)
    counted_ids: dict[str, set[int]] = {name: set() for name in ZONES}
    # zone -> {track id: consecutive frames inside}
    frames_inside: dict[str, dict[int, int]] = {name: {} for name in ZONES}

    frame_number = 0
    fps = 0.0
    previous_time = time.perf_counter()

    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                print("No more frames")
                break
            frame_number += 1

            # Resize only when needed: a camera that already sends 1280x720 skips the work.
            if (frame.shape[1], frame.shape[0]) != FRAME_SIZE:
                frame = cv2.resize(frame, FRAME_SIZE)

            results = model.track(
                frame,
                persist=True,  # keep track ids across frames
                classes=VEHICLE_CLASSES,
                conf=CONFIDENCE,
                agnostic_nms=True,  # one box per object, even if YOLO says both "car" and "truck"
                tracker="vehicle_tracker.yaml",
                verbose=False,
            )
            boxes = results[0].boxes
            inside_now: dict[str, set[int]] = {name: set() for name in ZONES}

            if boxes is not None and boxes.id is not None:
                # Convert all boxes at once: one copy from the model's tensors to Python
                # lists per frame, instead of several tiny copies per box.
                track_ids = boxes.id.int().tolist()
                coordinates = boxes.xyxy.int().tolist()
                confidences = boxes.conf.tolist()

                for track_id, (x1, y1, x2, y2), confidence in zip(
                    track_ids, coordinates, confidences
                ):
                    point = anchor_point(x1, y1, x2, y2)

                    for name, zone in ZONES.items():
                        if cv2.pointPolygonTest(zone["polygon"], point, False) >= 0:
                            inside_now[name].add(track_id)
                            streak = frames_inside[name].get(track_id, 0) + 1
                            frames_inside[name][track_id] = streak
                            if (
                                streak >= MIN_FRAMES_IN_ZONE
                                and track_id not in counted_ids[name]
                            ):
                                counted_ids[name].add(track_id)
                                print(f"{zone['label']}: new vehicle, id {track_id}")

                    cv2.rectangle(frame, (x1, y1), (x2, y2), GREEN, 2)
                    cv2.putText(
                        frame,
                        f"ID {track_id} {confidence:.2f}",
                        (x1, y1 - 8),
                        FONT,
                        0.5,
                        GREEN,
                        2,
                    )
                    cv2.circle(frame, point, 5, BLUE, -1)

            # Reset the streak of cars that are not inside any more (also keeps memory small)
            for name in ZONES:
                frames_inside[name] = {
                    t: n
                    for t, n in frames_inside[name].items()
                    if t in inside_now[name]
                }
            draw_zones(frame)
            for name, zone in ZONES.items():
                draw_panel(
                    frame,
                    zone["panel_x"],
                    zone["title"],
                    zone["color"],
                    len(inside_now[name]),
                    len(counted_ids[name]),
                )

            now = time.perf_counter()
            fps = 0.9 * fps + 0.1 * (1 / (now - previous_time))  # smoothed
            previous_time = now
            cv2.putText(
                frame, f"{fps:.1f} FPS", (20, FRAME_SIZE[1] - 20), FONT, 0.7, WHITE, 2
            )

            if SHOW_WINDOW:
                cv2.imshow("Multi-Zone Monitoring", frame)
                if cv2.waitKey(1) & 0xFF == ord("q"):
                    break
    except KeyboardInterrupt:
        print("Stopped by user")
    finally:
        cap.release()
        if SHOW_WINDOW:
            cv2.destroyAllWindows()
        print({ZONES[name]["label"]: len(ids) for name, ids in counted_ids.items()})


if __name__ == "__main__":
    main()
