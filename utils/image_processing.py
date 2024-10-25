import cv2
import numpy as np

def process_image(image, corners=None):
    """Process the image with perspective correction."""
    if corners is None:
        corners = detect_document_corners(image)
    
    # Get target dimensions
    height = 1100
    width = int(height * 0.707)  # A4 aspect ratio
    
    # Define destination points for perspective transform
    dst_points = np.array([
        [0, 0],
        [width - 1, 0],
        [width - 1, height - 1],
        [0, height - 1]
    ], dtype=np.float32)
    
    # Calculate perspective transform matrix
    matrix = cv2.getPerspectiveTransform(corners, dst_points)
    
    # Apply perspective transformation
    warped = cv2.warpPerspective(image, matrix, (width, height))
    
    return warped

def detect_document_corners(image):
    """Automatically detect document corners in the image."""
    # Convert to grayscale
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    # Apply Gaussian blur
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    
    # Edge detection
    edges = cv2.Canny(blurred, 75, 200)
    
    # Find contours
    contours, _ = cv2.findContours(edges, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    
    # Sort contours by area
    contours = sorted(contours, key=cv2.contourArea, reverse=True)[:5]
    
    for contour in contours:
        # Approximate contour
        peri = cv2.arcLength(contour, True)
        approx = cv2.approxPolyDP(contour, 0.02 * peri, True)
        
        # If we found a contour with 4 points, we've found our document
        if len(approx) == 4:
            return np.float32(approx.reshape(4, 2))
    
    # If no document found, return default corners
    height, width = image.shape[:2]
    return np.float32([[0, 0], [width, 0], [width, height], [0, height]])

def convert_to_bw(image):
    """Convert image to black and white with adaptive thresholding."""
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    return cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
    )
