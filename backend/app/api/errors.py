from flask import Blueprint, jsonify

errors_bp = Blueprint("errors", __name__)

@errors_bp.app_errorhandler(404)
def not_found(error):
    return jsonify({'status': 'error', 'message': 'Not found'}), 404

@errors_bp.app_errorhandler(500)
def server_error(error):
    return jsonify({'status': 'error', 'message': 'Server error'}), 500
