from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone, date
from collections import defaultdict

from emergentintegrations.llm.chat import LlmChat, UserMessage

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

app = FastAPI(title="BalansPLN API")
api_router = APIRouter(prefix="/api")

# ---------- Models ----------

class Category(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    color: str = "#1E3A2F"
    icon: str = "Wallet"
    is_default: bool = False

class CategoryCreate(BaseModel):
    name: str
    color: str = "#1E3A2F"
    icon: str = "Wallet"

class Transaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: Literal["income", "expense"]
    amount: float
    category_id: Optional[str] = None
    description: str = ""
    date: str  # YYYY-MM-DD
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class TransactionCreate(BaseModel):
    type: Literal["income", "expense"]
    amount: float
    category_id: Optional[str] = None
    description: str = ""
    date: Optional[str] = None  # default today

class Budget(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    category_id: str
    month: str  # YYYY-MM
    amount: float

class BudgetCreate(BaseModel):
    category_id: str
    month: str
    amount: float

class Recurring(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: Literal["income", "expense"]
    amount: float
    category_id: Optional[str] = None
    description: str = ""
    day_of_month: int = 1
    active: bool = True
    last_applied_month: Optional[str] = None  # YYYY-MM

class RecurringCreate(BaseModel):
    type: Literal["income", "expense"]
    amount: float
    category_id: Optional[str] = None
    description: str = ""
    day_of_month: int = 1

class AIMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    role: Literal["user", "assistant"]
    content: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class AIChatRequest(BaseModel):
    message: str
    month: Optional[str] = None  # YYYY-MM context


# ---------- Helpers ----------

DEFAULT_CATEGORIES = [
    {"name": "Wynajem", "color": "#1E3A2F", "icon": "House"},
    {"name": "Zakupy", "color": "#E07A5F", "icon": "ShoppingBag"},
    {"name": "Opłaty", "color": "#F2CC8F", "icon": "Lightning"},
    {"name": "Subskrypcje", "color": "#3E5743", "icon": "Television"},
    {"name": "Transport", "color": "#B84A43", "icon": "Car"},
    {"name": "Rozrywka", "color": "#8B5A2B", "icon": "MusicNote"},
    {"name": "Zdrowie", "color": "#2B4C3B", "icon": "Heartbeat"},
    {"name": "Jedzenie", "color": "#D06A4F", "icon": "ForkKnife"},
    {"name": "Inne", "color": "#6E6B68", "icon": "DotsThree"},
]

async def seed_categories():
    count = await db.categories.count_documents({})
    if count == 0:
        for c in DEFAULT_CATEGORIES:
            cat = Category(name=c["name"], color=c["color"], icon=c["icon"], is_default=True)
            await db.categories.insert_one(cat.model_dump())

def today_str():
    return datetime.now(timezone.utc).date().isoformat()

def current_month():
    return datetime.now(timezone.utc).strftime("%Y-%m")


# ---------- Categories ----------

@api_router.get("/categories", response_model=List[Category])
async def list_categories():
    docs = await db.categories.find({}, {"_id": 0}).to_list(1000)
    return docs

@api_router.post("/categories", response_model=Category)
async def create_category(payload: CategoryCreate):
    cat = Category(**payload.model_dump())
    await db.categories.insert_one(cat.model_dump())
    return cat

@api_router.delete("/categories/{cat_id}")
async def delete_category(cat_id: str):
    res = await db.categories.delete_one({"id": cat_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "Category not found")
    return {"ok": True}


# ---------- Transactions ----------

@api_router.get("/transactions", response_model=List[Transaction])
async def list_transactions(month: Optional[str] = None, limit: int = 500):
    query = {}
    if month:
        query = {"date": {"$regex": f"^{month}"}}
    docs = await db.transactions.find(query, {"_id": 0}).sort("date", -1).to_list(limit)
    return docs

@api_router.post("/transactions", response_model=Transaction)
async def create_transaction(payload: TransactionCreate):
    data = payload.model_dump()
    if not data.get("date"):
        data["date"] = today_str()
    tx = Transaction(**data)
    await db.transactions.insert_one(tx.model_dump())
    return tx

@api_router.delete("/transactions/{tx_id}")
async def delete_transaction(tx_id: str):
    res = await db.transactions.delete_one({"id": tx_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "Transaction not found")
    return {"ok": True}


# ---------- Budgets ----------

@api_router.get("/budgets", response_model=List[Budget])
async def list_budgets(month: Optional[str] = None):
    query = {"month": month} if month else {}
    docs = await db.budgets.find(query, {"_id": 0}).to_list(500)
    return docs

@api_router.post("/budgets", response_model=Budget)
async def upsert_budget(payload: BudgetCreate):
    existing = await db.budgets.find_one(
        {"category_id": payload.category_id, "month": payload.month},
        {"_id": 0},
    )
    if existing:
        await db.budgets.update_one(
            {"id": existing["id"]}, {"$set": {"amount": payload.amount}}
        )
        existing["amount"] = payload.amount
        return existing
    b = Budget(**payload.model_dump())
    await db.budgets.insert_one(b.model_dump())
    return b

@api_router.delete("/budgets/{budget_id}")
async def delete_budget(budget_id: str):
    res = await db.budgets.delete_one({"id": budget_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "Budget not found")
    return {"ok": True}


# ---------- Recurring ----------

@api_router.get("/recurring", response_model=List[Recurring])
async def list_recurring():
    docs = await db.recurring.find({}, {"_id": 0}).to_list(500)
    return docs

@api_router.post("/recurring", response_model=Recurring)
async def create_recurring(payload: RecurringCreate):
    r = Recurring(**payload.model_dump())
    await db.recurring.insert_one(r.model_dump())
    return r

@api_router.delete("/recurring/{rec_id}")
async def delete_recurring(rec_id: str):
    res = await db.recurring.delete_one({"id": rec_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "Not found")
    return {"ok": True}

@api_router.post("/recurring/apply")
async def apply_recurring(month: Optional[str] = None):
    target_month = month or current_month()
    items = await db.recurring.find({"active": True}, {"_id": 0}).to_list(500)
    created = 0
    for item in items:
        if item.get("last_applied_month") == target_month:
            continue
        day = min(max(int(item.get("day_of_month", 1)), 1), 28)
        date_str = f"{target_month}-{day:02d}"
        tx = Transaction(
            type=item["type"],
            amount=float(item["amount"]),
            category_id=item.get("category_id"),
            description=item.get("description", "") or "Powtarzające się",
            date=date_str,
        )
        await db.transactions.insert_one(tx.model_dump())
        await db.recurring.update_one(
            {"id": item["id"]}, {"$set": {"last_applied_month": target_month}}
        )
        created += 1
    return {"created": created, "month": target_month}


# ---------- Summary & Trend ----------

@api_router.get("/summary")
async def summary(month: Optional[str] = None):
    target = month or current_month()
    txs = await db.transactions.find(
        {"date": {"$regex": f"^{target}"}}, {"_id": 0}
    ).to_list(2000)
    income = sum(t["amount"] for t in txs if t["type"] == "income")
    expenses = sum(t["amount"] for t in txs if t["type"] == "expense")

    breakdown = defaultdict(float)
    for t in txs:
        if t["type"] == "expense":
            key = t.get("category_id") or "uncategorized"
            breakdown[key] += t["amount"]

    return {
        "month": target,
        "income": round(income, 2),
        "expenses": round(expenses, 2),
        "balance": round(income - expenses, 2),
        "transactions_count": len(txs),
        "breakdown": [{"category_id": k, "amount": round(v, 2)} for k, v in breakdown.items()],
    }

@api_router.get("/trend")
async def trend(months: int = 6):
    now = datetime.now(timezone.utc)
    result = []
    for i in range(months - 1, -1, -1):
        y = now.year
        m = now.month - i
        while m <= 0:
            m += 12
            y -= 1
        target = f"{y:04d}-{m:02d}"
        txs = await db.transactions.find(
            {"date": {"$regex": f"^{target}"}}, {"_id": 0}
        ).to_list(2000)
        income = sum(t["amount"] for t in txs if t["type"] == "income")
        expenses = sum(t["amount"] for t in txs if t["type"] == "expense")
        result.append({
            "month": target,
            "income": round(income, 2),
            "expenses": round(expenses, 2),
        })
    return result


# ---------- AI Chat ----------

@api_router.get("/ai/messages", response_model=List[AIMessage])
async def list_ai_messages(limit: int = 100):
    docs = await db.ai_messages.find({}, {"_id": 0}).sort("created_at", 1).to_list(limit)
    return docs

@api_router.delete("/ai/messages")
async def clear_ai_messages():
    await db.ai_messages.delete_many({})
    return {"ok": True}

@api_router.post("/ai/chat", response_model=AIMessage)
async def ai_chat(payload: AIChatRequest):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(500, "EMERGENT_LLM_KEY not configured")

    target = payload.month or current_month()

    # Build context: current month summary + categories + recurring + budgets
    cats = await db.categories.find({}, {"_id": 0}).to_list(500)
    cat_map = {c["id"]: c["name"] for c in cats}

    txs = await db.transactions.find(
        {"date": {"$regex": f"^{target}"}}, {"_id": 0}
    ).to_list(2000)
    income = sum(t["amount"] for t in txs if t["type"] == "income")
    expenses = sum(t["amount"] for t in txs if t["type"] == "expense")

    by_cat = defaultdict(float)
    for t in txs:
        if t["type"] == "expense":
            by_cat[cat_map.get(t.get("category_id"), "Inne")] += t["amount"]

    breakdown_str = ", ".join(
        f"{k}: {v:.2f} zł" for k, v in sorted(by_cat.items(), key=lambda x: -x[1])
    ) or "brak wydatków"

    budgets = await db.budgets.find({"month": target}, {"_id": 0}).to_list(500)
    budget_lines = []
    for b in budgets:
        cat_name = cat_map.get(b["category_id"], "Inne")
        spent = by_cat.get(cat_name, 0.0)
        budget_lines.append(f"{cat_name}: {spent:.2f}/{b['amount']:.2f} zł")
    budgets_str = "; ".join(budget_lines) or "brak budżetów"

    recurring = await db.recurring.find({"active": True}, {"_id": 0}).to_list(200)
    rec_str = ", ".join(
        f"{r['description'] or cat_map.get(r.get('category_id'),'')} ({r['amount']:.2f} zł, dzień {r['day_of_month']})"
        for r in recurring
    ) or "brak"

    system_msg = (
        "Jesteś przyjaznym, konkretnym polskim doradcą finansowym dla osoby prywatnej. "
        "Odpowiadaj zawsze po polsku, krótko (2-5 zdań chyba że użytkownik prosi o więcej), "
        "konkretnie i z empatią. Używaj waluty PLN (zł). Bazuj swoje rady na danych użytkownika "
        "podanych poniżej. Proponuj realne, wykonalne oszczędności. Jeśli brak danych — pytaj o szczegóły.\n\n"
        f"== Dane finansowe użytkownika za miesiąc {target} ==\n"
        f"Przychody: {income:.2f} zł\n"
        f"Wydatki: {expenses:.2f} zł\n"
        f"Saldo: {income - expenses:.2f} zł\n"
        f"Wydatki wg kategorii: {breakdown_str}\n"
        f"Budżety (wydane/limit): {budgets_str}\n"
        f"Stałe wydatki/przychody: {rec_str}\n"
    )

    # Persist user message
    user_msg = AIMessage(role="user", content=payload.message)
    await db.ai_messages.insert_one(user_msg.model_dump())

    # Build LLM chat with session id (single user app)
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id="balans-main-session",
        system_message=system_msg,
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")

    try:
        reply_text = await chat.send_message(UserMessage(text=payload.message))
    except Exception as e:
        logger.exception("AI chat failed")
        raise HTTPException(500, f"AI error: {e}")

    ai_msg = AIMessage(role="assistant", content=str(reply_text))
    await db.ai_messages.insert_one(ai_msg.model_dump())
    return ai_msg


# ---------- Health ----------

@api_router.get("/")
async def root():
    return {"status": "ok", "app": "BalansPLN"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def on_startup():
    await seed_categories()
    logger.info("Categories seeded if empty.")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
