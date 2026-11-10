import cv2
import numpy as np
from ultralytics import YOLO

# YOLO(You Only Look Once) is an object detection model.
# It analyise an image and predict:
# - What the object is,
# - where object is present
# - how confidence the model is about each detection.
model = YOLO(
    "yolo11n.pt"
)  # - Load the YOLO model: YOLO is the model class provided by ultralytics
# - yolo11n is the pretrained YOLO11 nano model
# - model is the object used to perform detections.

VIDEO_PATH = "videos/city.mp4"
restricted_zones = {
    "Zone A (Incoming)": np.array(
        [[330, 160], [795, 160], [900, 500], [200, 500]], dtype=np.int32
    ),
    "Zone B (Outgoing)": np.array(
        [[800, 160], [1000, 160], [1200, 500], [905, 500]], dtype=np.int32
    ),
}

cap = cv2.VideoCapture(VIDEO_PATH)

if not cap.isOpened():
    raise RuntimeError("Could not open video")

# Total cars that have entered each zone
total_incoming = 0
total_outgoing = 0

# Remember each car's previous zone membership
previous_zones = {}

while True:
    ret, frame = cap.read()

    if not ret:
        break

    frame = cv2.resize(frame, (1280, 780))
    # Current cars inside each zone
    cars_in_zones = {"Zone A (Incoming)": set(), "Zone B (Outgoing)": set()}
    results = model.track(
        frame,
        persist=True,
        classes=[2],
        conf=0.2,
        tracker="bytetrack.yaml",
        verbose=False,
    )
    # YOLO return the detections for the frame, we can access it like above.
    boxes = results[0].boxes

    if boxes is not None and boxes.id is not None:
        for box in boxes:
            track_id = int(box.id.item())
            x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
            confidence = float(box.conf[0])
            class_id = int(box.cls[0])
            center_x = (x1 + x2) // 2
            bottom_y = (y1 + y2) // 2

            car_point = (center_x, bottom_y)
            current_zones = set()

            # ### ----------------- Zones for tracking Incomming and Outgoing cars
            for zone_name, polygon in restricted_zones.items():

                cv2.polylines(
                    frame, [polygon], isClosed=True, color=(0, 0, 255), thickness=2
                )

                cv2.putText(
                    frame,
                    zone_name,
                    tuple(polygon[0]),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.7,
                    (0, 255, 0),
                    2,
                )

                result = cv2.pointPolygonTest(polygon, car_point, False)
                if result >= 0:
                    # print(f"Car ID {track_id} is inside {zone_name}")
                    cars_in_zones[zone_name].add(track_id)
                    # Current zones for this car
                    current_zones.add(zone_name)


            old_zones = previous_zones.get(track_id, set())
            entered_zones = current_zones - old_zones

            if "Zone A (Incoming)" in entered_zones:
                total_incoming += 1
                print(f"New incoming car! ID: {track_id}")

            if "Zone B (Outgoing)" in entered_zones:
                total_outgoing += 1
                print(f"New outgoing car! ID: {track_id}")
            previous_zones[track_id] = current_zones


            # ### -------------- Rectangles for tracking cars
            # print(x1, y1, x2, y2, confidence, class_id)
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)

            label = f"ID: {track_id} | Conf: {confidence:.2f}"
            cv2.putText(
                frame,
                label,
                (x1, y1 - 10),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.5,
                (0, 255, 0),
                2,
            )

            # Person center point:
            cv2.circle(frame, car_point, 5, (255, 0, 0), -1)

    incoming_count = len(cars_in_zones["Zone A (Incoming)"])
    outgoing_count = len(cars_in_zones["Zone B (Outgoing)"])
    print("Incoming cars:", incoming_count)
    print("Outgoing cars:", outgoing_count)

    # Incoming dashboard - LEFT SIDE
    cv2.rectangle(
        frame,
        (20, 20),
        (320, 155),
        (30, 30, 30),
        -1
    )

    cv2.putText(
        frame,
        "INCOMING",
        (40, 50),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.8,
        (0, 255, 0),
        2
    )

    cv2.putText(
        frame,
        f"Currently Inside: {incoming_count}",
        (40, 90),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.6,
        (255, 255, 255),
        2
    )

    cv2.putText(
        frame,
        f"Total Incoming: {total_incoming}",
        (40, 125),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.6,
        (255, 255, 255),
        2
    )

    # Outgoing dashboard - RIGHT SIDE
    cv2.rectangle(
        frame,
        (960, 20),
        (1260, 155),
        (30, 30, 30),
        -1
    )

    cv2.putText(
        frame,
        "OUTGOING",
        (980, 50),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.8,
        (0, 165, 255),
        2
    )

    cv2.putText(
        frame,
        f"Currently Inside: {outgoing_count}",
        (980, 90),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.6,
        (255, 255, 255),
        2
    )

    cv2.putText(
        frame,
        f"Total Outgoing: {total_outgoing}",
        (980, 125),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.6,
        (255, 255, 255),
        2
    )

    cv2.imshow("Multi-Zone Monitoring", frame)

    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

cap.release()
cv2.destroyAllWindows()
