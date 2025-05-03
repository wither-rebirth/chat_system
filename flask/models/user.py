"""
User model
Defines the User class and its related functions
Ensures complete compatibility with Flask-Login
"""
from flask_login import UserMixin

class User(UserMixin):
    """User class for Flask-Login authentication
    
    Ensures implementation of all properties and methods required by Flask-Login
    """
    
    def __init__(self, id, username, email, password_hash, is_active=True, avatar_url=None, public_key=None, key_updated_at=None):
        self._id = id  # Use _id for internal storage
        self.username = username
        self.email = email
        self.password_hash = password_hash
        self._is_active = bool(is_active)  # Ensure it's a boolean value
        self.avatar_url = avatar_url
        self.public_key = public_key
        self.key_updated_at = key_updated_at
        
    def get_id(self):
        """Must return a unique user identifier (string)"""
        return str(self._id)
        
    @property
    def is_active(self):
        """Must return a boolean value indicating if the user is active"""
        return self._is_active
        
    @property
    def is_authenticated(self):
        """Must return a boolean value indicating if the user is authenticated"""
        return True
        
    @property
    def is_anonymous(self):
        """Must return a boolean value indicating if the user is anonymous"""
        return False
        
    @property
    def id(self):
        """ID property for easy access to user ID"""
        return self._id
    
    @property
    def has_e2ee_key(self):
        """Check if user has an available end-to-end encryption key"""
        return self.public_key is not None
        
    def __repr__(self):
        """String representation"""
        return f'<User {self.username} (id={self._id})>' 