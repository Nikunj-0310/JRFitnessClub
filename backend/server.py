from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
from collections import defaultdict


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


# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")  # Ignore MongoDB's _id field
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

# Member Models
class Member(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    phone: str
    membership_type: str  # e.g., "Basic", "Premium"
    monthly_fee: float
    joining_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MemberCreate(BaseModel):
    name: str
    phone: str
    membership_type: str
    monthly_fee: float

# Payment Models
class Payment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    member_id: str
    member_name: str
    amount: float
    payment_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    payment_type: str  # "monthly", "quarterly", "yearly"
    notes: Optional[str] = None

class PaymentCreate(BaseModel):
    member_id: str
    amount: float
    payment_date: Optional[datetime] = None
    payment_type: str = "monthly"
    notes: Optional[str] = None

# Fee Summary Model
class FeeSummary(BaseModel):
    monthly_total: float
    quarterly_total: float
    yearly_total: float
    total_members: int
    total_payments: int

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Fitness Admin API"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    
    # Convert to dict and serialize datetime to ISO string for MongoDB
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    # Exclude MongoDB's _id field from the query results
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    
    # Convert ISO string timestamps back to datetime objects
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    
    return status_checks

# Member Endpoints
@api_router.post("/members", response_model=Member)
async def create_member(input: MemberCreate):
    member_dict = input.model_dump()
    member_obj = Member(**member_dict)
    
    # Convert to dict and serialize datetime to ISO string for MongoDB
    doc = member_obj.model_dump()
    doc['joining_date'] = doc['joining_date'].isoformat()
    
    _ = await db.members.insert_one(doc)
    return member_obj

@api_router.get("/members", response_model=List[Member])
async def get_members():
    members = await db.members.find({}, {"_id": 0}).to_list(1000)
    
    # Convert ISO string timestamps back to datetime objects
    for member in members:
        if isinstance(member['joining_date'], str):
            member['joining_date'] = datetime.fromisoformat(member['joining_date'])
    
    return members

# Payment Endpoints
@api_router.post("/payments", response_model=Payment)
async def create_payment(input: PaymentCreate):
    # Get member details
    member = await db.members.find_one({"id": input.member_id}, {"_id": 0})
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    payment_dict = input.model_dump()
    if payment_dict['payment_date'] is None:
        payment_dict['payment_date'] = datetime.now(timezone.utc)
    
    payment_dict['member_name'] = member['name']
    payment_obj = Payment(**payment_dict)
    
    # Convert to dict and serialize datetime to ISO string for MongoDB
    doc = payment_obj.model_dump()
    doc['payment_date'] = doc['payment_date'].isoformat()
    
    _ = await db.payments.insert_one(doc)
    return payment_obj

@api_router.get("/payments", response_model=List[Payment])
async def get_payments():
    payments = await db.payments.find({}, {"_id": 0}).sort("payment_date", -1).to_list(1000)
    
    # Convert ISO string timestamps back to datetime objects
    for payment in payments:
        if isinstance(payment['payment_date'], str):
            payment['payment_date'] = datetime.fromisoformat(payment['payment_date'])
    
    return payments

# Fee Summary Endpoint
@api_router.get("/fee-summary", response_model=FeeSummary)
async def get_fee_summary():
    # Get current date
    now = datetime.now(timezone.utc)
    
    # Calculate date ranges
    current_month_start = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
    
    # For quarterly: last 3 months
    if now.month <= 3:
        quarter_start = datetime(now.year - 1, 10, 1, tzinfo=timezone.utc)
    elif now.month <= 6:
        quarter_start = datetime(now.year, 1, 1, tzinfo=timezone.utc)
    elif now.month <= 9:
        quarter_start = datetime(now.year, 4, 1, tzinfo=timezone.utc)
    else:
        quarter_start = datetime(now.year, 7, 1, tzinfo=timezone.utc)
    
    # For yearly: start of current year
    year_start = datetime(now.year, 1, 1, tzinfo=timezone.utc)
    
    # Get all payments
    payments = await db.payments.find({}, {"_id": 0}).to_list(10000)
    
    # Convert ISO strings to datetime and calculate totals
    monthly_total = 0.0
    quarterly_total = 0.0
    yearly_total = 0.0
    
    for payment in payments:
        if isinstance(payment['payment_date'], str):
            payment_date = datetime.fromisoformat(payment['payment_date'])
        else:
            payment_date = payment['payment_date']
        
        amount = payment['amount']
        
        # Add to yearly total
        if payment_date >= year_start:
            yearly_total += amount
            
            # Add to quarterly total
            if payment_date >= quarter_start:
                quarterly_total += amount
                
                # Add to monthly total
                if payment_date >= current_month_start:
                    monthly_total += amount
    
    # Get counts
    total_members = await db.members.count_documents({})
    total_payments = len(payments)
    
    return FeeSummary(
        monthly_total=monthly_total,
        quarterly_total=quarterly_total,
        yearly_total=yearly_total,
        total_members=total_members,
        total_payments=total_payments
    )

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
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