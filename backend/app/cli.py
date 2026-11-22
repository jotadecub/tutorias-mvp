import click
from flask import Flask

from .extensions import db
from .models import User
from .seed import seed_database


def register_cli(app: Flask):
    @app.cli.command("init-db")
    def init_db():
        """Crea las tablas si no existen."""
        db.create_all()
        click.echo("Tablas creadas.")

    @app.cli.command("seed")
    def seed():
        """Carga los datos de demostración (solo si la base está vacía)."""
        db.create_all()
        if db.session.execute(db.select(User.id).limit(1)).first():
            click.echo("La base ya tiene datos. Usa 'reset-db' para reiniciarla.")
            return
        seed_database()
        click.echo("Datos de demostración cargados.")

    @app.cli.command("reset-db")
    def reset_db():
        """Borra todo, recrea las tablas y carga los datos de demostración."""
        db.drop_all()
        db.create_all()
        seed_database()
        click.echo("Base de datos reiniciada con datos de demostración.")
