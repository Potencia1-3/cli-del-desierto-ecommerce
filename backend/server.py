from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import hashlib
import jwt
import secrets

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', secrets.token_hex(32))
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

app = FastAPI(title="Pump Fit CRM")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# ==================== MODELS ====================

class UserBase(BaseModel):
    email: str
    name: str
    phone: Optional[str] = None
    role: str = "client"  # admin, staff, client

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class User(UserBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ClientMedicalHistory(BaseModel):
    conditions: List[str] = []
    injuries: List[str] = []
    medications: List[str] = []
    notes: str = ""
    last_updated: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BodyMeasurement(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    weight: Optional[float] = None
    height: Optional[float] = None
    chest: Optional[float] = None
    waist: Optional[float] = None
    hips: Optional[float] = None
    arm: Optional[float] = None
    thigh: Optional[float] = None
    notes: str = ""

class ClientCreate(BaseModel):
    email: str
    name: str
    phone: str
    birth_date: Optional[str] = None
    emergency_contact: Optional[str] = None
    emergency_phone: Optional[str] = None

class ClientUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    birth_date: Optional[str] = None
    emergency_contact: Optional[str] = None
    emergency_phone: Optional[str] = None

class Referral(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    phone: str
    email: Optional[str] = None
    notes: str = ""
    status: str = "pending"  # pending, contacted, converted
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Client(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: Optional[str] = None
    email: str
    name: str
    phone: str
    birth_date: Optional[str] = None
    emergency_contact: Optional[str] = None
    emergency_phone: Optional[str] = None
    medical_history: ClientMedicalHistory = Field(default_factory=ClientMedicalHistory)
    measurements: List[BodyMeasurement] = []
    referrals: List[Referral] = []
    has_nutrition_plan: bool = False
    inscription_paid: bool = False
    profile_active: bool = False  # Admin must activate after payment
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_active: bool = True

# Package Types with real prices
PACKAGE_TYPES = {
    "8": {
        "sessions": 8, 
        "max_reschedules": 2, 
        "duration": "1 mes",
        "normal_price": 4000, 
        "promo_price": 2700, 
        "name": "Paquete 8 Sesiones"
    },
    "24": {
        "sessions": 24, 
        "max_reschedules": 6, 
        "duration": "3 meses",
        "normal_price": 11000, 
        "promo_price": 5700, 
        "name": "Paquete 24 Sesiones"
    },
    "50": {
        "sessions": 50, 
        "max_reschedules": 12, 
        "duration": "6 meses",
        "normal_price": 18000, 
        "promo_price": 10100, 
        "name": "Paquete 50 Sesiones"
    },
    "annual": {
        "sessions": 104, 
        "max_reschedules": 24, 
        "duration": "12 meses",
        "normal_price": 31500, 
        "promo_price": 18000, 
        "name": "Paquete Anual"
    },
}

# Fixed prices
INSCRIPTION_PRICE = 599
NUTRITION_PLAN_PRICE = 500
NUM_SUITS = 2  # Only 2 suits available
SLOT_INTERVAL_MINUTES = 30  # 30 minute intervals for scheduling

class PackageCreate(BaseModel):
    client_id: str
    package_type: str  # "8", "24", "50", "annual"
    use_promo_price: bool = True
    notes: str = ""

class Package(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_id: str
    package_type: str
    total_sessions: int
    remaining_sessions: int
    max_reschedules: int
    used_reschedules: int = 0
    price: float
    status: str = "active"  # active, completed, expired
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    notes: str = ""

class SessionCreate(BaseModel):
    client_id: str
    package_id: str
    date: str  # YYYY-MM-DD
    time: str  # HH:MM
    suit_number: int  # 1-2 (only 2 suits)

class SessionUpdate(BaseModel):
    date: Optional[str] = None
    time: Optional[str] = None
    suit_number: Optional[int] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class Session(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_id: str
    package_id: str
    date: str
    time: str
    suit_number: int
    status: str = "scheduled"  # scheduled, completed, cancelled, rescheduled
    is_reschedule: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    notes: str = ""

class SaleCreate(BaseModel):
    client_id: str
    package_id: Optional[str] = None
    description: str
    amount: float
    payment_method: str = "cash"  # cash, card, transfer

class Sale(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_id: str
    package_id: Optional[str] = None
    description: str
    amount: float
    payment_method: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: Optional[str] = None

# ==================== HELPERS ====================

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def create_token(user_id: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    payload = decode_token(credentials.credentials)
    user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")
    return user

async def require_admin(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "staff"]:
        raise HTTPException(status_code=403, detail="Acceso denegado")
    return current_user

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email ya registrado")
    
    user = User(
        email=user_data.email,
        name=user_data.name,
        phone=user_data.phone,
        role=user_data.role
    )
    user_dict = user.model_dump()
    user_dict["password_hash"] = hash_password(user_data.password)
    user_dict["created_at"] = user_dict["created_at"].isoformat()
    
    await db.users.insert_one(user_dict)
    token = create_token(user.id, user.role)
    
    return {"token": token, "user": {"id": user.id, "email": user.email, "name": user.name, "role": user.role}}

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or user.get("password_hash") != hash_password(credentials.password):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    
    token = create_token(user["id"], user["role"])
    return {"token": token, "user": {"id": user["id"], "email": user["email"], "name": user["name"], "role": user["role"]}}

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return {"id": current_user["id"], "email": current_user["email"], "name": current_user["name"], "role": current_user["role"]}

# ==================== CLIENT ROUTES ====================

@api_router.post("/clients", response_model=dict)
async def create_client(client_data: ClientCreate, current_user: dict = Depends(require_admin)):
    existing = await db.clients.find_one({"email": client_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Cliente ya existe con este email")
    
    client = Client(**client_data.model_dump())
    client_dict = client.model_dump()
    client_dict["created_at"] = client_dict["created_at"].isoformat()
    client_dict["medical_history"]["last_updated"] = client_dict["medical_history"]["last_updated"].isoformat()
    
    await db.clients.insert_one(client_dict)
    return {"message": "Cliente creado", "client": {"id": client.id, "name": client.name, "email": client.email}}

@api_router.get("/clients")
async def get_clients(search: Optional[str] = None, current_user: dict = Depends(require_admin)):
    query = {}
    if search:
        query = {"$or": [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}}
        ]}
    
    clients = await db.clients.find(query, {"_id": 0}).to_list(1000)
    return clients

@api_router.get("/clients/{client_id}")
async def get_client(client_id: str, current_user: dict = Depends(get_current_user)):
    client = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    # Get packages
    packages = await db.packages.find({"client_id": client_id}, {"_id": 0}).to_list(100)
    # Get sessions
    sessions = await db.sessions.find({"client_id": client_id}, {"_id": 0}).to_list(1000)
    # Get sales
    sales = await db.sales.find({"client_id": client_id}, {"_id": 0}).to_list(100)
    
    return {**client, "packages": packages, "sessions": sessions, "sales": sales}

@api_router.put("/clients/{client_id}")
async def update_client(client_id: str, client_data: ClientUpdate, current_user: dict = Depends(require_admin)):
    update_data = {k: v for k, v in client_data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No hay datos para actualizar")
    
    result = await db.clients.update_one({"id": client_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    return {"message": "Cliente actualizado"}

@api_router.put("/clients/{client_id}/medical")
async def update_medical_history(client_id: str, medical: ClientMedicalHistory, current_user: dict = Depends(require_admin)):
    medical_dict = medical.model_dump()
    medical_dict["last_updated"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.clients.update_one({"id": client_id}, {"$set": {"medical_history": medical_dict}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    return {"message": "Historial médico actualizado"}

@api_router.post("/clients/{client_id}/measurements")
async def add_measurement(client_id: str, measurement: BodyMeasurement, current_user: dict = Depends(require_admin)):
    measurement_dict = measurement.model_dump()
    measurement_dict["date"] = measurement_dict["date"].isoformat()
    
    result = await db.clients.update_one(
        {"id": client_id},
        {"$push": {"measurements": measurement_dict}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    return {"message": "Medida agregada", "id": measurement.id}

# ==================== PACKAGE ROUTES ====================

@api_router.get("/packages/types")
async def get_package_types():
    """Get all available package types with prices"""
    return {
        "packages": PACKAGE_TYPES,
        "inscription_price": INSCRIPTION_PRICE,
        "nutrition_plan_price": NUTRITION_PLAN_PRICE
    }

@api_router.post("/packages")
async def create_package(package_data: PackageCreate, current_user: dict = Depends(require_admin)):
    if package_data.package_type not in PACKAGE_TYPES:
        raise HTTPException(status_code=400, detail="Tipo de paquete inválido")
    
    pkg_info = PACKAGE_TYPES[package_data.package_type]
    price = pkg_info["promo_price"] if package_data.use_promo_price else pkg_info["normal_price"]
    
    package = Package(
        client_id=package_data.client_id,
        package_type=package_data.package_type,
        total_sessions=pkg_info["sessions"],
        remaining_sessions=pkg_info["sessions"],
        max_reschedules=pkg_info["max_reschedules"],
        price=price,
        notes=package_data.notes
    )
    
    package_dict = package.model_dump()
    package_dict["created_at"] = package_dict["created_at"].isoformat()
    package_dict["use_promo_price"] = package_data.use_promo_price
    
    await db.packages.insert_one(package_dict)
    
    # Create sale record
    sale = Sale(
        client_id=package_data.client_id,
        package_id=package.id,
        description=f"Venta: {pkg_info['name']} ({'Promoción' if package_data.use_promo_price else 'Precio Normal'})",
        amount=price,
        payment_method="cash",
        created_by=current_user["id"]
    )
    sale_dict = sale.model_dump()
    sale_dict["created_at"] = sale_dict["created_at"].isoformat()
    await db.sales.insert_one(sale_dict)
    
    # Activate client profile if not active
    await db.clients.update_one(
        {"id": package_data.client_id},
        {"$set": {"profile_active": True}}
    )
    
    return {"message": "Paquete creado y perfil activado", "package_id": package.id, "price": price}

@api_router.get("/packages")
async def get_packages(client_id: Optional[str] = None, status: Optional[str] = None, current_user: dict = Depends(require_admin)):
    query = {}
    if client_id:
        query["client_id"] = client_id
    if status:
        query["status"] = status
    
    packages = await db.packages.find(query, {"_id": 0}).to_list(1000)
    return packages

@api_router.get("/packages/{package_id}")
async def get_package(package_id: str, current_user: dict = Depends(get_current_user)):
    package = await db.packages.find_one({"id": package_id}, {"_id": 0})
    if not package:
        raise HTTPException(status_code=404, detail="Paquete no encontrado")
    return package

# ==================== SESSION ROUTES ====================

def get_time_slots():
    """Generate 30-minute slots from 9:00 to 19:00"""
    slots = []
    start_hour = 9
    end_hour = 19
    current = datetime(2000, 1, 1, start_hour, 0)
    end = datetime(2000, 1, 1, end_hour, 0)
    
    while current < end:
        slots.append(current.strftime("%H:%M"))
        current += timedelta(minutes=SLOT_INTERVAL_MINUTES)
    
    return slots

TIME_SLOTS = get_time_slots()

@api_router.get("/sessions/time-slots")
async def get_available_time_slots():
    return TIME_SLOTS

@api_router.post("/sessions")
async def create_session(session_data: SessionCreate, current_user: dict = Depends(get_current_user)):
    # Validate time slot
    if session_data.time not in TIME_SLOTS:
        raise HTTPException(status_code=400, detail="Horario inválido")
    
    # Validate suit number (only 2 suits)
    if session_data.suit_number < 1 or session_data.suit_number > NUM_SUITS:
        raise HTTPException(status_code=400, detail=f"Número de traje inválido (1-{NUM_SUITS})")
    
    # Check if client profile is active
    client = await db.clients.find_one({"id": session_data.client_id}, {"_id": 0})
    if client and not client.get("profile_active", False):
        raise HTTPException(status_code=400, detail="Tu perfil no está activo. Contacta al administrador para activarlo después del pago.")
    
    # Check if slot is available
    existing = await db.sessions.find_one({
        "date": session_data.date,
        "time": session_data.time,
        "suit_number": session_data.suit_number,
        "status": {"$in": ["scheduled", "rescheduled"]}
    })
    if existing:
        raise HTTPException(status_code=400, detail="Este horario y traje ya están ocupados")
    
    # Check package
    package = await db.packages.find_one({"id": session_data.package_id}, {"_id": 0})
    if not package:
        raise HTTPException(status_code=404, detail="Paquete no encontrado")
    if package["remaining_sessions"] <= 0:
        raise HTTPException(status_code=400, detail="No quedan sesiones en el paquete")
    
    # Check sessions per week limit (max 2)
    session_date = datetime.strptime(session_data.date, "%Y-%m-%d")
    week_start = session_date - timedelta(days=session_date.weekday())
    week_end = week_start + timedelta(days=7)
    
    week_sessions = await db.sessions.count_documents({
        "client_id": session_data.client_id,
        "package_id": session_data.package_id,
        "date": {"$gte": week_start.strftime("%Y-%m-%d"), "$lt": week_end.strftime("%Y-%m-%d")},
        "status": {"$in": ["scheduled", "completed", "rescheduled"]}
    })
    
    if week_sessions >= 2:
        raise HTTPException(status_code=400, detail="Máximo 2 sesiones por semana")
    
    session = Session(**session_data.model_dump())
    session_dict = session.model_dump()
    session_dict["created_at"] = session_dict["created_at"].isoformat()
    
    await db.sessions.insert_one(session_dict)
    
    # Update package remaining sessions
    await db.packages.update_one(
        {"id": session_data.package_id},
        {"$inc": {"remaining_sessions": -1}}
    )
    
    return {"message": "Sesión agendada", "session_id": session.id}

@api_router.get("/sessions")
async def get_sessions(
    date: Optional[str] = None,
    client_id: Optional[str] = None,
    package_id: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if date:
        query["date"] = date
    if client_id:
        query["client_id"] = client_id
    if package_id:
        query["package_id"] = package_id
    if status:
        query["status"] = status
    
    sessions = await db.sessions.find(query, {"_id": 0}).to_list(1000)
    
    # Enrich with client names
    for session in sessions:
        client = await db.clients.find_one({"id": session["client_id"]}, {"_id": 0, "name": 1})
        session["client_name"] = client["name"] if client else "Desconocido"
    
    return sessions

@api_router.get("/sessions/calendar")
async def get_calendar_sessions(start_date: str, end_date: str, current_user: dict = Depends(get_current_user)):
    sessions = await db.sessions.find({
        "date": {"$gte": start_date, "$lte": end_date},
        "status": {"$in": ["scheduled", "rescheduled"]}
    }, {"_id": 0}).to_list(1000)
    
    # Enrich with client names
    for session in sessions:
        client = await db.clients.find_one({"id": session["client_id"]}, {"_id": 0, "name": 1})
        session["client_name"] = client["name"] if client else "Desconocido"
    
    return sessions

@api_router.put("/sessions/{session_id}")
async def update_session(session_id: str, session_data: SessionUpdate, current_user: dict = Depends(get_current_user)):
    session = await db.sessions.find_one({"id": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    
    update_data = {k: v for k, v in session_data.model_dump().items() if v is not None}
    
    # If rescheduling
    if "date" in update_data or "time" in update_data:
        package = await db.packages.find_one({"id": session["package_id"]}, {"_id": 0})
        if package["used_reschedules"] >= package["max_reschedules"]:
            raise HTTPException(status_code=400, detail="No quedan reagendamientos disponibles")
        
        # Check new slot availability
        new_date = update_data.get("date", session["date"])
        new_time = update_data.get("time", session["time"])
        new_suit = update_data.get("suit_number", session["suit_number"])
        
        existing = await db.sessions.find_one({
            "id": {"$ne": session_id},
            "date": new_date,
            "time": new_time,
            "suit_number": new_suit,
            "status": {"$in": ["scheduled", "rescheduled"]}
        })
        if existing:
            raise HTTPException(status_code=400, detail="Este horario y traje ya están ocupados")
        
        update_data["is_reschedule"] = True
        update_data["status"] = "rescheduled"
        
        # Increment used reschedules
        await db.packages.update_one(
            {"id": session["package_id"]},
            {"$inc": {"used_reschedules": 1}}
        )
    
    await db.sessions.update_one({"id": session_id}, {"$set": update_data})
    return {"message": "Sesión actualizada"}

@api_router.put("/sessions/{session_id}/complete")
async def complete_session(session_id: str, current_user: dict = Depends(require_admin)):
    result = await db.sessions.update_one(
        {"id": session_id},
        {"$set": {"status": "completed"}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    return {"message": "Sesión completada"}

@api_router.put("/sessions/{session_id}/cancel")
async def cancel_session(session_id: str, current_user: dict = Depends(require_admin)):
    session = await db.sessions.find_one({"id": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    
    await db.sessions.update_one({"id": session_id}, {"$set": {"status": "cancelled"}})
    
    # Return session to package
    await db.packages.update_one(
        {"id": session["package_id"]},
        {"$inc": {"remaining_sessions": 1}}
    )
    
    return {"message": "Sesión cancelada"}

# ==================== SALES ROUTES ====================

@api_router.post("/sales")
async def create_sale(sale_data: SaleCreate, current_user: dict = Depends(require_admin)):
    sale = Sale(**sale_data.model_dump(), created_by=current_user["id"])
    sale_dict = sale.model_dump()
    sale_dict["created_at"] = sale_dict["created_at"].isoformat()
    
    await db.sales.insert_one(sale_dict)
    return {"message": "Venta registrada", "sale_id": sale.id}

@api_router.get("/sales")
async def get_sales(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    client_id: Optional[str] = None,
    current_user: dict = Depends(require_admin)
):
    query = {}
    if client_id:
        query["client_id"] = client_id
    if start_date and end_date:
        query["created_at"] = {"$gte": start_date, "$lte": end_date}
    
    sales = await db.sales.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    # Enrich with client names
    for sale in sales:
        client = await db.clients.find_one({"id": sale["client_id"]}, {"_id": 0, "name": 1})
        sale["client_name"] = client["name"] if client else "Desconocido"
    
    return sales

@api_router.get("/sales/summary")
async def get_sales_summary(period: str = "month", current_user: dict = Depends(require_admin)):
    now = datetime.now(timezone.utc)
    
    if period == "day":
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "week":
        start = now - timedelta(days=now.weekday())
        start = start.replace(hour=0, minute=0, second=0, microsecond=0)
    else:  # month
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    start_str = start.isoformat()
    
    sales = await db.sales.find({"created_at": {"$gte": start_str}}, {"_id": 0}).to_list(1000)
    
    total = sum(s["amount"] for s in sales)
    count = len(sales)
    
    return {"total": total, "count": count, "period": period}

# ==================== DASHBOARD ROUTES ====================

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: dict = Depends(require_admin)):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Today's sessions
    today_sessions = await db.sessions.count_documents({"date": today, "status": {"$in": ["scheduled", "rescheduled"]}})
    
    # Total active clients
    active_clients = await db.clients.count_documents({"is_active": True})
    
    # Active packages
    active_packages = await db.packages.count_documents({"status": "active"})
    
    # Today's sales
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    today_sales = await db.sales.find({"created_at": {"$gte": today_start}}, {"_id": 0}).to_list(100)
    today_revenue = sum(s["amount"] for s in today_sales)
    
    # Month sales
    month_start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
    month_sales = await db.sales.find({"created_at": {"$gte": month_start}}, {"_id": 0}).to_list(1000)
    month_revenue = sum(s["amount"] for s in month_sales)
    
    return {
        "today_sessions": today_sessions,
        "active_clients": active_clients,
        "active_packages": active_packages,
        "today_revenue": today_revenue,
        "month_revenue": month_revenue
    }

@api_router.get("/dashboard/today-schedule")
async def get_today_schedule(current_user: dict = Depends(require_admin)):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    sessions = await db.sessions.find({
        "date": today,
        "status": {"$in": ["scheduled", "rescheduled"]}
    }, {"_id": 0}).sort("time", 1).to_list(100)
    
    # Enrich with client names
    for session in sessions:
        client = await db.clients.find_one({"id": session["client_id"]}, {"_id": 0, "name": 1})
        session["client_name"] = client["name"] if client else "Desconocido"
    
    return sessions

# ==================== CLIENT PORTAL ROUTES ====================

class ClientRegister(BaseModel):
    email: str
    password: str
    name: str
    phone: str
    birth_date: Optional[str] = None

@api_router.post("/portal/register")
async def register_client(data: ClientRegister):
    """Register a new client with user account"""
    # Check if email exists
    existing_user = await db.users.find_one({"email": data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Este email ya está registrado")
    
    # Create user account
    user = User(
        email=data.email,
        name=data.name,
        phone=data.phone,
        role="client"
    )
    user_dict = user.model_dump()
    user_dict["password_hash"] = hash_password(data.password)
    user_dict["created_at"] = user_dict["created_at"].isoformat()
    await db.users.insert_one(user_dict)
    
    # Create client profile
    client = Client(
        user_id=user.id,
        email=data.email,
        name=data.name,
        phone=data.phone,
        birth_date=data.birth_date
    )
    client_dict = client.model_dump()
    client_dict["created_at"] = client_dict["created_at"].isoformat()
    client_dict["medical_history"]["last_updated"] = client_dict["medical_history"]["last_updated"].isoformat()
    await db.clients.insert_one(client_dict)
    
    # Generate token
    token = create_token(user.id, user.role)
    
    return {
        "token": token,
        "user": {"id": user.id, "email": user.email, "name": user.name, "role": user.role},
        "client_id": client.id
    }

@api_router.get("/portal/my-info")
async def get_my_client_info(current_user: dict = Depends(get_current_user)):
    client = await db.clients.find_one({"user_id": current_user["id"]}, {"_id": 0})
    if not client:
        # Try by email
        client = await db.clients.find_one({"email": current_user["email"]}, {"_id": 0})
    
    if not client:
        raise HTTPException(status_code=404, detail="Perfil de cliente no encontrado")
    
    packages = await db.packages.find({"client_id": client["id"], "status": "active"}, {"_id": 0}).to_list(10)
    sessions = await db.sessions.find({
        "client_id": client["id"],
        "status": {"$in": ["scheduled", "rescheduled"]}
    }, {"_id": 0}).sort("date", 1).to_list(100)
    
    # Get all sessions for history (including completed)
    all_sessions = await db.sessions.find({
        "client_id": client["id"]
    }, {"_id": 0}).sort("date", -1).to_list(100)
    
    return {**client, "active_packages": packages, "upcoming_sessions": sessions, "session_history": all_sessions}

@api_router.get("/portal/my-progress")
async def get_my_progress(current_user: dict = Depends(get_current_user)):
    """Get client's progress data (measurements over time)"""
    client = await db.clients.find_one({"user_id": current_user["id"]}, {"_id": 0})
    if not client:
        client = await db.clients.find_one({"email": current_user["email"]}, {"_id": 0})
    
    if not client:
        raise HTTPException(status_code=404, detail="Perfil de cliente no encontrado")
    
    # Get completed sessions count
    completed_sessions = await db.sessions.count_documents({
        "client_id": client["id"],
        "status": "completed"
    })
    
    # Get total sessions purchased
    packages = await db.packages.find({"client_id": client["id"]}, {"_id": 0}).to_list(100)
    total_purchased = sum(p["total_sessions"] for p in packages)
    total_remaining = sum(p["remaining_sessions"] for p in packages if p["status"] == "active")
    
    return {
        "measurements": client.get("measurements", []),
        "completed_sessions": completed_sessions,
        "total_sessions_purchased": total_purchased,
        "remaining_sessions": total_remaining,
        "medical_history": client.get("medical_history", {})
    }

@api_router.get("/portal/available-slots")
async def get_available_slots(date: str, current_user: dict = Depends(get_current_user)):
    """Get available time slots for a specific date"""
    # Get all booked sessions for that date
    booked = await db.sessions.find({
        "date": date,
        "status": {"$in": ["scheduled", "rescheduled"]}
    }, {"_id": 0, "time": 1, "suit_number": 1}).to_list(1000)
    
    # Create availability map
    availability = {}
    for slot in TIME_SLOTS:
        suits_booked = [s["suit_number"] for s in booked if s["time"] == slot]
        available_suits = [i for i in range(1, 7) if i not in suits_booked]
        if available_suits:
            availability[slot] = available_suits
    
    return availability

# ==================== INIT ====================

@api_router.post("/init/admin")
async def create_initial_admin():
    """Create initial admin user if none exists"""
    existing = await db.users.find_one({"role": "admin"})
    if existing:
        return {"message": "Admin ya existe"}
    
    admin = User(
        email="admin@pumpfit.com",
        name="Administrador",
        role="admin"
    )
    admin_dict = admin.model_dump()
    admin_dict["password_hash"] = hash_password("admin123")
    admin_dict["created_at"] = admin_dict["created_at"].isoformat()
    
    await db.users.insert_one(admin_dict)
    return {"message": "Admin creado", "email": "admin@pumpfit.com", "password": "admin123"}

@api_router.get("/")
async def root():
    return {"message": "Pump Fit CRM API"}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
