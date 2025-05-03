"""
Channel model
Defines the Channel class and its related functions
"""

class Channel:
    """Channel class for managing room channels
    
    Contains basic channel information and related operations
    """
    
    def __init__(self, channel_id, channel_name, room_id, created_by, 
                 description=None, created_at=None, updated_at=None):
        self.channel_id = channel_id
        self.channel_name = channel_name
        self.room_id = room_id
        self.created_by = created_by
        self.description = description
        self.created_at = created_at
        self.updated_at = updated_at
        
    @property
    def id(self):
        """ID property for easy access to channel ID"""
        return self.channel_id
    
    def update_name(self, new_name):
        """Update channel name"""
        self.channel_name = new_name
        # Note: This only updates the object, database update needs to be handled by the caller
    
    def update_description(self, new_description):
        """Update channel description"""
        self.description = new_description
        # Note: This only updates the object, database update needs to be handled by the caller
        
    def __repr__(self):
        """String representation"""
        return f'<Channel {self.channel_name} (id={self.channel_id}, room_id={self.room_id})>' 