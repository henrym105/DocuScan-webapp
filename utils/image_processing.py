import cv2
import numpy as np
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def process_image(image, corners=None):
    """Process the image with perspective correction."""
    if corners is None:
        corners = detect_document_corners(image)
        logger.info(f"Auto-detected corners: {corners.tolist()}")
    else:
        logger.info(f"Using provided corners: {corners.tolist()}")
    
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
    
    # Ensure corners are in the correct format and order
    corners = np.array(corners, dtype=np.float32)
    if corners.shape != (4, 2):
        logger.error(f"Invalid corners shape: {corners.shape}")
        raise ValueError("Corners must be a 4x2 array")
    
    # Sort corners to ensure correct order: top-left, top-right, bottom-right, bottom-left
    center = np.mean(corners, axis=0)
    angles = np.arctan2(corners[:, 1] - center[1], corners[:, 0] - center[0])
    sorted_indices = np.argsort(angles)
    corners = corners[sorted_indices]
    
    logger.info(f"Sorted corners for transform: {corners.tolist()}")
    logger.info(f"Destination points: {dst_points.tolist()}")
    
    # Calculate perspective transform matrix
    matrix = cv2.getPerspectiveTransform(corners, dst_points)
    logger.info(f"Transform matrix: {matrix.tolist()}")
    
    # Apply perspective transformation
    warped = cv2.warpPerspective(image, matrix, (width, height))
    
    return warped

def detect_document_corners(image):
    """Automatically detect document corners in the image."""
    # Convert to grayscale
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    # Apply Gaussian blur
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    
    # Edge detection with auto Canny
    median = np.median(blurred)
    lower = int(max(0, (1.0 - 0.33) * median))
    upper = int(min(255, (1.0 + 0.33) * median))
    edges = cv2.Canny(blurred, lower, upper)
    
    # Dilate edges to connect gaps
    kernel = np.ones((3,3), np.uint8)
    edges = cv2.dilate(edges, kernel, iterations=1)
    
    # Find contours
    contours, _ = cv2.findContours(edges, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    
    # Sort contours by area
    contours = sorted(contours, key=cv2.contourArea, reverse=True)[:5]
    
    # Find the document contour
    document_corners = None
    for contour in contours:
        # Approximate contour
        peri = cv2.arcLength(contour, True)
        approx = cv2.approxPolyDP(contour, 0.02 * peri, True)
        
        # If we found a contour with 4 points, we've found our document
        if len(approx) == 4:
            document_corners = np.float32(approx.reshape(4, 2))
            break
    
    # If no document found, return default corners
    if document_corners is None:
        height, width = image.shape[:2]
        document_corners = np.float32([[0, 0], [width, 0], [width, height], [0, height]])
        logger.warning("No document corners detected, using default corners")
    
    return document_corners

def convert_to_bw(image):
    """Convert image to black and white with adaptive thresholding."""
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    binary = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
    )
    return binary
