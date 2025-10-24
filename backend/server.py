from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import IndexModel, ASCENDING
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
import secrets
import base64
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont
import hashlib

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Basic auth setup
security = HTTPBasic()

# Default admin credentials
DEFAULT_ADMIN_ID = "admin"
DEFAULT_ADMIN_PASSWORD = "password123"

def verify_credentials(credentials: HTTPBasicCredentials = Depends(security)):
    correct_username = secrets.compare_digest(credentials.username, DEFAULT_ADMIN_ID)
    correct_password = secrets.compare_digest(credentials.password, DEFAULT_ADMIN_PASSWORD)
    if not (correct_username and correct_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return credentials.username

# Define Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    dob: str  # Format: YYYY-MM-DD
    age: int
    weight: float
    height: float
    aadhar: str
    address: str
    phone_number: str
    whatsapp_number: str
    joining_date: str  # Format: YYYY-MM-DD
    status: str = "Active"  # Active, Inactive, Deactivated
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class UserCreate(BaseModel):
    name: str
    dob: str
    age: int
    weight: float
    height: float
    aadhar: str
    address: str
    phone_number: str
    whatsapp_number: str
    joining_date: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    dob: Optional[str] = None
    age: Optional[int] = None
    weight: Optional[float] = None
    height: Optional[float] = None
    aadhar: Optional[str] = None
    address: Optional[str] = None
    phone_number: Optional[str] = None
    whatsapp_number: Optional[str] = None
    status: Optional[str] = None

class FeeCollection(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    amount: float
    payment_type: str  # "Monthly" or "Yearly"
    payment_date: str  # Format: YYYY-MM-DD
    valid_until: str   # Format: YYYY-MM-DD
    receipt_image: Optional[str] = None  # Base64 encoded image
    created_at: datetime = Field(default_factory=datetime.utcnow)

class FeeCollectionCreate(BaseModel):
    user_id: str
    amount: float
    payment_type: str
    payment_date: str

class UserStatus(BaseModel):
    user_id: str
    status: str
    last_payment_date: Optional[str] = None
    next_due_date: Optional[str] = None
    days_overdue: int = 0

class FeeSummary(BaseModel):
    monthly_total: float
    quarterly_total: float
    yearly_total: float
    total_collections: int
    total_active_members: int

# Helper function to generate receipt image
async def generate_receipt_image(user_name: str, amount: float, payment_type: str, payment_date: str) -> str:
    try:
        # Create a simple receipt image
        img = Image.new('RGB', (400, 600), color='white')
        draw = ImageDraw.Draw(img)
        
        # Use default font
        font = ImageFont.load_default()
        
        # Receipt content
        lines = [
            "FITNESS CENTER",
            "Fee Receipt",
            "=" * 25,
            f"Name: {user_name}",
            f"Amount: ₹{amount}",
            f"Type: {payment_type}",
            f"Date: {payment_date}",
            "=" * 25,
            "Thank you for payment!",
            "",
            f"Receipt ID: {str(uuid.uuid4())[:8]}"
        ]
        
        y_position = 50
        for line in lines:
            draw.text((50, y_position), line, fill='black', font=font)
            y_position += 30
        
        # Convert to base64
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        image_base64 = base64.b64encode(buffer.read()).decode('utf-8')
        
        return f"data:image/png;base64,{image_base64}"
    except Exception as e:
        logging.error(f"Error generating receipt: {str(e)}")
        return ""

# Helper function to calculate user status
async def calculate_user_status(user_id: str) -> str:
    latest_fee = await db.fee_collections.find_one(
        {"user_id": user_id},
        sort=[("payment_date", -1)]
    )
    
    if not latest_fee:
        return "Inactive"
    
    payment_date = datetime.strptime(latest_fee["payment_date"], "%Y-%m-%d")
    valid_until = datetime.strptime(latest_fee["valid_until"], "%Y-%m-%d")
    now = datetime.now()
    
    if now <= valid_until:
        return "Active"
    
    days_overdue = (now - valid_until).days
    
    if days_overdue <= 90:  # 3 months = 90 days
        return "Inactive"
    else:
        return "Deactivated"

# Authentication endpoints
@api_router.post("/auth/login")
async def login(credentials: HTTPBasicCredentials = Depends(security)):
    username = verify_credentials(credentials)
    return {"message": "Login successful", "username": username}

@api_router.get("/auth/verify")
async def verify_auth(username: str = Depends(verify_credentials)):
    return {"authenticated": True, "username": username}

# User management endpoints
@api_router.post("/users", response_model=User)
async def create_user(user_data: UserCreate, username: str = Depends(verify_credentials)):
    user_dict = user_data.dict()
    user_obj = User(**user_dict)
    
    # Create indexes if they don't exist
    await db.users.create_index([("name", ASCENDING)])
    await db.users.create_index([("phone_number", ASCENDING)])
    
    result = await db.users.insert_one(user_obj.dict())
    return user_obj

@api_router.get("/users", response_model=List[User])
async def get_users(search: Optional[str] = None, username: str = Depends(verify_credentials)):
    query = {}
    if search:
        query["name"] = {"$regex": search, "$options": "i"}
    
    users = await db.users.find(query).sort("name", 1).to_list(1000)
    
    # Update status for each user
    for user in users:
        user["status"] = await calculate_user_status(user["id"])
        await db.users.update_one(
            {"id": user["id"]},
            {"$set": {"status": user["status"], "updated_at": datetime.utcnow()}}
        )
    
    return [User(**user) for user in users]

@api_router.get("/users/{user_id}", response_model=User)
async def get_user(user_id: str, username: str = Depends(verify_credentials)):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update status
    user["status"] = await calculate_user_status(user_id)
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"status": user["status"], "updated_at": datetime.utcnow()}}
    )
    
    return User(**user)

@api_router.put("/users/{user_id}", response_model=User)
async def update_user(user_id: str, user_data: UserUpdate, username: str = Depends(verify_credentials)):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = {k: v for k, v in user_data.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    await db.users.update_one({"id": user_id}, {"$set": update_data})
    updated_user = await db.users.find_one({"id": user_id})
    
    return User(**updated_user)

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, username: str = Depends(verify_credentials)):
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Also delete associated fee collections
    await db.fee_collections.delete_many({"user_id": user_id})
    
    return {"message": "User deleted successfully"}

# Fee collection endpoints
@api_router.post("/fee-collections", response_model=FeeCollection)
async def create_fee_collection(fee_data: FeeCollectionCreate, username: str = Depends(verify_credentials)):
    # Verify user exists
    user = await db.users.find_one({"id": fee_data.user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Calculate valid_until based on payment type
    payment_date = datetime.strptime(fee_data.payment_date, "%Y-%m-%d")
    if fee_data.payment_type.lower() == "monthly":
        valid_until = payment_date + timedelta(days=30)
    else:  # yearly
        valid_until = payment_date + timedelta(days=365)
    
    # Generate receipt image
    receipt_image = await generate_receipt_image(
        user["name"], fee_data.amount, fee_data.payment_type, fee_data.payment_date
    )
    
    fee_dict = fee_data.dict()
    fee_dict["valid_until"] = valid_until.strftime("%Y-%m-%d")
    fee_dict["receipt_image"] = receipt_image
    fee_obj = FeeCollection(**fee_dict)
    
    await db.fee_collections.insert_one(fee_obj.dict())
    
    # Update user status
    new_status = await calculate_user_status(fee_data.user_id)
    await db.users.update_one(
        {"id": fee_data.user_id},
        {"$set": {"status": new_status, "updated_at": datetime.utcnow()}}
    )
    
    return fee_obj

@api_router.get("/fee-collections", response_model=List[FeeCollection])
async def get_fee_collections(user_id: Optional[str] = None, username: str = Depends(verify_credentials)):
    query = {}
    if user_id:
        query["user_id"] = user_id
    
    fees = await db.fee_collections.find(query).sort("payment_date", -1).to_list(1000)
    return [FeeCollection(**fee) for fee in fees]

@api_router.get("/fee-collections/{fee_id}", response_model=FeeCollection)
async def get_fee_collection(fee_id: str, username: str = Depends(verify_credentials)):
    fee = await db.fee_collections.find_one({"id": fee_id})
    if not fee:
        raise HTTPException(status_code=404, detail="Fee collection not found")
    
    return FeeCollection(**fee)

# User status endpoints
@api_router.get("/users/{user_id}/status", response_model=UserStatus)
async def get_user_status(user_id: str, username: str = Depends(verify_credentials)):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    latest_fee = await db.fee_collections.find_one(
        {"user_id": user_id},
        sort=[("payment_date", -1)]
    )
    
    status = await calculate_user_status(user_id)
    
    user_status = UserStatus(
        user_id=user_id,
        status=status
    )
    
    if latest_fee:
        user_status.last_payment_date = latest_fee["payment_date"]
        valid_until = datetime.strptime(latest_fee["valid_until"], "%Y-%m-%d")
        now = datetime.now()
        
        if status == "Active":
            user_status.next_due_date = latest_fee["valid_until"]
        else:
            user_status.days_overdue = max(0, (now - valid_until).days)
    
    return user_status

# Dashboard/Stats endpoints
@api_router.get("/dashboard/stats")
async def get_dashboard_stats(username: str = Depends(verify_credentials)):
    total_users = await db.users.count_documents({})
    active_users = await db.users.count_documents({"status": "Active"})
    inactive_users = await db.users.count_documents({"status": "Inactive"})
    deactivated_users = await db.users.count_documents({"status": "Deactivated"})
    
    # Get recent fee collections (last 30 days)
    thirty_days_ago = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
    recent_collections = await db.fee_collections.count_documents({
        "payment_date": {"$gte": thirty_days_ago}
    })
    
    return {
        "total_users": total_users,
        "active_users": active_users,
        "inactive_users": inactive_users,
        "deactivated_users": deactivated_users,
        "recent_collections": recent_collections
    }

# Fee Summary endpoint
@api_router.get("/fee-summary", response_model=FeeSummary)
async def get_fee_summary(username: str = Depends(verify_credentials)):
    """Calculate monthly, quarterly, and yearly fee collection totals"""
    now = datetime.now()
    
    # Calculate date ranges
    current_month_start = datetime(now.year, now.month, 1)
    
    # For quarterly: last 3 months
    if now.month <= 3:
        quarter_start = datetime(now.year - 1, 10, 1)
    elif now.month <= 6:
        quarter_start = datetime(now.year, 1, 1)
    elif now.month <= 9:
        quarter_start = datetime(now.year, 4, 1)
    else:
        quarter_start = datetime(now.year, 7, 1)
    
    # For yearly: start of current year
    year_start = datetime(now.year, 1, 1)
    
    # Get all fee collections
    all_fees = await db.fee_collections.find({}).to_list(10000)
    
    # Calculate totals
    monthly_total = 0.0
    quarterly_total = 0.0
    yearly_total = 0.0
    
    for fee in all_fees:
        payment_date = datetime.strptime(fee['payment_date'], "%Y-%m-%d")
        amount = fee['amount']
        
        # Add to yearly total
        if payment_date >= year_start:
            yearly_total += amount
            
            # Add to quarterly total
            if payment_date >= quarter_start:
                quarterly_total += amount
                
                # Add to monthly total
                if payment_date >= current_month_start:
                    monthly_total += amount
    
    # Get total collections count
    total_collections = len(all_fees)
    
    # Get active members count
    active_members = await db.users.count_documents({"status": "Active"})
    
    return FeeSummary(
        monthly_total=monthly_total,
        quarterly_total=quarterly_total,
        yearly_total=yearly_total,
        total_collections=total_collections,
        total_active_members=active_members
    )

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()