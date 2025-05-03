"""
Room model
Defines the Room class and its related functions
"""

class Room:
    """Room class for managing chat rooms
    
    Contains basic room information and related operations
    """
    
    def __init__(self, room_id, room_name, description, created_by, 
                 is_private=False, created_at=None, updated_at=None):
        self.room_id = room_id
        self.room_name = room_name
        self.description = description
        self.created_by = created_by  # Creator's user ID
        self.is_private = bool(is_private)  # Ensure it's a boolean value
        self.created_at = created_at
        self.updated_at = updated_at
        
    @property
    def id(self):
        """ID property for easy access to room ID"""
        return self.room_id
        
    @property
    def is_public(self):
        """Whether the room is public"""
        return not self.is_private
    
    def update_description(self, new_description):
        """Update room description"""
        self.description = new_description
        # Note: This only updates the object, database update needs to be handled by the caller
        
    def __repr__(self):
        """String representation"""
        return f'<Room {self.room_name} (id={self.room_id})>' 