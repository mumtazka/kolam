from fastapi import FastAPI, APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
import qrcode
import io
import base64
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT configuration
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

# Security
security = HTTPBearer()

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Enums
class UserRole(str, Enum):
    ADMIN = "ADMIN"
    RECEPTIONIST = "RECEPTIONIST"
    SCANNER = "SCANNER"

class TicketStatus(str, Enum):
    UNUSED = "UNUSED"
    USED = "USED"

class TicketCategory(str, Enum):
    UMUM = "Umum"
    MAHASISWA = "Mahasiswa"
    KHUSUS = "Khusus"
    LIBURAN = "Liburan"

# Models
class Token(BaseModel):
    access_token: str
    token_type: str
    user: Dict[str, Any]

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserBase(BaseModel):
    email: EmailStr
    name: str
    role: UserRole

class UserCreate(UserBase):
    password: str

class User(UserBase):
    model_config = ConfigDict(extra="ignore")
    id: str
    is_active: bool = True
    created_at: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None

class CategoryModel(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    requires_nim: bool = False
    description: Optional[str] = None
    created_at: str

class CategoryCreate(BaseModel):
    name: str
    requires_nim: bool = False
    description: Optional[str] = None

class PriceModel(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    category_id: str
    category_name: str
    price: float
    updated_at: str
    updated_by: str

class PriceUpdate(BaseModel):
    category_id: str
    price: float

class SessionModel(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    start_time: str
    end_time: str
    days: List[str]
    is_recurring: bool = True
    created_at: str

class SessionCreate(BaseModel):
    name: str
    start_time: str
    end_time: str
    days: List[str]
    is_recurring: bool = True

class PackageModel(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    depth_range: str
    description: Optional[str] = None
    created_at: str

class PackageCreate(BaseModel):
    name: str
    depth_range: str
    description: Optional[str] = None

class LocationModel(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    capacity: Optional[int] = None
    created_at: str

class LocationCreate(BaseModel):
    name: str
    capacity: Optional[int] = None

class TicketItem(BaseModel):
    category_id: str
    quantity: int
    nim: Optional[str] = None

class BatchCreate(BaseModel):
    tickets: List[TicketItem]

class TicketModel(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    batch_id: str
    category_id: str
    category_name: str
    status: TicketStatus
    price: float
    nim: Optional[str] = None
    qr_code: str
    created_by: str
    created_by_name: str
    shift: str
    created_at: str
    scanned_at: Optional[str] = None
    scanned_by: Optional[str] = None

class ScanRequest(BaseModel):
    ticket_id: str

class ScanResult(BaseModel):
    success: bool
    status: str
    message: str
    ticket: Optional[Dict[str, Any]] = None

# Auth Utilities
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = await db.users.find_one({"id": user_id, "is_active": True}, {"_id": 0})
    if user is None:
        raise credentials_exception
    return user

def require_role(allowed_roles: List[UserRole]):
    async def role_checker(current_user: dict = Depends(get_current_user)):
        if current_user["role"] not in [role.value for role in allowed_roles]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )
        return current_user
    return role_checker

def generate_qr_code(data: str) -> str:
    """Generate QR code and return as base64 string"""
    qr = qrcode.QRCode(version=1, box_size=10, border=2)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode()
    return f"data:image/png;base64,{img_str}"

# Auth Routes
@api_router.post("/auth/login", response_model=Token)
async def login(request: LoginRequest):
    user = await db.users.find_one({"email": request.email, "is_active": True}, {"_id": 0})
    if not user or not verify_password(request.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    access_token = create_access_token(data={"sub": user["id"], "role": user["role"]})
    user_data = {k: v for k, v in user.items() if k != "password_hash"}
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_data
    }

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return {k: v for k, v in current_user.items() if k != "password_hash"}

# User Routes (Admin only)
@api_router.get("/users", response_model=List[User])
async def get_users(current_user: dict = Depends(require_role([UserRole.ADMIN]))):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return users

@api_router.post("/users", response_model=User)
async def create_user(user: UserCreate, current_user: dict = Depends(require_role([UserRole.ADMIN]))):
    # Check if user already exists
    existing = await db.users.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_dict = user.model_dump()
    password = user_dict.pop("password")
    user_dict["password_hash"] = get_password_hash(password)
    user_dict["id"] = str(uuid.uuid4())
    user_dict["is_active"] = True
    user_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.users.insert_one(user_dict)
    return {k: v for k, v in user_dict.items() if k != "password_hash"}

@api_router.put("/users/{user_id}", response_model=User)
async def update_user(user_id: str, user_update: UserUpdate, current_user: dict = Depends(require_role([UserRole.ADMIN]))):
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = user_update.model_dump(exclude_unset=True)
    if "password" in update_data:
        update_data["password_hash"] = get_password_hash(update_data.pop("password"))
    
    if update_data:
        await db.users.update_one({"id": user_id}, {"$set": update_data})
    
    updated_user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    return updated_user

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(require_role([UserRole.ADMIN]))):
    result = await db.users.update_one({"id": user_id}, {"$set": {"is_active": False}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deactivated successfully"}

# Category Routes
@api_router.get("/categories", response_model=List[CategoryModel])
async def get_categories(current_user: dict = Depends(get_current_user)):
    categories = await db.categories.find({}, {"_id": 0}).to_list(1000)
    return categories

@api_router.post("/categories", response_model=CategoryModel)
async def create_category(category: CategoryCreate, current_user: dict = Depends(require_role([UserRole.ADMIN]))):
    category_dict = category.model_dump()
    category_dict["id"] = str(uuid.uuid4())
    category_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.categories.insert_one(category_dict)
    return category_dict

@api_router.put("/categories/{category_id}", response_model=CategoryModel)
async def update_category(category_id: str, category: CategoryCreate, current_user: dict = Depends(require_role([UserRole.ADMIN]))):
    update_data = category.model_dump()
    result = await db.categories.update_one({"id": category_id}, {"$set": update_data})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    
    updated = await db.categories.find_one({"id": category_id}, {"_id": 0})
    return updated

@api_router.delete("/categories/{category_id}")
async def delete_category(category_id: str, current_user: dict = Depends(require_role([UserRole.ADMIN]))):
    result = await db.categories.delete_one({"id": category_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"message": "Category deleted successfully"}

# Price Routes
@api_router.get("/prices", response_model=List[PriceModel])
async def get_prices(current_user: dict = Depends(get_current_user)):
    prices = await db.prices.find({}, {"_id": 0}).to_list(1000)
    return prices

@api_router.post("/prices", response_model=PriceModel)
async def update_price(price: PriceUpdate, current_user: dict = Depends(require_role([UserRole.ADMIN]))):
    category = await db.categories.find_one({"id": price.category_id}, {"_id": 0})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Check if price already exists
    existing = await db.prices.find_one({"category_id": price.category_id})
    
    price_dict = {
        "id": existing["id"] if existing else str(uuid.uuid4()),
        "category_id": price.category_id,
        "category_name": category["name"],
        "price": price.price,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": current_user["id"]
    }
    
    if existing:
        await db.prices.update_one({"category_id": price.category_id}, {"$set": price_dict})
    else:
        await db.prices.insert_one(price_dict)
    
    return price_dict

# Session Routes
@api_router.get("/sessions", response_model=List[SessionModel])
async def get_sessions(current_user: dict = Depends(get_current_user)):
    sessions = await db.sessions.find({}, {"_id": 0}).to_list(1000)
    return sessions

@api_router.post("/sessions", response_model=SessionModel)
async def create_session(session: SessionCreate, current_user: dict = Depends(require_role([UserRole.ADMIN]))):
    session_dict = session.model_dump()
    session_dict["id"] = str(uuid.uuid4())
    session_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.sessions.insert_one(session_dict)
    return session_dict

@api_router.put("/sessions/{session_id}", response_model=SessionModel)
async def update_session(session_id: str, session: SessionCreate, current_user: dict = Depends(require_role([UserRole.ADMIN]))):
    update_data = session.model_dump()
    result = await db.sessions.update_one({"id": session_id}, {"$set": update_data})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Session not found")
    
    updated = await db.sessions.find_one({"id": session_id}, {"_id": 0})
    return updated

@api_router.delete("/sessions/{session_id}")
async def delete_session(session_id: str, current_user: dict = Depends(require_role([UserRole.ADMIN]))):
    result = await db.sessions.delete_one({"id": session_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"message": "Session deleted successfully"}

# Package Routes
@api_router.get("/packages", response_model=List[PackageModel])
async def get_packages(current_user: dict = Depends(get_current_user)):
    packages = await db.packages.find({}, {"_id": 0}).to_list(1000)
    return packages

@api_router.post("/packages", response_model=PackageModel)
async def create_package(package: PackageCreate, current_user: dict = Depends(require_role([UserRole.ADMIN]))):
    package_dict = package.model_dump()
    package_dict["id"] = str(uuid.uuid4())
    package_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.packages.insert_one(package_dict)
    return package_dict

@api_router.put("/packages/{package_id}", response_model=PackageModel)
async def update_package(package_id: str, package: PackageCreate, current_user: dict = Depends(require_role([UserRole.ADMIN]))):
    update_data = package.model_dump()
    result = await db.packages.update_one({"id": package_id}, {"$set": update_data})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Package not found")
    
    updated = await db.packages.find_one({"id": package_id}, {"_id": 0})
    return updated

@api_router.delete("/packages/{package_id}")
async def delete_package(package_id: str, current_user: dict = Depends(require_role([UserRole.ADMIN]))):
    result = await db.packages.delete_one({"id": package_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Package not found")
    return {"message": "Package deleted successfully"}

# Location Routes
@api_router.get("/locations", response_model=List[LocationModel])
async def get_locations(current_user: dict = Depends(get_current_user)):
    locations = await db.locations.find({}, {"_id": 0}).to_list(1000)
    return locations

@api_router.post("/locations", response_model=LocationModel)
async def create_location(location: LocationCreate, current_user: dict = Depends(require_role([UserRole.ADMIN]))):
    location_dict = location.model_dump()
    location_dict["id"] = str(uuid.uuid4())
    location_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.locations.insert_one(location_dict)
    return location_dict

@api_router.put("/locations/{location_id}", response_model=LocationModel)
async def update_location(location_id: str, location: LocationCreate, current_user: dict = Depends(require_role([UserRole.ADMIN]))):
    update_data = location.model_dump()
    result = await db.locations.update_one({"id": location_id}, {"$set": update_data})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Location not found")
    
    updated = await db.locations.find_one({"id": location_id}, {"_id": 0})
    return updated

@api_router.delete("/locations/{location_id}")
async def delete_location(location_id: str, current_user: dict = Depends(require_role([UserRole.ADMIN]))):
    result = await db.locations.delete_one({"id": location_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Location not found")
    return {"message": "Location deleted successfully"}

# Ticket Routes
@api_router.post("/tickets/batch")
async def create_batch(batch: BatchCreate, current_user: dict = Depends(require_role([UserRole.ADMIN, UserRole.RECEPTIONIST]))):
    batch_id = str(uuid.uuid4())
    created_tickets = []
    shift = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M")
    
    for item in batch.tickets:
        # Get category and price
        category = await db.categories.find_one({"id": item.category_id}, {"_id": 0})
        if not category:
            raise HTTPException(status_code=404, detail=f"Category not found: {item.category_id}")
        
        price_doc = await db.prices.find_one({"category_id": item.category_id}, {"_id": 0})
        if not price_doc:
            raise HTTPException(status_code=404, detail=f"Price not set for category: {category['name']}")
        
        # Create tickets
        for _ in range(item.quantity):
            ticket_id = str(uuid.uuid4())
            qr_code = generate_qr_code(ticket_id)
            
            ticket_dict = {
                "id": ticket_id,
                "batch_id": batch_id,
                "category_id": item.category_id,
                "category_name": category["name"],
                "status": TicketStatus.UNUSED.value,
                "price": price_doc["price"],
                "nim": item.nim if category.get("requires_nim") else None,
                "qr_code": qr_code,
                "created_by": current_user["id"],
                "created_by_name": current_user["name"],
                "shift": shift,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "scanned_at": None,
                "scanned_by": None
            }
            
            created_tickets.append(ticket_dict)
    
    if created_tickets:
        await db.tickets.insert_many(created_tickets)
    
    return {
        "batch_id": batch_id,
        "total_tickets": len(created_tickets),
        "tickets": created_tickets
    }

@api_router.get("/tickets")
async def get_tickets(
    batch_id: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if batch_id:
        query["batch_id"] = batch_id
    if status:
        query["status"] = status
    
    # Receptionists can only see their own tickets
    if current_user["role"] == UserRole.RECEPTIONIST.value:
        query["created_by"] = current_user["id"]
    
    tickets = await db.tickets.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return tickets

@api_router.post("/tickets/scan", response_model=ScanResult)
async def scan_ticket(scan_req: ScanRequest, current_user: dict = Depends(require_role([UserRole.ADMIN, UserRole.SCANNER]))):
    ticket = await db.tickets.find_one({"id": scan_req.ticket_id}, {"_id": 0})
    
    if not ticket:
        return ScanResult(
            success=False,
            status="INVALID",
            message="Ticket not found",
            ticket=None
        )
    
    if ticket["status"] == TicketStatus.USED.value:
        return ScanResult(
            success=False,
            status="USED",
            message="This ticket has already been used",
            ticket=ticket
        )
    
    # Mark ticket as used
    await db.tickets.update_one(
        {"id": scan_req.ticket_id},
        {
            "$set": {
                "status": TicketStatus.USED.value,
                "scanned_at": datetime.now(timezone.utc).isoformat(),
                "scanned_by": current_user["id"]
            }
        }
    )
    
    # Log the scan
    scan_log = {
        "id": str(uuid.uuid4()),
        "ticket_id": scan_req.ticket_id,
        "scanned_by": current_user["id"],
        "scanned_by_name": current_user["name"],
        "scanned_at": datetime.now(timezone.utc).isoformat(),
        "category_name": ticket["category_name"]
    }
    await db.scan_logs.insert_one(scan_log)
    
    ticket["status"] = TicketStatus.USED.value
    
    return ScanResult(
        success=True,
        status="VALID",
        message="Ticket validated successfully",
        ticket=ticket
    )

# Report Routes
@api_router.get("/reports/daily")
async def get_daily_report(
    date: Optional[str] = None,
    current_user: dict = Depends(require_role([UserRole.ADMIN]))
):
    if not date:
        date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    start_date = f"{date}T00:00:00"
    end_date = f"{date}T23:59:59"
    
    # Tickets sold
    tickets_sold = await db.tickets.count_documents({
        "created_at": {"$gte": start_date, "$lte": end_date}
    })
    
    # Tickets scanned
    tickets_scanned = await db.tickets.count_documents({
        "scanned_at": {"$gte": start_date, "$lte": end_date}
    })
    
    # Revenue
    pipeline = [
        {"$match": {"created_at": {"$gte": start_date, "$lte": end_date}}},
        {"$group": {"_id": None, "total": {"$sum": "$price"}}}
    ]
    revenue_result = await db.tickets.aggregate(pipeline).to_list(1)
    total_revenue = revenue_result[0]["total"] if revenue_result else 0
    
    # By category
    category_pipeline = [
        {"$match": {"created_at": {"$gte": start_date, "$lte": end_date}}},
        {"$group": {
            "_id": "$category_name",
            "count": {"$sum": 1},
            "revenue": {"$sum": "$price"}
        }}
    ]
    by_category = await db.tickets.aggregate(category_pipeline).to_list(100)
    
    return {
        "date": date,
        "tickets_sold": tickets_sold,
        "tickets_scanned": tickets_scanned,
        "total_revenue": total_revenue,
        "by_category": by_category
    }

@api_router.get("/reports/shift")
async def get_shift_report(
    shift: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    
    # Receptionists can only see their own shift
    if current_user["role"] == UserRole.RECEPTIONIST.value:
        query["created_by"] = current_user["id"]
    
    if shift:
        query["shift"] = shift
    else:
        # Current shift
        current_shift = datetime.now(timezone.utc).strftime("%Y-%m-%d %H")
        query["shift"] = {"$regex": f"^{current_shift}"}
    
    tickets = await db.tickets.find(query, {"_id": 0}).to_list(1000)
    
    total_tickets = len(tickets)
    total_revenue = sum(t["price"] for t in tickets)
    tickets_scanned = sum(1 for t in tickets if t["status"] == TicketStatus.USED.value)
    
    return {
        "shift": shift or "current",
        "total_tickets": total_tickets,
        "tickets_scanned": tickets_scanned,
        "total_revenue": total_revenue,
        "tickets": tickets
    }

@api_router.get("/reports/monthly")
async def get_monthly_report(
    year: int,
    month: int,
    current_user: dict = Depends(require_role([UserRole.ADMIN]))
):
    start_date = f"{year}-{month:02d}-01T00:00:00"
    if month == 12:
        end_date = f"{year}-12-31T23:59:59"
    else:
        end_date = f"{year}-{month+1:02d}-01T00:00:00"
    
    # Tickets sold
    tickets_sold = await db.tickets.count_documents({
        "created_at": {"$gte": start_date, "$lt": end_date}
    })
    
    # Revenue
    pipeline = [
        {"$match": {"created_at": {"$gte": start_date, "$lt": end_date}}},
        {"$group": {"_id": None, "total": {"$sum": "$price"}}}
    ]
    revenue_result = await db.tickets.aggregate(pipeline).to_list(1)
    total_revenue = revenue_result[0]["total"] if revenue_result else 0
    
    # Daily breakdown
    daily_pipeline = [
        {"$match": {"created_at": {"$gte": start_date, "$lt": end_date}}},
        {"$group": {
            "_id": {"$substr": ["$created_at", 0, 10]},
            "tickets": {"$sum": 1},
            "revenue": {"$sum": "$price"}
        }},
        {"$sort": {"_id": 1}}
    ]
    daily_data = await db.tickets.aggregate(daily_pipeline).to_list(100)
    
    return {
        "year": year,
        "month": month,
        "tickets_sold": tickets_sold,
        "total_revenue": total_revenue,
        "daily_breakdown": daily_data
    }

@api_router.get("/reports/staff-activity")
async def get_staff_activity(current_user: dict = Depends(require_role([UserRole.ADMIN]))):
    pipeline = [
        {"$group": {
            "_id": "$created_by_name",
            "tickets_sold": {"$sum": 1},
            "revenue": {"$sum": "$price"}
        }},
        {"$sort": {"tickets_sold": -1}}
    ]
    staff_activity = await db.tickets.aggregate(pipeline).to_list(100)
    
    return staff_activity

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

# Seed initial data
@app.on_event("startup")
async def startup_seed():
    # Create admin user if not exists
    admin_exists = await db.users.find_one({"role": "ADMIN"})
    if not admin_exists:
        admin_user = {
            "id": str(uuid.uuid4()),
            "email": "admin@aquaflow.com",
            "password_hash": get_password_hash("admin123"),
            "name": "System Admin",
            "role": "ADMIN",
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(admin_user)
        logger.info("Created default admin user: admin@aquaflow.com / admin123")
    
    # Create default categories
    categories_exist = await db.categories.count_documents({})
    if categories_exist == 0:
        default_categories = [
            {"id": str(uuid.uuid4()), "name": "Umum", "requires_nim": False, "description": "General admission", "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "name": "Mahasiswa", "requires_nim": True, "description": "Student with NIM", "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "name": "Khusus", "requires_nim": False, "description": "Special admission", "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "name": "Liburan", "requires_nim": False, "description": "Holiday admission (includes Sat & Sun)", "created_at": datetime.now(timezone.utc).isoformat()}
        ]
        await db.categories.insert_many(default_categories)
        logger.info("Created default ticket categories")
    
    # Create default packages
    packages_exist = await db.packages.count_documents({})
    if packages_exist == 0:
        default_packages = [
            {"id": str(uuid.uuid4()), "name": "PAUD", "depth_range": "0-40 cm", "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "name": "SD", "depth_range": "40-100 cm", "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "name": "SMP", "depth_range": "100-150 cm", "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "name": "Pemanasan", "depth_range": "Shallow end", "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "name": "Khusus", "depth_range": "Custom", "created_at": datetime.now(timezone.utc).isoformat()}
        ]
        await db.packages.insert_many(default_packages)
        logger.info("Created default packages")
