import cv2
import numpy as np
import logging
from typing import List, Tuple, Optional

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def process_image(image: np.ndarray, corners: Optional[np.ndarray] = None) -> np.ndarray:
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
    ], dtype="float32")
    
    # Ensure corners are in the correct format and order
    corners = np.array(corners, dtype="float32")
    if corners.shape != (4, 2):
        logger.error(f"Invalid corners shape: {corners.shape}")
        raise ValueError("Corners must be a 4x2 array")
    
    # Sort corners to ensure correct order
    corners = order_points(corners)
    
    logger.info(f"Sorted corners for transform: {corners.tolist()}")
    logger.info(f"Destination points: {dst_points.tolist()}")
    
    # Calculate perspective transform matrix
    matrix = cv2.getPerspectiveTransform(corners, dst_points)
    logger.info(f"Transform matrix: {matrix.tolist()}")
    
    # Apply perspective transformation
    warped = cv2.warpPerspective(image, matrix, (width, height))
    
    return warped

def order_points(pts: np.ndarray) -> np.ndarray:
    """Order points in clockwise order starting from top-left."""
    rect = np.zeros((4, 2), dtype="float32")
    
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]
    rect[2] = pts[np.argmax(s)]
    
    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]
    rect[3] = pts[np.argmax(diff)]
    
    return rect

def detect_document_corners(image: np.ndarray) -> np.ndarray:
    """Detect document corners in the image."""
    height, width = image.shape[:2]
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    # Apply CLAHE for contrast enhancement
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
    gray = clahe.apply(gray)
    
    # Apply bilateral filter to reduce noise while preserving edges
    blurred = cv2.bilateralFilter(gray, 9, 75, 75)
    
    # Edge detection
    edges = cv2.Canny(blurred, 50, 150)
    
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
        peri = cv2.arcLength(contour, True)
        approx = cv2.approxPolyDP(contour, 0.02 * peri, True)
        
        if len(approx) == 4:
            document_corners = approx.reshape(4, 2).astype("float32")
            # Validate corners
            if validate_corners(document_corners, image.shape[:2]):
                break
    
    # If no document found, return default corners
    if document_corners is None:
        document_corners = np.array([
            [0, 0],
            [width - 1, 0],
            [width - 1, height - 1],
            [0, height - 1]
        ], dtype="float32")
        logger.warning("No document corners detected, using default corners")
    
    return document_corners

def validate_corners(corners: np.ndarray, shape: Tuple[int, int]) -> bool:
    """Validate detected corners."""
    height, width = shape
    
    # Check if points are within image bounds
    if not all(0 <= x < width and 0 <= y < height for x, y in corners):
        return False
    
    # Check minimum area (at least 10% of image)
    area = cv2.contourArea(corners)
    if area < 0.1 * width * height:
        return False
    
    return True

def convert_to_bw(image: np.ndarray) -> np.ndarray:
    """Convert image to black and white with adaptive thresholding."""
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    binary = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
    )
    return binary
