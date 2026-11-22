from flask import Flask, jsonify
from werkzeug.exceptions import HTTPException

from .config import Config
from .extensions import cors, db, jwt
from .validation import ApiError


def create_app(config_object=Config):
    app = Flask(__name__)
    app.config.from_object(config_object)

    db.init_app(app)
    jwt.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}})

    from .routes import auth, catalog, dashboard, requests, sessions

    for module in (auth, catalog, requests, sessions, dashboard):
        app.register_blueprint(module.bp)

    @app.get("/api/health")
    def health():
        return jsonify(status="ok")

    # --- Errores siempre en JSON ---
    @app.errorhandler(ApiError)
    def handle_api_error(err):
        body = {"error": err.message}
        if err.fields:
            body["fields"] = err.fields
        return jsonify(body), err.status

    @app.errorhandler(HTTPException)
    def handle_http(err):
        return jsonify(error=err.description), err.code

    @app.errorhandler(Exception)
    def handle_unexpected(err):
        app.logger.exception(err)
        db.session.rollback()
        return jsonify(error="Error interno del servidor."), 500

    @jwt.unauthorized_loader
    def missing_token(_reason):
        return jsonify(error="Debes iniciar sesión."), 401

    @jwt.invalid_token_loader
    def invalid_token(_reason):
        return jsonify(error="Sesión no válida. Inicia sesión de nuevo."), 401

    @jwt.expired_token_loader
    def expired_token(_header, _payload):
        return jsonify(error="Tu sesión expiró. Inicia sesión de nuevo."), 401

    from .cli import register_cli

    register_cli(app)
    return app
