import os
os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp"
import cv2

STREAM_URL = "rtsp://localhost:8554/cam1"
PRINT_EVERY = 30

def main() -> None:
    # TODO 1: Open the stream with cv2.VideoCapture
    cap = cv2.VideoCapture(STREAM_URL)

    # TODO 2: if it did not opened, print a clear message and return
    is_opened = cap.isOpened()
    if not is_opened:
        print(f"Could not open {STREAM_URL}. Is MediaMTX running and does the path exist?")
        return

    frame_count = 0
    try:
        while True:
            # TODO 3: read one frame; if ok is False, print a message and stop the loop
            ok, frame =  cap.read();
            if not ok:
                print("No frame received, stopping.")
                break

            # TODO 4: increase the counter
            frame_count += 1

            # TODO 5: on every 30th frame print the frame number and frame.shape
            if frame_count % PRINT_EVERY == 0:
                print(f"frame {frame_count}: shape={frame.shape}")
                cv2.waitKey(1)
                cv2.imshow(f"Cropped Image {frame.shape}", frame)
    except KeyboardInterrupt:
        print("Stopped by user")
    finally:
        # TODO 6: release the capture
        cap.release()
        print(f"Released. Frames read: {frame_count}")

if __name__ == "__main__":
    main()
