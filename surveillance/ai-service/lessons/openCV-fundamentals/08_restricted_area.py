import cv2
from ultralytics import YOLO

# Load pretrained YOLO model:
model = YOLO("yolo11n.pt")

# Open webcam
cap = cv2.VideoCapture("rtsp://localhost:8554/fake1")

if not cap.isOpened():
    raise RuntimeError("Cannot open webcam")

restricted_y = 400  # restricted boundary.
#### Learn about tracking
# Basic entry-crossing code
previous_positions = {}
entry_count = 0

try:
    while True:
        ok, frame = cap.read()

        if not ok:
            break

        # Resize for consistent coordinates
        # frame = cv2.resize(frame, (640, 480))
        height, width = frame.shape[:2]
        restricted_count = 0

        # Draw the restricted boundary line:
        cv2.line(frame, (0, restricted_y), (width, restricted_y), (0, 0, 255), 2)

        # Run object detection
        results = model.track(
            frame,
            persist=True,
            classes=[1],
            conf=0.5,
            tracker="bytetrack.yaml",
            verbose=False,
        )
        # person_count = len(results[0].boxes)
        boxes = results[0].boxes

        if boxes is not None and boxes.id is not None:
            # Draw our own bounding boxes.
            for box in boxes:
                track_id = int(box.id.item())

                # Bounding box coordinates
                # box.xyxy[0]: return the object bounding box coordinates in format: [x1, y1, x2, y2]
                x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                
                current_y = y2
                previous_y = previous_positions.get(track_id)

                if previous_y is not None:
                    if previous_y <= restricted_y < current_y:
                        entry_count += 1
                        print(f"Person {track_id} entered!")

                previous_positions[track_id] = current_y

                # Person botton-center point is
                center_x = (x1 + x2) // 2
                bottom_y = y2
                # Check weather the person is restricted means it touch the boundary line (restricted_y).
                is_restricted = bottom_y > restricted_y

                if is_restricted:
                    box_color = (0, 0, 255)
                    status = "RESTRICTED"
                    restricted_count += 1
                else:
                    box_color = (0, 255, 0)
                    status = "SAFE"

                # Detect model Confidence score for specific detection.
                confidence = float(box.conf[0])

                # Draw rectangle:
                cv2.rectangle(frame, (x1, y1), (x2, y2), box_color, 2)
                # Draw bottom-center point
                cv2.circle(frame, (center_x, bottom_y), 5, box_color, -1)

                # add label:
                label = f"Person : {confidence:.2f} — {status}"
                cv2.putText(
                    frame,
                    label,
                    (x1, max(20, y1 - 10)),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.6,
                    box_color,
                    2,
                )

            # Display boundary count entries
            cv2.putText(
                frame,
                f"Total entered: {entry_count}",
                (20, 40),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (0, 0, 0),
                2,
            )
            # Display restricted count
            cv2.putText(
                frame,
                f"Restricted People: {restricted_count}",
                (20, 60),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (0, 255, 255),
                2,
            )

            # # Draw predicted bounding boxes, class labels and confidence scores.
            # annotated_frame = results[0].plot()

            cv2.imshow("Restricted Area Monitoring", frame)

            if cv2.waitKey(1) & 0xFF == ord("q"):
                break
finally:
    cap.release()
    cv2.destroyAllWindows()
