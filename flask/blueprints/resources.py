from flask import Blueprint, request, jsonify, current_app
from flask_login import login_required, current_user
import json
from utils.db import get_db_connection

# Create blueprint
resources_bp = Blueprint('resources', __name__)

# API: Get resources list
@resources_bp.route('/api/resources', methods=['GET'])
@login_required
def get_resources():
    try:
        conn = get_db_connection()
        user_id = current_user.id
        resources = conn.execute(
            'SELECT * FROM resources WHERE created_by = ? ORDER BY created_at DESC',
            (user_id,)
        ).fetchall()

        resources_list = []
        for resource in resources:
            resource_dict = dict(resource)
            # Parse properties JSON field
            try:
                if resource_dict['custom_properties']:
                    resource_dict['custom_properties'] = json.loads(resource_dict['custom_properties'])
                else:
                    resource_dict['custom_properties'] = {}
            except:
                resource_dict['custom_properties'] = {}
            
            resources_list.append(resource_dict)

        return jsonify({
            'success': True,
            'resources': resources_list
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error retrieving resources: {str(e)}'
        }), 500

# API: Add resource
@resources_bp.route('/api/resources', methods=['POST'])
@login_required
def add_resource():
    try:
        data = request.json
        name = data.get('name')
        url = data.get('url')
        description = data.get('description', '')
        resource_type = data.get('resource_type', 'link')
        properties = data.get('properties', {})

        # Validate required fields
        if not name or not url:
            return jsonify({
                'success': False,
                'message': 'Resource name and URL are required'
            }), 400

        # Validate URL format
        if not url.startswith(('http://', 'https://')):
            url = 'https://' + url

        # Convert properties to JSON string
        properties_json = json.dumps(properties) if properties else None

        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            '''
            INSERT INTO resources (name, url, description, resource_type, custom_properties, created_by)
            VALUES (?, ?, ?, ?, ?, ?)
            ''',
            (name, url, description, resource_type, properties_json, current_user.id)
        )
        resource_id = cursor.lastrowid
        conn.commit()

        # Get newly created resource
        resource = conn.execute(
            'SELECT * FROM resources WHERE resource_id = ?',
            (resource_id,)
        ).fetchone()

        if resource:
            resource_dict = dict(resource)
            # Parse properties JSON field
            try:
                if resource_dict['custom_properties']:
                    resource_dict['custom_properties'] = json.loads(resource_dict['custom_properties'])
                else:
                    resource_dict['custom_properties'] = {}
            except:
                resource_dict['custom_properties'] = {}

            return jsonify({
                'success': True,
                'message': 'Resource added successfully',
                'resource': resource_dict
            })
        else:
            return jsonify({
                'success': False,
                'message': 'Failed to retrieve the created resource'
            }), 500
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error adding resource: {str(e)}'
        }), 500

# API: Update resource
@resources_bp.route('/api/resources/<int:resource_id>', methods=['PUT'])
@login_required
def update_resource(resource_id):
    try:
        data = request.json
        name = data.get('name')
        url = data.get('url')
        description = data.get('description', '')
        resource_type = data.get('resource_type', 'link')
        properties = data.get('properties', {})

        # Validate required fields
        if not name or not url:
            return jsonify({
                'success': False,
                'message': 'Resource name and URL are required'
            }), 400

        # Validate URL format
        if not url.startswith(('http://', 'https://')):
            url = 'https://' + url

        # Check if resource exists and belongs to current user
        conn = get_db_connection()
        resource = conn.execute(
            'SELECT * FROM resources WHERE resource_id = ? AND created_by = ?',
            (resource_id, current_user.id)
        ).fetchone()

        if not resource:
            return jsonify({
                'success': False,
                'message': 'Resource not found or you do not have permission to edit it'
            }), 404

        # Convert properties to JSON string
        properties_json = json.dumps(properties) if properties else None

        # Update resource
        conn.execute(
            '''
            UPDATE resources
            SET name = ?, url = ?, description = ?, resource_type = ?, custom_properties = ?
            WHERE resource_id = ? AND created_by = ?
            ''',
            (name, url, description, resource_type, properties_json, resource_id, current_user.id)
        )
        conn.commit()

        # Get updated resource
        updated_resource = conn.execute(
            'SELECT * FROM resources WHERE resource_id = ?',
            (resource_id,)
        ).fetchone()

        if updated_resource:
            updated_dict = dict(updated_resource)
            # Parse properties JSON field
            try:
                if updated_dict['custom_properties']:
                    updated_dict['custom_properties'] = json.loads(updated_dict['custom_properties'])
                else:
                    updated_dict['custom_properties'] = {}
            except:
                updated_dict['custom_properties'] = {}

            return jsonify({
                'success': True,
                'message': 'Resource updated successfully',
                'resource': updated_dict
            })
        else:
            return jsonify({
                'success': False,
                'message': 'Failed to retrieve the updated resource'
            }), 500
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error updating resource: {str(e)}'
        }), 500

# API: Delete resource
@resources_bp.route('/api/resources/<int:resource_id>', methods=['DELETE'])
@login_required
def delete_resource(resource_id):
    try:
        # Check if resource exists and belongs to current user
        conn = get_db_connection()
        resource = conn.execute(
            'SELECT * FROM resources WHERE resource_id = ? AND created_by = ?',
            (resource_id, current_user.id)
        ).fetchone()

        if not resource:
            return jsonify({
                'success': False,
                'message': 'Resource not found or you do not have permission to delete it'
            }), 404

        # Delete resource
        conn.execute(
            'DELETE FROM resources WHERE resource_id = ? AND created_by = ?',
            (resource_id, current_user.id)
        )
        conn.commit()

        return jsonify({
            'success': True,
            'message': 'Resource deleted successfully'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error deleting resource: {str(e)}'
        }), 500

# API: Get single resource
@resources_bp.route('/api/resources/<int:resource_id>', methods=['GET'])
@login_required
def get_resource(resource_id):
    # Get resource by ID
    try:
        conn = get_db_connection()
        resource = conn.execute(
            'SELECT * FROM resources WHERE resource_id = ? AND created_by = ?',
            (resource_id, current_user.id)
        ).fetchone()

        if not resource:
            return jsonify({
                'success': False,
                'message': 'Resource not found or you do not have permission to view it'
            }), 404

        resource_dict = dict(resource)
        # Parse properties JSON field
        try:
            if resource_dict['custom_properties']:
                resource_dict['custom_properties'] = json.loads(resource_dict['custom_properties'])
            else:
                resource_dict['custom_properties'] = {}
        except:
            resource_dict['custom_properties'] = {}

        return jsonify({
            'success': True,
            'resource': resource_dict
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error retrieving resource: {str(e)}'
        }), 500 