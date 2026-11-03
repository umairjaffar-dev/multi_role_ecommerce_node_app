import cv2

# # __________________________________________________________________________________
# # Task 1 — Read and display an image
# # Read an image
# image = cv2.imread("images/sample.jpg") # loads an image from disk.

# if image is None:
#     raise FileNotFoundError("Image not found!")

# # Display the image
# cv2.imshow("AI Surveillance System", image) # Display an image on window.

# # wait untill a key is pressed
# cv2.waitKey(0) # waits indefinitly for a key press

# # Close all the OpenCV windows
# cv2.destroyAllWindows() # close openCV window
# # __________________________________________________________________________________


# # __________________________________________________________________________________
# # Task 2 — Understand image pixels:

# # First we will read the image:
# image = cv2.imread("images/sample.jpg")
# if image is None:
#     raise FileNotFoundError("Image not found!")

# print("Image Shape: ", image.shape);
# print("Image Datatype: ", image.dtype);
# print("Image Pixel: ", image[0, 10])

# # ----- OUTPUT -------
# # Image Shape:  (407, 612, 3)
#     # The image is store 3D NumPy array with dimensions (Height, Width, Channels)
#         # Height:  the image is 407 pixels tall (407 rows). each pixels is consider as one column.
#         # Width:   the image is 612 pixels wide (612 columns)
#         # Channel: The image is standard color image with 3 color channels.

# # Image Datatype:  uint8
#     # What -> unit8 stands for unsigned 8-bit integer.
#     # Why -> each pixel value in each color channel is stored as number b/w 0 to 255.
#         # 0 represents complete darkness.
#         # 255 represents maximum brightness for that color.

# # Image Pixel(image[0, 0]):  [32 41 28]
#     # this is the color value of single pixel located at top-left corner(row 0, column 0)
#     # Crucial OpenCV Rule: Unlike most libraries (like Pillow or Matplotlib) which use RGB, OpenCV loads images int BGR format by default.
#         # Blue (B) intensity: 32 out of 255.
#         # Green (G) intensity: 41 out of 255.
#         # Red (R) intensity: 28 out of 255.
#     # Because the green and blue values are slightly higher than red, this top-left pixel is very dark, muted blue-green tone.
# # __________________________________________________________________________________


# # __________________________________________________________________________________
# # Task 3 — Resize an image:
# # ### In CCTV applications frames can be very large, resizing can be reduce the amount of data processed.
# image = cv2.imread("images/sample.jpg")
# if image is None:
#     raise FileNotFoundError("Image not found!")

# # print(image)

# # resized = cv2.resize(image, (640, 480)); ## Resized!!
# print("Orignal Image Size: ", image.shape)
# # print("ReSize: ", resized.shape)
# # cv2.imshow("ReSized Image", resized); ## display Resized image.

# # # ### subtask: Resize the orignal image by half its original size.
# # resized_half = cv2.resize(image, (0, 0), fx=0.5, fy=0.5);
# # print("Half Size Image: ", resized_half.shape)
# # cv2.imshow("Half Size Image", resized_half);

# height, width = image.shape[:2]
# half_height = height // 2
# half_width = width // 2
# half_size = (half_width, half_height)
# resized_half = cv2.resize(image, half_size)
# print("Half Size Image: ", resized_half.shape)
# cv2.imshow("Half Size Image", resized_half);

# cv2.waitKey(0);
# cv2.destroyAllWindows();
# # __________________________________________________________________________________


# # __________________________________________________________________________________
# # Task 4 — Convert an image to grayscale
# image = cv2.imread("images/sample.jpg")

# if image is None:
#     raise FileNotFoundError("Image not found!!!")

# gray_image = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
# print("Original Shape:", image.shape)
# print("Grayscale Shape:", gray_image.shape)

# cv2.imshow("Original", image)
# cv2.imshow("Grayscale", gray_image)

# # Save the gray style image  to folder
# cv2.imwrite("images/grayscale.jpg", gray_image)

# cv2.waitKey(0)
# cv2.destroyAllWindows()
# # __________________________________________________________________________________

# # __________________________________________________________________________________
# # Task 5 — Crop an image:
# image = cv2.imread("images/sample.jpg")

# if image is None:
#     raise FileNotFoundError("Image not found!!!")

# # Crop: image[y1:y2, x1:x2]
#     # 'y1:y1' : select rows (verical direction)
#     # 'y1:y1' : select columns (vhorizantal direction)
# croppedImage = image[50:250, 100:400]

# cv2.imshow("Original", image)
# cv2.imshow("Cropped", croppedImage)

# cv2.waitKey(0)
# cv2.destroyAllWindows()
# # __________________________________________________________________________________



# __________________________________________________________________________________
#                    Our mini-project — Image Processing Toolkit      
# __________________________________________________________________________________

# ### Requirements: 
        # Our program should read an image
        # display its dimensions
        # resize it
        # convert it to grayscale
        # crop a region
        # save the processed images.

# Step 1: Our program should read an image
image = cv2.imread("images/sample.jpg")
if image is None:
    raise FileNotFoundError("Image not found!!!")

# Step 2: display its dimensions
print("Image Dimensions: ", image.shape)

# Step 3: resize it
resizedImage = cv2.resize(image, (450, 250))

# convert it to grayscale
grayImage = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
croppedImage = grayImage[100:150, 20:250]

cv2.imshow(f"Showing Resized Image {grayImage.shape}", grayImage)
cv2.imshow(f"Cropped Image {croppedImage.shape}", croppedImage)

cv2.imwrite("images/cropped.png", croppedImage)

cv2.waitKey(0)
cv2.destroyAllWindows()