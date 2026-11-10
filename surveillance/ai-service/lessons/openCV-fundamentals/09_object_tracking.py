import cv2
from ultralytics import YOLO

# Our first byte track implementation: Let's start with simple sebcam application.

# Load YOLO model:
model = YOLO("yolo11n.pt")

# Open webcam(video url/location)
cap = cv2.VideoCapture("rtsp://localhost:8554/fake3")

if not cap.isOpened:
    raise RuntimeError("Cannot open webcam")

# Store previous position of person:: store the last known position for each tracking ID.
previous_positions = {}
# Store IDs already counted
counted_ids = (
    set()
)  ### because we want to avoid the same tracked person multiple times.
entry_count = 0
restricted_y = 400

try:
    while True:
        ret, frame = cap.read()

        if not ret:
            print("Failed to read frame")
            break

        # • Person: 0 • bicycle: 1 • car: 2 • motorcycle: 3 • airplane: 4 • bus: 5 • train: 6 • truck: 7
        results = model.track(
            frame,  # current video frame
            persist=True,  # maintain tracking state b/w sequential frames
            classes=[0, 1, 2, 3, 5],  # track people, bicycle, car, motercycle, bus only
            conf=0.5,  # detection confidence threshold
            tracker="bytetrack.yaml",  # select bytetrack
            verbose=False,  # suppresses repeated model logs
        )

        # Get detected boxes from frame after processed through YOLO model("yolo11n.pt")
        boxes = results[0].boxes

        height, width = frame.shape[:2]
        # Draw a restricted Boundary
        cv2.rectangle(frame, (0, restricted_y), (width, restricted_y), (0, 0, 255), 2)

        if boxes is not None and boxes.id is not None:
            for box in boxes:
                # Get tracking ID from each box of the processed frame
                track_id = int(box.id.item())
                # Get bounding box coordinates of each box from processed frame
                x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                previous_y = previous_positions.get(track_id)
                center_x = (x1 + x2) // 2
                current_y = y2

                if previous_y is not None:
                    if (
                        previous_y <= restricted_y
                        and current_y > restricted_y
                        and track_id not in counted_ids
                    ):
                        entry_count += 1
                        counted_ids.add(track_id)
                        print(f"Person {track_id} entered restricted area!")

                # Update Position
                previous_positions[track_id] = current_y
                # Determine current status
                is_restricted = current_y > restricted_y

                color = (0, 0, 255) if is_restricted else (0, 255, 0)
                status = "RESTRICTED" if is_restricted else "SAFE"
                class_id = int(box.cls[0])
                class_name = model.names[class_id]

                # Draw a rectangle/bounding box
                cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)

                # Draw position point
                cv2.circle(frame, (center_x, current_y), 5, color, -1)

                # Display label with tracking Id
                label = f"{class_name} ID: {track_id}:{status}"
                cv2.putText(
                    frame,
                    label,
                    (x1, max(20, y1 - 10)),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.5,
                    color,
                    2,
                )

        # Display unique entry counter
        cv2.putText(
            frame,
            f"Unique Entries: {entry_count}",
            (20, 40),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.8,
            (0, 255, 255),
            2,
        )

        # Display the frame with bounding box
        cv2.imshow("ByteTrack object tracking", frame)

        if cv2.waitKey(1) & 0xFF == ord("q"):
            break
finally:
    cap.release()
    cv2.destroyAllWindows()
