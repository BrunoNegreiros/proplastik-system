import os
import random
import string
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
import jwt
from pydantic import BaseModel
from sqlmodel import Session, select

import traceback

from database import (
    AdminUser,
    Category,
    Item,
    Reservation,
    ReservationItem,
    get_session,
    init_db,
    pwd_context,
)

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "proplastik_sao_vicente_chave_super_secreta_2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 12  # 12 horas

app = FastAPI(title="Proplastik São Vicente - API")

# Liberação de CORS para comunicação com o frontend React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/admin/login")


@app.on_event("startup")
def on_startup():
    init_db()


# -------------------------------------------------------------
# UTILITÁRIOS DE SEGURANÇA E CÓDIGO
# -------------------------------------------------------------
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_admin(
    token: str = Depends(oauth2_scheme), session: Session = Depends(get_session)
) -> AdminUser:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciais inválidas ou token expirado.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception

    admin = session.exec(select(AdminUser).where(AdminUser.email == email)).first()
    if admin is None:
        raise credentials_exception
    return admin


def generate_pickup_code() -> str:
    digits = "".join(random.choices(string.digits, k=4))
    letters = "".join(random.choices(string.ascii_uppercase, k=2))
    return f"PRP-{letters}{digits}"


# -------------------------------------------------------------
# ROTA DE LOGIN DO ADMIN
# -------------------------------------------------------------
@app.post("/api/admin/login")
def login_admin(
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: Session = Depends(get_session),
):
    admin = session.exec(
        select(AdminUser).where(AdminUser.email == form_data.username)
    ).first()

    if not admin or not pwd_context.verify(form_data.password, admin.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="E-mail ou senha incorretos.",
        )

    token = create_access_token(data={"sub": admin.email})
    return {"access_token": token, "token_type": "bearer"}


# -------------------------------------------------------------
# CRUD DE CATEGORIAS (ADMIN ONLY)
# -------------------------------------------------------------
class CategoryCreate(BaseModel):
    name: str


@app.post("/api/admin/categories", response_model=Category)
def create_category(
    category_data: CategoryCreate,
    current_admin: AdminUser = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    existing = session.exec(
        select(Category).where(Category.name == category_data.name)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Esta categoria já existe.")

    new_cat = Category(name=category_data.name)
    session.add(new_cat)
    session.commit()
    session.refresh(new_cat)
    return new_cat


@app.get("/api/admin/categories", response_model=List[Category])
def list_categories_admin(
    current_admin: AdminUser = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    return session.exec(select(Category)).all()


@app.put("/api/admin/categories/{category_id}", response_model=Category)
def update_category(
    category_id: int,
    category_data: CategoryCreate,
    current_admin: AdminUser = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    cat = session.get(Category, category_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Categoria não encontrada.")
    cat.name = category_data.name
    session.add(cat)
    session.commit()
    session.refresh(cat)
    return cat


@app.delete("/api/admin/categories/{category_id}")
def delete_category(
    category_id: int,
    current_admin: AdminUser = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    cat = session.get(Category, category_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Categoria não encontrada.")
    session.delete(cat)
    session.commit()
    return {"message": "Categoria excluída com sucesso."}


# -------------------------------------------------------------
# CRUD DE ITENS / PRODUTOS (ADMIN ONLY)
# -------------------------------------------------------------
class ItemCreate(BaseModel):
    name: str
    photo_url: str
    price: float
    discount_price: Optional[float] = None
    remaining_units: int
    category_id: int


@app.post("/api/admin/items", response_model=Item)
def create_item(
    item_data: ItemCreate,
    current_admin: AdminUser = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    cat = session.get(Category, item_data.category_id)
    if not cat:
        raise HTTPException(status_code=400, detail="Categoria informada não existe.")

    new_item = Item(**item_data.dict())
    session.add(new_item)
    session.commit()
    session.refresh(new_item)
    return new_item


@app.get("/api/admin/items", response_model=List[Item])
def list_all_items_admin(
    current_admin: AdminUser = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    return session.exec(select(Item)).all()


@app.put("/api/admin/items/{item_id}", response_model=Item)
def update_item(
    item_id: int,
    item_data: ItemCreate,
    current_admin: AdminUser = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    item = session.get(Item, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item não encontrado.")

    for field, value in item_data.dict().items():
        setattr(item, field, value)

    session.add(item)
    session.commit()
    session.refresh(item)
    return item


@app.delete("/api/admin/items/{item_id}")
def delete_item(
    item_id: int,
    current_admin: AdminUser = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    item = session.get(Item, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item não encontrado.")
    session.delete(item)
    session.commit()
    return {"message": "Item excluído com sucesso."}


# -------------------------------------------------------------
# PAINEL DE RESERVAS DA LOJA (ADMIN ONLY)
# -------------------------------------------------------------
class ReservationItemDetail(BaseModel):
    item_id: int
    item_name: str
    unit_price: float
    quantity: int


class ReservationDetail(BaseModel):
    id: int
    pickup_code: str
    customer_name: str
    customer_phone: str
    created_at: datetime
    status: str
    items: List[ReservationItemDetail]


@app.get("/api/admin/reservations", response_model=List[ReservationDetail])
def list_reservations_admin(
    current_admin: AdminUser = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    reservations = session.exec(
        select(Reservation).order_by(Reservation.created_at.desc())
    ).all()

    result = []
    for res in reservations:
        items = session.exec(
            select(ReservationItem).where(ReservationItem.reservation_id == res.id)
        ).all()
        result.append(
            ReservationDetail(
                id=res.id,
                pickup_code=res.pickup_code,
                customer_name=res.customer_name,
                customer_phone=res.customer_phone,
                created_at=res.created_at,
                status=res.status,
                items=[
                    ReservationItemDetail(
                        item_id=it.item_id,
                        item_name=it.item_name,
                        unit_price=it.unit_price,
                        quantity=it.quantity,
                    )
                    for it in items
                ],
            )
        )
    return result


@app.patch("/api/admin/reservations/{reservation_id}/status")
def update_reservation_status(
    reservation_id: int,
    status_str: str,
    current_admin: AdminUser = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    res = session.get(Reservation, reservation_id)
    if not res:
        raise HTTPException(status_code=404, detail="Reserva não encontrada.")
    res.status = status_str
    session.add(res)
    session.commit()
    return {"message": f"Status da reserva atualizado para {status_str}."}


# -------------------------------------------------------------
# ROTAS PÚBLICAS (CLIENTE / VISÃO DA LOJA)
# -------------------------------------------------------------
@app.get("/api/public/categories", response_model=List[Category])
def get_public_categories(session: Session = Depends(get_session)):
    return session.exec(select(Category)).all()


@app.get("/api/public/items", response_model=List[Item])
def get_public_catalog(
    category_id: Optional[int] = None, session: Session = Depends(get_session)
):
    # Clientes só enxergam itens com estoque maior que zero
    query = select(Item).where(Item.remaining_units > 0)
    if category_id:
        query = query.where(Item.category_id == category_id)
    return session.exec(query).all()


@app.get("/api/public/items/{item_id}", response_model=Item)
def get_public_item_detail(item_id: int, session: Session = Depends(get_session)):
    item = session.get(Item, item_id)
    if not item or item.remaining_units <= 0:
        raise HTTPException(
            status_code=404, detail="Item não disponível ou esgotado."
        )
    return item


@app.get("/api/public/items/{item_id}/check-stock")
def check_item_stock(
    item_id: int, desired_quantity: int, session: Session = Depends(get_session)
):
    item = session.get(Item, item_id)
    if not item or item.remaining_units <= 0:
        return {"available": False, "remaining_units": 0, "can_fulfill": False}

    can_fulfill = desired_quantity <= item.remaining_units
    return {
        "available": True,
        "remaining_units": item.remaining_units,
        "can_fulfill": can_fulfill,
    }


# -------------------------------------------------------------
# MOTOR DE RESERVA COM DUPLA VALIDAÇÃO E TRATAMENTO DE ESTOQUE
# -------------------------------------------------------------
class CartItemInput(BaseModel):
    item_id: int
    quantity: int


class ReservationCreateInput(BaseModel):
    customer_name: str
    customer_phone: str
    items: List[CartItemInput]


class ReservationItemResult(BaseModel):
    item_id: int
    item_name: str
    requested_quantity: int
    reserved_quantity: int
    unit_price: float
    note: str


class ReservationResult(BaseModel):
    pickup_code: str
    status: str
    total_amount: float
    items: List[ReservationItemResult]
    customer_name: str
    customer_phone: str


import traceback

@app.post("/api/public/reservations", response_model=ReservationResult)
def create_reservation(
    payload: ReservationCreateInput,
    session: Session = Depends(get_session)
):
    if not payload.items:
        raise HTTPException(status_code=400, detail="O carrinho está vazio.")

    try:
        # 1. Gera código único
        pickup_code = generate_pickup_code()
        while session.exec(select(Reservation).where(Reservation.pickup_code == pickup_code)).first():
            pickup_code = generate_pickup_code()

        # 2. Cria a reserva
        new_reservation = Reservation(
            pickup_code=pickup_code,
            customer_name=payload.customer_name,
            customer_phone=payload.customer_phone,
            status="AGUARDANDO_RETIRADA",
            created_at=datetime.now(timezone.utc)
        )
        session.add(new_reservation)
        session.commit()
        session.refresh(new_reservation)

        reserved_items_summary: List[ReservationItemResult] = []
        total_amount = 0.0
        had_adjustments = False
        items_to_create = []

        # 3. Validação item a item
        for cart_item in payload.items:
            item = session.get(Item, cart_item.item_id)

            if not item or item.remaining_units <= 0:
                had_adjustments = True
                reserved_items_summary.append(
                    ReservationItemResult(
                        item_id=cart_item.item_id,
                        item_name=item.name if item else "Item Indisponível",
                        requested_quantity=cart_item.quantity,
                        reserved_quantity=0,
                        unit_price=0.0,
                        note="ESGOTADO"
                    )
                )
                continue

            effective_price = float(item.discount_price if item.discount_price is not None else item.price)

            if cart_item.quantity <= item.remaining_units:
                qty_to_reserve = cart_item.quantity
                note = "OK"
            else:
                qty_to_reserve = item.remaining_units
                note = "QUANTIDADE_REDUZIDA"
                had_adjustments = True

            # Decrementa o estoque
            item.remaining_units -= qty_to_reserve
            session.add(item)

            # Prepara o registro do item reservado
            res_item = ReservationItem(
                reservation_id=new_reservation.id,
                item_id=item.id,
                item_name=item.name,
                unit_price=effective_price,
                quantity=qty_to_reserve
            )
            items_to_create.append(res_item)

            total_amount += effective_price * qty_to_reserve

            reserved_items_summary.append(
                ReservationItemResult(
                    item_id=item.id,
                    item_name=item.name,
                    requested_quantity=cart_item.quantity,
                    reserved_quantity=qty_to_reserve,
                    unit_price=effective_price,
                    note=note
                )
            )

        # Se nenhum item pôde ser reservado, remove o cabeçalho vazio
        if not items_to_create:
            session.delete(new_reservation)
            session.commit()
            raise HTTPException(
                status_code=400,
                detail="Não foi possível concluir a reserva: todos os itens solicitados estão esgotados."
            )

        for ri in items_to_create:
            session.add(ri)

        session.commit()

        return ReservationResult(
            pickup_code=new_reservation.pickup_code,
            status="AJUSTADO_POR_ESTOQUE" if had_adjustments else "SUCESSO",
            total_amount=round(total_amount, 2),
            items=reserved_items_summary,
            customer_name=new_reservation.customer_name,
            customer_phone=new_reservation.customer_phone
        )

    except HTTPException:
        raise
    except Exception as exc:
        session.rollback()
        print("\n--- ERRO DETALHADO NO MOTOR DE RESERVA ---")
        traceback.print_exc()
        print("-------------------------------------------\n")
        raise HTTPException(
            status_code=500,
            detail=f"Erro interno ao processar reserva: {str(exc)}"
        )