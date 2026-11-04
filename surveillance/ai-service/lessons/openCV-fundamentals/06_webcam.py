import cv2

# Open the default webcam
cap = cv2.VideoCapture("rtsp://localhost:8554/fake1", cv2.CAP_FFMPEG)

# Check camera connection
if not cap.isOpened():
    raise  RuntimeError("Cannot connect to RTSP stream")

try:
    while True:
        # Read the single frame from cap.
        ok, frame = cap.read()

        if not ok:
            print("Failed to read frame")
            break

        # Resize the frame
        frame = cv2.resize(frame, (640, 480))

        # Convert frame to graystyle
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        # Add title
        cv2.putText(
            frame,
            "AI Surveillance System",
            (20, 40),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.8,
            (0, 255, 0),
            2
        )

        # Draw restricted boundary to
        cv2.line(
            frame,
            (0, 350),
            (640, 350),
            (0, 0, 255),
            2
        )

        cv2.imshow("Original Stream", frame)
        cv2.imshow("Grayscale Stream", gray)

        # fps = cap.get(cv2.CAP_PROP_FPS)
        # if fps > 0:
        #     print(fps)
        #     delay = max(1, int(1000 / fps))
        # else:
        #     delay = 33

        # # Display frame
        # cv2.imshow("Live Webcam", frame)

        # Press Q to quit
        if cv2.waitKey(1) & 0xFF == ord("q"):
            break
finally:
    cap.release()
    cv2.destroyAllWindows()
