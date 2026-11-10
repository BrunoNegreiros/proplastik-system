import os
from datetime import datetime, timezone
from typing import Optional
from dotenv import load_dotenv
from passlib.context import CryptContext
from sqlmodel import Field, Session, SQLModel, create_engine, select

load_dotenv()

# Contexto de criptografia de senha
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# -------------------------------------------------------------
# MODELOS DO BANCO DE DADOS (TABELAS)
# -------------------------------------------------------------
class AdminUser(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    password_hash: str


class Category(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(unique=True, index=True)


class Item(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    photo_url: str
    price: float
    discount_price: Optional[float] = Field(default=None, nullable=True)
    remaining_units: int = Field(default=0)
    category_id: int = Field(foreign_key="category.id")


class Reservation(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    pickup_code: str = Field(unique=True, index=True)
    customer_name: str
    customer_phone: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: str = Field(default="AGUARDANDO_RETIRADA")


class ReservationItem(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    reservation_id: int = Field(foreign_key="reservation.id")
    item_id: int = Field(foreign_key="item.id")
    item_name: str
    unit_price: float
    quantity: int


# -------------------------------------------------------------
# CONFIGURAÇÃO DE CONEXÃO (SQLITE LOCAL OU POSTGRESQL NUVEM)
# -------------------------------------------------------------
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./proplastik.db")

# Corrige prefixo e força o uso do psycopg2 para evitar conflitos no Serverless
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg2://", 1)
elif DATABASE_URL.startswith("postgresql://") and not DATABASE_URL.startswith("postgresql+psycopg2://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, echo=False, connect_args=connect_args)

def get_session():
    with Session(engine) as session:
        yield session


def init_db():
    SQLModel.metadata.create_all(engine)

    admin_email = os.getenv("ADMIN_EMAIL", "admin@proplastik.com.br")
    admin_password = os.getenv("ADMIN_PASSWORD", "proplastik123")

    with Session(engine) as session:
        existing_admin = session.exec(
            select(AdminUser).where(AdminUser.email == admin_email)
        ).first()

        if not existing_admin:
            hashed_pwd = pwd_context.hash(admin_password)
            admin = AdminUser(email=admin_email, password_hash=hashed_pwd)
            session.add(admin)
            session.commit()
            print(f"[SEED] Conta restrita de Admin criada: {admin_email}")
        else:
            print(f"[SEED] Conta de Admin já existente: {admin_email}")