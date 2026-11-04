from ultralytics import YOLO

# Load a pretrained object detection model
model = YOLO("yolo11n.pt")

# Detect objects in an image
results = model("images/sample.jpg")

# Display detections
results[0].show()