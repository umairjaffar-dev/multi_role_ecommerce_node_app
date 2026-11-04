import cv2
from pathlib import Path

# # Read the image to path.
# image = cv2.imread("images/sample.jpg")
# if image is None:
#     raise FileNotFoundError("Image not found!")

# # __________________________________________________________________________________
# # Task 1 — Draw a rectangle:
# cv2.rectangle(
#     image,  # Image to modify
#     (100, 50),  # top-left corner (x1, y1)
#     (300, 250),  # bottom-right corner (x2, y2)
#     (0, 255, 0),  # BGR color tuple
#     1,  # border thickness in pixels
# )

# # __________________________________________________________________________________
# # Task 1 — Draw a circle:
# cv2.circle(
#     image,
#     (250, 250),  # center (x, y)
#     50,  # radius
#     (0, 0, 255),  # BGR color tuple
#     -1,  # border thickness
# )

# # __________________________________________________________________________________
# # Task 1 — Draw a line:
# cv2.line(
#     image,
#     (250, 100),  # starting point (x, y)
#     (450, 100),  # ending point
#     (255, 0, 255),  # BGR color tuple
#     1,  # border thickness
# )

# # __________________________________________________________________________________
# # Task 4 — Write text on an image:
# cv2.putText(
#     image,
#     "AI Surveillance System",
#     (0, 20),  # Text position
#     cv2.FONT_HERSHEY_SIMPLEX,  # Font
#     0.8,  # font scale
#     (255, 0, 0),  # BGR color tuple
#     3,  # border thickness
# )

# cv2.imshow("Bounding boxes", image)
# cv2.waitKey(0)
# cv2.destroyAllWindows()

# __________________________________________________________________________________
#                    Our mini-project — Manual Person Annotation
# __________________________________________________________________________________

# ### Requirements:
# - Load an image.
# - Draw a green rectangle around a person or object.
# - Add the label "Person Detected" above the rectangle.
# - Draw a red horizontal line representing a restricted boundary.
# - Add "Restricted Area" near the line.
# - Save the annotated image as output/surveillance_result.jpg.

# Step 1: Load/read an image:
image = cv2.imread("images/persons.jpg")
if image is None:
    raise FileNotFoundError("Image not found!")

is_restricted = True
if is_restricted:
    box_color = (0, 0, 255)  # Red
else:
    box_color = (0, 255, 0)  # Green


# Person 1:
cv2.putText(
    image,
    "Person1 Detected",
    (110, 168),
    cv2.FONT_HERSHEY_SIMPLEX,  # Font
    0.4,  # font scale
    (255, 0, 0),  # BGR color tuple
    2,  # border thickness
)
cv2.rectangle(image, (110, 170), (270, 500), box_color, 2)

# Person 2:
cv2.putText(
    image,
    "Person2 Detected",
    (370, 138),
    cv2.FONT_HERSHEY_SIMPLEX,  # Font
    0.4,  # font scale
    (255, 0, 0),  # BGR color tuple
    2,  # border thickness
)
cv2.rectangle(image, (370, 140), (500, 450), box_color, 2)

# Restricted Boundary:
cv2.putText(
    image,
    "Restricted Area",
    (20, 340),
    cv2.FONT_HERSHEY_SIMPLEX,
    0.7,
    (0, 0, 255),
    2
)
cv2.line(image, (0, 350), (image.shape[1], 350), (0, 0, 255), 2)
cv2.line(
    image,
    (226, 230),  # starting point (x, y)
    (820, 590),  # ending point
    (255, 0, 255),  # BGR color tuple
    2,  # border thickness
)

cv2.imshow("Persons detected", image)
cv2.waitKey(0)
cv2.destroyAllWindows()

# Save the image to output directory:
Path("output").mkdir(exist_ok=True)
cv2.imwrite("output/surveillance_result.jpg", image)