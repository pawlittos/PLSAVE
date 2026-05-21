"""BalansPLN backend API tests"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://budget-tracker-2608.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="session")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


# ----- Health -----
def test_health(s):
    r = s.get(f"{API}/")
    assert r.status_code == 200
    data = r.json()
    assert data.get("status") == "ok"


# ----- Categories -----
def test_categories_seeded(s):
    r = s.get(f"{API}/categories")
    assert r.status_code == 200
    cats = r.json()
    assert isinstance(cats, list)
    names = [c["name"] for c in cats]
    expected = ["Wynajem", "Zakupy", "Opłaty", "Subskrypcje", "Transport",
                "Rozrywka", "Zdrowie", "Jedzenie", "Inne"]
    for n in expected:
        assert n in names, f"Missing default category {n}"
    # no _id leak
    for c in cats:
        assert "_id" not in c


def test_category_create_and_delete(s):
    r = s.post(f"{API}/categories", json={"name": "TEST_Cat", "color": "#000", "icon": "Wallet"})
    assert r.status_code == 200
    c = r.json()
    assert c["name"] == "TEST_Cat"
    assert "_id" not in c
    cid = c["id"]
    # delete
    rd = s.delete(f"{API}/categories/{cid}")
    assert rd.status_code == 200
    # Confirm gone
    r2 = s.get(f"{API}/categories")
    assert cid not in [x["id"] for x in r2.json()]


# ----- Transactions -----
@pytest.fixture(scope="module")
def first_category_id(s):
    r = s.get(f"{API}/categories")
    return r.json()[0]["id"]


def test_transaction_create_list_delete(s, first_category_id):
    payload = {
        "type": "expense",
        "amount": 123.45,
        "category_id": first_category_id,
        "description": "TEST_tx",
        "date": "2026-01-15",
    }
    r = s.post(f"{API}/transactions", json=payload)
    assert r.status_code == 200
    tx = r.json()
    assert tx["amount"] == 123.45
    assert tx["type"] == "expense"
    assert tx["date"] == "2026-01-15"
    assert "_id" not in tx
    tx_id = tx["id"]
    # list by month
    r2 = s.get(f"{API}/transactions", params={"month": "2026-01"})
    assert r2.status_code == 200
    ids = [t["id"] for t in r2.json()]
    assert tx_id in ids
    # filter other month - should not include
    r3 = s.get(f"{API}/transactions", params={"month": "2025-07"})
    assert tx_id not in [t["id"] for t in r3.json()]
    # delete
    rd = s.delete(f"{API}/transactions/{tx_id}")
    assert rd.status_code == 200


def test_income_transaction(s):
    r = s.post(f"{API}/transactions", json={
        "type": "income", "amount": 5000, "description": "TEST_salary", "date": "2026-01-05"
    })
    assert r.status_code == 200
    tx = r.json()
    assert tx["type"] == "income"
    # cleanup
    s.delete(f"{API}/transactions/{tx['id']}")


# ----- Budgets -----
def test_budget_upsert(s, first_category_id):
    month = "2026-01"
    r = s.post(f"{API}/budgets", json={
        "category_id": first_category_id, "month": month, "amount": 1000.0
    })
    assert r.status_code == 200
    b1 = r.json()
    assert b1["amount"] == 1000.0
    assert "_id" not in b1
    bid = b1["id"]

    # upsert same -> same id, updated amount
    r2 = s.post(f"{API}/budgets", json={
        "category_id": first_category_id, "month": month, "amount": 1500.0
    })
    assert r2.status_code == 200
    b2 = r2.json()
    assert b2["amount"] == 1500.0
    assert b2["id"] == bid, "Upsert should reuse same id"

    # list
    rl = s.get(f"{API}/budgets", params={"month": month})
    assert rl.status_code == 200
    found = [b for b in rl.json() if b["id"] == bid]
    assert len(found) == 1 and found[0]["amount"] == 1500.0

    # delete
    rd = s.delete(f"{API}/budgets/{bid}")
    assert rd.status_code == 200


# ----- Recurring -----
def test_recurring_create_list_apply_idempotent_delete(s, first_category_id):
    r = s.post(f"{API}/recurring", json={
        "type": "expense", "amount": 250, "category_id": first_category_id,
        "description": "TEST_subscription", "day_of_month": 5
    })
    assert r.status_code == 200
    rec = r.json()
    assert "_id" not in rec
    rid = rec["id"]

    # list
    rl = s.get(f"{API}/recurring")
    assert rid in [x["id"] for x in rl.json()]

    # apply for month -> should create at least 1
    month = "2026-02"
    ra1 = s.post(f"{API}/recurring/apply", params={"month": month})
    assert ra1.status_code == 200
    body1 = ra1.json()
    assert body1["month"] == month
    created1 = body1["created"]
    assert created1 >= 1

    # apply again - idempotent, should NOT recreate
    ra2 = s.post(f"{API}/recurring/apply", params={"month": month})
    assert ra2.status_code == 200
    body2 = ra2.json()
    # For our recurring rid, last_applied_month==month so should be skipped.
    # But there may be other recurring rules - count txs with TEST_subscription
    tx_list = s.get(f"{API}/transactions", params={"month": month}).json()
    matches = [t for t in tx_list if t.get("description") == "TEST_subscription"]
    assert len(matches) == 1, f"Idempotency broken: {len(matches)} TEST_subscription txs"

    # cleanup txs
    for t in matches:
        s.delete(f"{API}/transactions/{t['id']}")
    # delete recurring
    rd = s.delete(f"{API}/recurring/{rid}")
    assert rd.status_code == 200


# ----- Summary & Trend -----
def test_summary(s, first_category_id):
    # seed
    t1 = s.post(f"{API}/transactions", json={"type": "income", "amount": 1000, "date": "2026-03-01"}).json()
    t2 = s.post(f"{API}/transactions", json={"type": "expense", "amount": 200, "category_id": first_category_id, "date": "2026-03-02"}).json()
    t3 = s.post(f"{API}/transactions", json={"type": "expense", "amount": 50, "category_id": first_category_id, "date": "2026-03-03"}).json()

    r = s.get(f"{API}/summary", params={"month": "2026-03"})
    assert r.status_code == 200
    data = r.json()
    assert data["month"] == "2026-03"
    assert data["income"] >= 1000
    assert data["expenses"] >= 250
    assert data["balance"] == round(data["income"] - data["expenses"], 2)
    assert any(b["category_id"] == first_category_id for b in data["breakdown"])

    for t in (t1, t2, t3):
        s.delete(f"{API}/transactions/{t['id']}")


def test_trend(s):
    r = s.get(f"{API}/trend", params={"months": 6})
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) == 6
    for row in data:
        assert "month" in row and "income" in row and "expenses" in row


# ----- AI Chat -----
def test_ai_clear_then_chat_history(s):
    # Clear history first
    rc = s.delete(f"{API}/ai/messages")
    assert rc.status_code == 200

    # send chat (may take time)
    r = s.post(f"{API}/ai/chat", json={"message": "Cześć, jak mogę zaoszczędzić?", "month": "2026-01"}, timeout=60)
    assert r.status_code == 200, f"AI chat failed: {r.text}"
    msg = r.json()
    assert msg["role"] == "assistant"
    assert len(msg["content"]) > 0
    assert "_id" not in msg

    # history
    rh = s.get(f"{API}/ai/messages")
    assert rh.status_code == 200
    hist = rh.json()
    # Should contain at least the user msg + assistant msg, sorted ASC
    assert len(hist) >= 2
    # Sorted ascending by created_at
    times = [m["created_at"] for m in hist]
    assert times == sorted(times)
    # first should be user
    assert hist[0]["role"] == "user"
    # cleanup
    s.delete(f"{API}/ai/messages")
