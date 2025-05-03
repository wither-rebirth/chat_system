from flask import Blueprint, request, jsonify, current_app, send_from_directory, url_for, g
from flask_login import login_required, current_user
import os
import uuid
from werkzeug.utils import secure_filename

# Create blueprint
uploads_bp = Blueprint('uploads', __name__)

# Allowed file extensions for upload
ALLOWED_EXTENSIONS = {'txt', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'mp3', 'mp4', 'zip', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'}

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# API: Upload file
@uploads_bp.route('/api/upload', methods=['POST'])
@login_required
def upload_file():
    """Handle file uploads"""
    # Check if the post request has the file part
    if 'file' not in request.files:
        return jsonify({
            'success': False,
            'message': 'No file part in the request'
        }), 400
    
    file = request.files['file']
    
    # If user does not select file, browser also submit an empty part without filename
    if file.filename == '':
        return jsonify({
            'success': False,
            'message': 'No file selected'
        }), 400
    
    # Securely handle filename
    original_filename = file.filename
    secure_name = secure_filename(original_filename)
    
    # Ensure filename is unique
    timestamp = uuid.uuid4().hex
    filename = f"{secure_name.rsplit('.', 1)[0]}_{timestamp}.{secure_name.rsplit('.', 1)[1]}" if '.' in secure_name else f"{secure_name}_{timestamp}"
    
    # Ensure upload directory exists
    upload_folder = current_app.config['UPLOAD_FOLDER']
    os.makedirs(upload_folder, exist_ok=True)
    
    # Save file
    file_path = os.path.join(upload_folder, filename)
    file.save(file_path)
    
    # Generate file URL using new uploads route
    file_url = url_for('uploads.uploaded_file', filename=filename)
    
    # Extract original filename without extension as default description
    description = original_filename.rsplit('.', 1)[0] if '.' in original_filename else original_filename
    
    # Return success response with file info
    return jsonify({
        'success': True,
        'message': 'File uploaded successfully',
        'file': {
            'name': original_filename,
            'path': file_path,
            'url': file_url,
            'description': description,
            'size': os.path.getsize(file_path),
            'timestamp': timestamp
        }
    })

@uploads_bp.route('/uploads/<path:filename>')
def uploaded_file(filename):
    """
    Serve uploaded files
    
    Parameters:
    -----------
    filename: str
        Name of the file to serve
        
    Returns:
    --------
    file: bytes
        The requested file
    """
    try:
        # Get absolute path for the file
        upload_folder = current_app.config['UPLOAD_FOLDER']
        file_path = os.path.join(upload_folder, filename)
        
        # Check if file exists and is within the uploads directory
        abs_path = os.path.abspath(file_path)
        uploads_abs_path = os.path.abspath(upload_folder)
        
        if not abs_path.startswith(uploads_abs_path) or not os.path.isfile(abs_path):
            return "File not found", 404
        
        return send_from_directory(upload_folder, filename)
    except Exception as e:
        current_app.logger.error(f"Error accessing uploaded file: {str(e)}", exc_info=True)
        return "File does not exist or is not accessible", 404 