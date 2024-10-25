from flask import Flask, render_template, request, jsonify, send_file
import cv2
import numpy as np
from utils.image_processing import process_image, convert_to_bw
import base64
import io

app = Flask(__name__)
app.secret_key = 'document_scanner_secret_key'

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/process', methods=['POST'])
def process():
    try:
        # Get image data from POST request
        image_data = request.form['image']
        corners = request.form.get('corners')
        mode = request.form.get('mode', 'color')

        # Decode base64 image
        image_data = image_data.split(',')[1]
        image_array = np.frombuffer(base64.b64decode(image_data), np.uint8)
        image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)

        if corners:
            # Convert corners string to points array
            corners = eval(corners)
            corners = np.array(corners, dtype=np.float32)
        else:
            # Auto-detect corners if not provided
            corners = None

        # Process the image
        processed_image = process_image(image, corners)
        
        # Convert to B&W if requested
        if mode == 'bw':
            processed_image = convert_to_bw(processed_image)

        # Encode processed image to base64
        _, buffer = cv2.imencode('.jpg', processed_image)
        processed_image_b64 = base64.b64encode(buffer).decode('utf-8')

        return jsonify({
            'success': True,
            'processed_image': f'data:image/jpeg;base64,{processed_image_b64}'
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

