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

# Roles: superadmin (full control), admin (manage all), reception (front desk - limited), client
ROLES = {
    "superadmin": {"level": 100, "name": "Super Administrador"},
    "admin": {"level": 80, "name": "Administrador"},
    "reception": {"level": 50, "name": "Mostrador"},
    "client": {"level": 10, "name": "Cliente"}
}

class UserBase(BaseModel):
    email: str
    name: str
    phone: Optional[str] = None
    role: str = "client"  # superadmin, admin, reception, client

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class User(UserBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Shift/Turn model for reception cash register
class Shift(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_name: str
    start_time: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    end_time: Optional[datetime] = None
    starting_cash: float = 0
    sales_total: float = 0
    sales_count: int = 0
    cash_sales: float = 0
    card_sales: float = 0
    transfer_sales: float = 0
    final_cash: Optional[float] = None
    difference: Optional[float] = None
    notes: str = ""
    status: str = "open"  # open, closed

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
    """Requires admin, superadmin or reception role"""
    if current_user["role"] not in ["admin", "superadmin", "reception"]:
        raise HTTPException(status_code=403, detail="Acceso denegado")
    return current_user

async def require_superadmin(current_user: dict = Depends(get_current_user)):
    """Only superadmin"""
    if current_user["role"] != "superadmin":
        raise HTTPException(status_code=403, detail="Solo Super Administrador")
    return current_user

async def require_admin_or_above(current_user: dict = Depends(get_current_user)):
    """Admin or superadmin (not reception)"""
    if current_user["role"] not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Acceso denegado - Solo Administradores")
    return current_user

def get_user_role_level(role: str) -> int:
    return ROLES.get(role, {}).get("level", 0)

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

# ==================== INSCRIPTION & ACTIVATION ROUTES ====================

@api_router.post("/clients/{client_id}/pay-inscription")
async def pay_inscription(client_id: str, payment_method: str = "cash", current_user: dict = Depends(require_admin)):
    """Register inscription payment"""
    client = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    if client.get("inscription_paid"):
        raise HTTPException(status_code=400, detail="La inscripción ya fue pagada")
    
    # Update client
    await db.clients.update_one(
        {"id": client_id},
        {"$set": {"inscription_paid": True}}
    )
    
    # Create sale record
    sale = Sale(
        client_id=client_id,
        description="Inscripción",
        amount=INSCRIPTION_PRICE,
        payment_method=payment_method,
        created_by=current_user["id"]
    )
    sale_dict = sale.model_dump()
    sale_dict["created_at"] = sale_dict["created_at"].isoformat()
    await db.sales.insert_one(sale_dict)
    
    return {"message": "Inscripción pagada", "amount": INSCRIPTION_PRICE}

@api_router.post("/clients/{client_id}/nutrition-plan")
async def add_nutrition_plan(client_id: str, payment_method: str = "cash", current_user: dict = Depends(require_admin)):
    """Add nutrition plan to client"""
    client = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    if client.get("has_nutrition_plan"):
        raise HTTPException(status_code=400, detail="El cliente ya tiene plan de nutrición")
    
    # Update client
    await db.clients.update_one(
        {"id": client_id},
        {"$set": {"has_nutrition_plan": True}}
    )
    
    # Create sale record
    sale = Sale(
        client_id=client_id,
        description="Plan de Nutrición",
        amount=NUTRITION_PLAN_PRICE,
        payment_method=payment_method,
        created_by=current_user["id"]
    )
    sale_dict = sale.model_dump()
    sale_dict["created_at"] = sale_dict["created_at"].isoformat()
    await db.sales.insert_one(sale_dict)
    
    return {"message": "Plan de nutrición agregado", "amount": NUTRITION_PLAN_PRICE}

@api_router.post("/clients/{client_id}/activate")
async def activate_client_profile(client_id: str, current_user: dict = Depends(require_admin)):
    """Activate client profile after payment verification"""
    result = await db.clients.update_one(
        {"id": client_id},
        {"$set": {"profile_active": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    return {"message": "Perfil activado"}

@api_router.post("/clients/{client_id}/deactivate")
async def deactivate_client_profile(client_id: str, current_user: dict = Depends(require_admin)):
    """Deactivate client profile"""
    result = await db.clients.update_one(
        {"id": client_id},
        {"$set": {"profile_active": False}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    return {"message": "Perfil desactivado"}

# ==================== REFERRALS ROUTES ====================

class ReferralCreate(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    notes: str = ""

@api_router.post("/clients/{client_id}/referrals")
async def add_referral(client_id: str, referral_data: ReferralCreate, current_user: dict = Depends(get_current_user)):
    """Add a referral (contact recommendation)"""
    referral = Referral(**referral_data.model_dump())
    referral_dict = referral.model_dump()
    referral_dict["created_at"] = referral_dict["created_at"].isoformat()
    
    result = await db.clients.update_one(
        {"id": client_id},
        {"$push": {"referrals": referral_dict}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    return {"message": "Referido agregado", "referral_id": referral.id}

@api_router.get("/clients/{client_id}/referrals")
async def get_referrals(client_id: str, current_user: dict = Depends(get_current_user)):
    """Get client's referrals"""
    client = await db.clients.find_one({"id": client_id}, {"_id": 0, "referrals": 1})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    return client.get("referrals", [])

@api_router.put("/clients/{client_id}/referrals/{referral_id}/status")
async def update_referral_status(client_id: str, referral_id: str, status: str, current_user: dict = Depends(require_admin)):
    """Update referral status (pending, contacted, converted)"""
    if status not in ["pending", "contacted", "converted"]:
        raise HTTPException(status_code=400, detail="Estado inválido")
    
    result = await db.clients.update_one(
        {"id": client_id, "referrals.id": referral_id},
        {"$set": {"referrals.$.status": status}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Referido no encontrado")
    
    return {"message": f"Estado actualizado a {status}"}

@api_router.get("/referrals/all")
async def get_all_referrals(current_user: dict = Depends(require_admin)):
    """Get all referrals from all clients for admin follow-up"""
    clients = await db.clients.find({"referrals": {"$exists": True, "$ne": []}}, {"_id": 0, "id": 1, "name": 1, "referrals": 1}).to_list(1000)
    
    all_referrals = []
    for client in clients:
        for referral in client.get("referrals", []):
            referral["referred_by"] = client["name"]
            referral["referred_by_id"] = client["id"]
            all_referrals.append(referral)
    
    return all_referrals

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
    
    # Create availability map (only 2 suits)
    availability = {}
    for slot in TIME_SLOTS:
        suits_booked = [s["suit_number"] for s in booked if s["time"] == slot]
        available_suits = [i for i in range(1, NUM_SUITS + 1) if i not in suits_booked]
        if available_suits:
            availability[slot] = available_suits
    
    return availability

# ==================== INIT ====================

@api_router.post("/init/admin")
async def create_initial_admin():
    """Create initial superadmin user if none exists"""
    existing = await db.users.find_one({"role": "superadmin"})
    if existing:
        return {"message": "Super Admin ya existe"}
    
    # Create superadmin
    superadmin = User(
        email="super@pumpfit.com",
        name="Super Administrador",
        role="superadmin"
    )
    superadmin_dict = superadmin.model_dump()
    superadmin_dict["password_hash"] = hash_password("super123")
    superadmin_dict["created_at"] = superadmin_dict["created_at"].isoformat()
    await db.users.insert_one(superadmin_dict)
    
    # Create admin
    admin_exists = await db.users.find_one({"role": "admin"})
    if not admin_exists:
        admin = User(
            email="admin@pumpfit.com",
            name="Administrador",
            role="admin"
        )
        admin_dict = admin.model_dump()
        admin_dict["password_hash"] = hash_password("admin123")
        admin_dict["created_at"] = admin_dict["created_at"].isoformat()
        await db.users.insert_one(admin_dict)
    
    # Create reception
    reception_exists = await db.users.find_one({"role": "reception"})
    if not reception_exists:
        reception = User(
            email="mostrador@pumpfit.com",
            name="Mostrador",
            role="reception"
        )
        reception_dict = reception.model_dump()
        reception_dict["password_hash"] = hash_password("mostrador123")
        reception_dict["created_at"] = reception_dict["created_at"].isoformat()
        await db.users.insert_one(reception_dict)
    
    return {
        "message": "Usuarios creados",
        "users": [
            {"email": "super@pumpfit.com", "password": "super123", "role": "superadmin"},
            {"email": "admin@pumpfit.com", "password": "admin123", "role": "admin"},
            {"email": "mostrador@pumpfit.com", "password": "mostrador123", "role": "reception"}
        ]
    }

# ==================== SHIFT/TURN ROUTES (Corte de Caja) ====================

class ShiftStart(BaseModel):
    starting_cash: float = 0

class ShiftClose(BaseModel):
    final_cash: float
    notes: str = ""

@api_router.post("/shifts/start")
async def start_shift(data: ShiftStart, current_user: dict = Depends(require_admin)):
    """Start a new shift for reception"""
    # Check if user has an open shift
    open_shift = await db.shifts.find_one({
        "user_id": current_user["id"],
        "status": "open"
    })
    if open_shift:
        raise HTTPException(status_code=400, detail="Ya tienes un turno abierto. Ciérralo primero.")
    
    shift = Shift(
        user_id=current_user["id"],
        user_name=current_user["name"],
        starting_cash=data.starting_cash
    )
    shift_dict = shift.model_dump()
    shift_dict["start_time"] = shift_dict["start_time"].isoformat()
    
    await db.shifts.insert_one(shift_dict)
    return {"message": "Turno iniciado", "shift_id": shift.id, "start_time": shift_dict["start_time"]}

@api_router.get("/shifts/current")
async def get_current_shift(current_user: dict = Depends(require_admin)):
    """Get current open shift for user"""
    shift = await db.shifts.find_one({
        "user_id": current_user["id"],
        "status": "open"
    }, {"_id": 0})
    
    if not shift:
        return {"has_open_shift": False}
    
    # Calculate sales during this shift
    start_time = shift["start_time"]
    sales = await db.sales.find({
        "created_at": {"$gte": start_time},
        "created_by": current_user["id"]
    }, {"_id": 0}).to_list(1000)
    
    total = sum(s["amount"] for s in sales)
    cash = sum(s["amount"] for s in sales if s["payment_method"] == "cash")
    card = sum(s["amount"] for s in sales if s["payment_method"] == "card")
    transfer = sum(s["amount"] for s in sales if s["payment_method"] == "transfer")
    
    return {
        "has_open_shift": True,
        "shift": shift,
        "sales_summary": {
            "total": total,
            "count": len(sales),
            "cash": cash,
            "card": card,
            "transfer": transfer,
            "expected_cash": shift["starting_cash"] + cash
        },
        "sales": sales
    }

@api_router.post("/shifts/close")
async def close_shift(data: ShiftClose, current_user: dict = Depends(require_admin)):
    """Close current shift and make cash register cut"""
    shift = await db.shifts.find_one({
        "user_id": current_user["id"],
        "status": "open"
    }, {"_id": 0})
    
    if not shift:
        raise HTTPException(status_code=400, detail="No tienes un turno abierto")
    
    # Calculate sales during this shift
    start_time = shift["start_time"]
    sales = await db.sales.find({
        "created_at": {"$gte": start_time},
        "created_by": current_user["id"]
    }, {"_id": 0}).to_list(1000)
    
    total = sum(s["amount"] for s in sales)
    cash = sum(s["amount"] for s in sales if s["payment_method"] == "cash")
    card = sum(s["amount"] for s in sales if s["payment_method"] == "card")
    transfer = sum(s["amount"] for s in sales if s["payment_method"] == "transfer")
    
    expected_cash = shift["starting_cash"] + cash
    difference = data.final_cash - expected_cash
    
    # Update shift
    await db.shifts.update_one(
        {"id": shift["id"]},
        {"$set": {
            "end_time": datetime.now(timezone.utc).isoformat(),
            "sales_total": total,
            "sales_count": len(sales),
            "cash_sales": cash,
            "card_sales": card,
            "transfer_sales": transfer,
            "final_cash": data.final_cash,
            "difference": difference,
            "notes": data.notes,
            "status": "closed"
        }}
    )
    
    return {
        "message": "Turno cerrado - Corte realizado",
        "shift_summary": {
            "start_time": shift["start_time"],
            "end_time": datetime.now(timezone.utc).isoformat(),
            "starting_cash": shift["starting_cash"],
            "sales_total": total,
            "sales_count": len(sales),
            "cash_sales": cash,
            "card_sales": card,
            "transfer_sales": transfer,
            "expected_cash": expected_cash,
            "final_cash": data.final_cash,
            "difference": difference
        }
    }

@api_router.get("/shifts/history")
async def get_shift_history(user_id: Optional[str] = None, current_user: dict = Depends(require_admin)):
    """Get shift history - admins see all, reception sees own"""
    query = {}
    if current_user["role"] == "reception":
        query["user_id"] = current_user["id"]
    elif user_id:
        query["user_id"] = user_id
    
    shifts = await db.shifts.find(query, {"_id": 0}).sort("start_time", -1).to_list(100)
    return shifts

@api_router.get("/shifts/{shift_id}")
async def get_shift_detail(shift_id: str, current_user: dict = Depends(require_admin)):
    """Get detailed shift info"""
    shift = await db.shifts.find_one({"id": shift_id}, {"_id": 0})
    if not shift:
        raise HTTPException(status_code=404, detail="Turno no encontrado")
    
    # Reception can only see their own shifts
    if current_user["role"] == "reception" and shift["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Acceso denegado")
    
    # Get sales for this shift
    if shift["status"] == "closed":
        sales = await db.sales.find({
            "created_at": {"$gte": shift["start_time"], "$lte": shift["end_time"]},
            "created_by": shift["user_id"]
        }, {"_id": 0}).to_list(1000)
    else:
        sales = await db.sales.find({
            "created_at": {"$gte": shift["start_time"]},
            "created_by": shift["user_id"]
        }, {"_id": 0}).to_list(1000)
    
    return {**shift, "sales": sales}

# ==================== USER MANAGEMENT (Superadmin) ====================

@api_router.get("/users")
async def get_users(current_user: dict = Depends(require_admin_or_above)):
    """Get all staff users (not clients)"""
    users = await db.users.find(
        {"role": {"$in": ["superadmin", "admin", "reception"]}},
        {"_id": 0, "password_hash": 0}
    ).to_list(100)
    return users

@api_router.post("/users")
async def create_user(user_data: UserCreate, current_user: dict = Depends(require_superadmin)):
    """Create a new staff user (superadmin only)"""
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email ya registrado")
    
    if user_data.role not in ["admin", "reception"]:
        raise HTTPException(status_code=400, detail="Solo puedes crear admin o reception")
    
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
    return {"message": "Usuario creado", "user_id": user.id}

@api_router.put("/users/{user_id}")
async def update_user(user_id: str, name: Optional[str] = None, phone: Optional[str] = None, role: Optional[str] = None, current_user: dict = Depends(require_superadmin)):
    """Update user (superadmin only)"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    if user["role"] == "superadmin" and current_user["id"] != user_id:
        raise HTTPException(status_code=403, detail="No puedes modificar a otro superadmin")
    
    update_data = {}
    if name:
        update_data["name"] = name
    if phone:
        update_data["phone"] = phone
    if role and role in ["admin", "reception"]:
        update_data["role"] = role
    
    if update_data:
        await db.users.update_one({"id": user_id}, {"$set": update_data})
    
    return {"message": "Usuario actualizado"}

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(require_superadmin)):
    """Delete user (superadmin only)"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    if user["role"] == "superadmin":
        raise HTTPException(status_code=403, detail="No puedes eliminar un superadmin")
    
    await db.users.delete_one({"id": user_id})
    return {"message": "Usuario eliminado"}

@api_router.put("/users/{user_id}/password")
async def change_user_password(user_id: str, new_password: str, current_user: dict = Depends(require_superadmin)):
    """Change user password (superadmin only)"""
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {"password_hash": hash_password(new_password)}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return {"message": "Contraseña actualizada"}

# ==================== RECEPTION SPECIFIC ROUTES ====================

@api_router.get("/reception/today-sales")
async def get_reception_today_sales(current_user: dict = Depends(require_admin)):
    """Get today's sales for reception view"""
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    
    # If reception, only show their sales
    query = {"created_at": {"$gte": today_start}}
    if current_user["role"] == "reception":
        query["created_by"] = current_user["id"]
    
    sales = await db.sales.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    # Enrich with client names
    for sale in sales:
        client = await db.clients.find_one({"id": sale["client_id"]}, {"_id": 0, "name": 1})
        sale["client_name"] = client["name"] if client else "Desconocido"
    
    total = sum(s["amount"] for s in sales)
    cash = sum(s["amount"] for s in sales if s["payment_method"] == "cash")
    card = sum(s["amount"] for s in sales if s["payment_method"] == "card")
    transfer = sum(s["amount"] for s in sales if s["payment_method"] == "transfer")
    
    return {
        "sales": sales,
        "summary": {
            "total": total,
            "count": len(sales),
            "cash": cash,
            "card": card,
            "transfer": transfer
        }
    }

@api_router.get("/")
async def root():
    return {"message": "Pump Fit CRM API", "roles": list(ROLES.keys())}

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
