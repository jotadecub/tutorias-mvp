import click
from flask import Flask

from .extensions import db
from .models import User
from .seed import seed_database, seed_secretary_account


def register_cli(app: Flask):
    @app.cli.command("init-db")
    def init_db():
        """Crea las tablas si no existen."""
        db.create_all()
        click.echo("Tablas creadas.")

    @app.cli.command("seed")
    def seed():
        """Carga datos demo en una base vacía o agrega la cuenta nueva de secretaría."""
        db.create_all()
        if db.session.execute(db.select(User.id).limit(1)).first():
            if seed_secretary_account():
                click.echo("Cuenta demo de secretaría agregada.")
            else:
                click.echo("La base ya tiene datos y la cuenta de secretaría ya existe.")
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
