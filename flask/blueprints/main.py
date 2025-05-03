"""
Homepage and basic routes module
Handles the main entry pages of the website
"""
from flask import Blueprint, render_template, redirect, url_for, request
from flask_login import current_user

# Create blueprint
main_bp = Blueprint('main', __name__)

# Route: Homepage
@main_bp.route('/', methods=['GET'])
def index():
    # If user is logged in, redirect to chat page
    if current_user.is_authenticated:
        return redirect(url_for('chat.index'))
        
    # If redirected from logout page, clear flash messages
    if 'logged_out' in request.args:
        # Remove URL parameters with redirect
        return redirect(url_for('main.index'))
    
    # Homepage accessible without login
    return render_template('index.html') 