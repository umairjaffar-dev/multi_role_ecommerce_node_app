import cv2
from ultralytics import YOLO

# Load pretrained YOLO model:
model = YOLO("yolo11n.pt")

# Open webcam
cap = cv2.VideoCapture("rtsp://localhost:8554/fake1")

if not cap.isOpened():
    raise RuntimeError("Cannot open webcam")

try:
    while True:
        ok, frame = cap.read()

        if not ok:
            break

        # Run object detection
        results = model(frame, classes=[0], conf=0.5, verbose=False)

        person_count = len(results[0].boxes)

        # Draw our own bounding boxes.
        for box in results[0].boxes:
            # Bounding box coordinates
            # box.xyxy[0]: return the object bounding box coordinates in format: [x1, y1, x2, y2]
            x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())

            # Detect model Confidence score for specific detection.
            confidence = float(box.conf[0])

            # Draw rectangle:
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)

            # add label:
            label = f"Person : {confidence:.2f}"
            cv2.putText(
                frame,
                label,
                (x1, max(20, y1 - 10)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                (0, 255, 0),
                2,
            )

        # Display count
        cv2.putText(
            frame,
            f"People Detected: {person_count}",
            (20, 40),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.8,
            (0, 0, 0),
            2,
        )

        # # Draw predicted bounding boxes, class labels and confidence scores.
        # annotated_frame = results[0].plot()

        cv2.imshow("Person Detection", frame)

        if cv2.waitKey(1) & 0xFF == ord("q"):
            break
finally:
    cap.release()
    cv2.destroyAllWindows()
