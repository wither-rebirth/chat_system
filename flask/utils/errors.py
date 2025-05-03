from flask import render_template
from werkzeug.exceptions import HTTPException


def register_error_handlers(app):
    """Register all error handlers"""
    
    @app.errorhandler(404)
    def page_not_found(e):
        return render_template(
            'error.html',
            error_code='404',
            error_title='Page Not Found',
            error_description='We couldn\'t find the page you were looking for. It might be due to a wrong URL or the resource has been removed.',
            error_message='The page you attempted to access doesn\'t exist. Please check the URL or return to the homepage.'
        ), 404

    @app.errorhandler(500)
    def internal_server_error(e):
        return render_template(
            'error.html',
            error_code='500',
            error_title='Server Error',
            error_description='There was a problem processing your request. Our team has been notified of this issue.',
            error_message='Internal server error. Please try again later, or contact support if the problem persists.'
        ), 500

    @app.errorhandler(403)
    def forbidden_error(e):
        return render_template(
            'error.html',
            error_code='403',
            error_title='Access Denied',
            error_description='You don\'t have permission to access this resource or perform this action.',
            error_message='You don\'t have permission to access this page or resource. Please verify your account permissions or contact an administrator.'
        ), 403

    # Generic error handler
    @app.errorhandler(Exception)
    def handle_exception(e):
        # If this is an HTTP exception, let the HTTP error handler handle it
        if isinstance(e, HTTPException):
            return e
        
        # Log the error
        app.logger.error(f"Unhandled exception: {str(e)}", exc_info=True)
        
        # Return a 500 error page
        return render_template(
            'error.html',
            error_code='500',
            error_title='Server Error',
            error_description='An unexpected problem occurred while processing your request. Our team has been notified of this issue.',
            error_message='The server encountered an unexpected condition. Please try again later, or contact support for assistance.'
        ), 500 