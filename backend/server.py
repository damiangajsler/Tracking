"""Linkly — Link Tracking SaaS backend."""
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, Cookie, Header
from fastapi.responses import RedirectResponse, JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import string
import random
import re
import httpx
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta

from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout,
    CheckoutSessionRequest,
    CheckoutStatusResponse,
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

STRIPE_API_KEY = os.environ.get("STRIPE_API_KEY", "sk_test_emergent")
EMERGENT_AUTH_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"

app = FastAPI(title="Linkly API")
api_router = APIRouter(prefix="/api")

# ---------- Subscription Plans (server-side source of truth) ----------
PLANS: Dict[str, Dict[str, Any]] = {
    "free": {"id": "free", "name": "Free", "price": 0.0, "clicks": 100, "features": ["100 clicks/mo", "1 campaign", "Basic analytics"]},
    "starter": {"id": "starter", "name": "Starter", "price": 29.0, "clicks": 10000, "features": ["10k clicks/mo", "5 campaigns", "Conversion goals", "Email support"]},
    "pro": {"id": "pro", "name": "Pro", "price": 79.0, "clicks": 100000, "features": ["100k clicks/mo", "Unlimited campaigns", "Fraud detection", "Priority support", "API access"]},
    "business": {"id": "business", "name": "Business", "price": 179.0, "clicks": 1000000, "features": ["1M clicks/mo", "Unlimited everything", "Team seats", "Custom domains", "Dedicated support"]},
}

# ---------- Models ----------
class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    plan: str = "free"
    created_at: datetime

class Project(BaseModel):
    project_id: str
    user_id: str
    name: str
    description: Optional[str] = ""
    created_at: datetime

class Link(BaseModel):
    link_id: str
    user_id: str
    project_id: Optional[str] = None
    code: str
    destination: str
    title: Optional[str] = ""
    utm_source: Optional[str] = ""
    utm_medium: Optional[str] = ""
    utm_campaign: Optional[str] = ""
    clicks: int = 0
    conversions: int = 0
    created_at: datetime

class Goal(BaseModel):
    goal_id: str
    user_id: str
    name: str
    value: float = 0.0
    project_id: Optional[str] = None
    conversions: int = 0
    created_at: datetime

# ---------- Helpers ----------
def now_utc():
    return datetime.now(timezone.utc)

def iso(dt):
    if isinstance(dt, datetime):
        return dt.isoformat()
    return dt

def rand_code(n=7):
    return "".join(random.choices(string.ascii_letters + string.digits, k=n))

async def get_current_user(
    request: Request,
    session_token: Optional[str] = Cookie(None),
    authorization: Optional[str] = Header(None),
) -> User:
    token = session_token
    if not token and authorization and authorization.startswith("Bearer "):
        token = authorization.replace("Bearer ", "", 1)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    sess = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not sess:
        raise HTTPException(status_code=401, detail="Invalid session")
    exp = sess["expires_at"]
    if isinstance(exp, str):
        exp = datetime.fromisoformat(exp)
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp < now_utc():
        raise HTTPException(status_code=401, detail="Session expired")
    user = await db.users.find_one({"user_id": sess["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if isinstance(user.get("created_at"), str):
        user["created_at"] = datetime.fromisoformat(user["created_at"])
    return User(**user)

def detect_device(ua: str) -> str:
    ua = (ua or "").lower()
    if "mobile" in ua or "android" in ua or "iphone" in ua:
        return "Mobile"
    if "tablet" in ua or "ipad" in ua:
        return "Tablet"
    return "Desktop"

def detect_browser(ua: str) -> str:
    ua = (ua or "").lower()
    if "edg/" in ua: return "Edge"
    if "chrome/" in ua: return "Chrome"
    if "safari/" in ua: return "Safari"
    if "firefox/" in ua: return "Firefox"
    return "Other"

def detect_os(ua: str) -> str:
    ua = (ua or "").lower()
    if "windows" in ua: return "Windows"
    if "mac os" in ua or "macintosh" in ua: return "macOS"
    if "android" in ua: return "Android"
    if "iphone" in ua or "ipad" in ua or "ios" in ua: return "iOS"
    if "linux" in ua: return "Linux"
    return "Other"

async def geo_lookup(ip: str) -> str:
    if not ip or ip.startswith(("127.", "10.", "192.168.", "172.")):
        return "Local"
    try:
        async with httpx.AsyncClient(timeout=2.0) as hx:
            r = await hx.get(f"https://ipapi.co/{ip}/country_name/")
            if r.status_code == 200:
                t = r.text.strip()
                if t and "error" not in t.lower() and len(t) < 60:
                    return t
    except Exception:
        pass
    return "Unknown"

def fraud_score(ua: str, ip: str, referrer: str) -> int:
    score = 0
    ua_l = (ua or "").lower()
    if not ua: score += 40
    for bot in ["bot", "crawler", "spider", "curl", "wget", "python", "headless"]:
        if bot in ua_l:
            score += 35
            break
    if not referrer: score += 10
    if ip and ip.startswith(("10.", "172.", "192.168.")): score += 5
    return min(score, 100)

# ---------- Auth Routes ----------
@api_router.post("/auth/session")
async def create_session(payload: Dict[str, str], response: Response):
    """Exchange session_id (from Emergent Auth hash) for app session cookie."""
    session_id = payload.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    async with httpx.AsyncClient(timeout=10.0) as hx:
        r = await hx.get(EMERGENT_AUTH_URL, headers={"X-Session-ID": session_id})
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid session_id")
    data = r.json()
    email = data["email"]
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": data.get("name", existing.get("name")), "picture": data.get("picture", existing.get("picture"))}}
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": data.get("name", ""),
            "picture": data.get("picture", ""),
            "plan": "free",
            "created_at": now_utc().isoformat(),
        })
    session_token = data["session_token"]
    expires_at = now_utc() + timedelta(days=7)
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": now_utc().isoformat(),
    })
    response.set_cookie(
        key="session_token", value=session_token, httponly=True, secure=True,
        samesite="none", path="/", max_age=7 * 24 * 60 * 60,
    )
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return {"user": user_doc}

@api_router.get("/auth/me")
async def auth_me(user: User = Depends(get_current_user)):
    return user.model_dump()

@api_router.post("/auth/logout")
async def logout(response: Response, session_token: Optional[str] = Cookie(None), authorization: Optional[str] = Header(None)):
    token = session_token or (authorization.replace("Bearer ", "", 1) if authorization else None)
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    response.delete_cookie("session_token", path="/")
    return {"ok": True}

# ---------- Projects ----------
@api_router.get("/projects")
async def list_projects(user: User = Depends(get_current_user)):
    items = await db.projects.find({"user_id": user.user_id}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return items

@api_router.post("/projects")
async def create_project(body: Dict[str, str], user: User = Depends(get_current_user)):
    p = {
        "project_id": f"prj_{uuid.uuid4().hex[:10]}",
        "user_id": user.user_id,
        "name": body.get("name", "Untitled"),
        "description": body.get("description", ""),
        "created_at": now_utc().isoformat(),
    }
    await db.projects.insert_one(p.copy())
    return p

@api_router.delete("/projects/{project_id}")
async def delete_project(project_id: str, user: User = Depends(get_current_user)):
    await db.projects.delete_one({"project_id": project_id, "user_id": user.user_id})
    return {"ok": True}

# ---------- Links ----------
@api_router.get("/links")
async def list_links(user: User = Depends(get_current_user)):
    items = await db.links.find({"user_id": user.user_id}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return items

@api_router.post("/links")
async def create_link(body: Dict[str, Any], user: User = Depends(get_current_user)):
    dest = body.get("destination", "").strip()
    if not dest.startswith(("http://", "https://")):
        dest = "https://" + dest
    code = body.get("code") or rand_code()
    while await db.links.find_one({"code": code}):
        code = rand_code()
    link = {
        "link_id": f"lnk_{uuid.uuid4().hex[:10]}",
        "user_id": user.user_id,
        "project_id": body.get("project_id"),
        "code": code,
        "destination": dest,
        "title": body.get("title", ""),
        "utm_source": body.get("utm_source", ""),
        "utm_medium": body.get("utm_medium", ""),
        "utm_campaign": body.get("utm_campaign", ""),
        "clicks": 0,
        "conversions": 0,
        "created_at": now_utc().isoformat(),
    }
    await db.links.insert_one(link.copy())
    return link

@api_router.delete("/links/{link_id}")
async def delete_link(link_id: str, user: User = Depends(get_current_user)):
    await db.links.delete_one({"link_id": link_id, "user_id": user.user_id})
    await db.clicks.delete_many({"link_id": link_id})
    return {"ok": True}

@api_router.get("/links/{link_id}/clicks")
async def link_clicks(link_id: str, user: User = Depends(get_current_user)):
    link = await db.links.find_one({"link_id": link_id, "user_id": user.user_id}, {"_id": 0})
    if not link:
        raise HTTPException(404, "Not found")
    clicks = await db.clicks.find({"link_id": link_id}, {"_id": 0}).sort("created_at", -1).limit(500).to_list(500)
    return {"link": link, "clicks": clicks}

# ---------- Redirect endpoint (tracking) ----------
@api_router.get("/r/{code}")
async def redirect_link(code: str, request: Request):
    link = await db.links.find_one({"code": code}, {"_id": 0})
    if not link:
        raise HTTPException(404, "Link not found")
    ua = request.headers.get("user-agent", "")
    ref = request.headers.get("referer", "")
    xff = request.headers.get("x-forwarded-for", "")
    ip = xff.split(",")[0].strip() if xff else (request.client.host if request.client else "")
    country = await geo_lookup(ip)
    fs = fraud_score(ua, ip, ref)
    click = {
        "click_id": f"clk_{uuid.uuid4().hex[:12]}",
        "link_id": link["link_id"],
        "user_id": link["user_id"],
        "project_id": link.get("project_id"),
        "ip": ip,
        "country": country,
        "device": detect_device(ua),
        "browser": detect_browser(ua),
        "os": detect_os(ua),
        "referrer": ref or "(direct)",
        "user_agent": ua[:250],
        "utm_source": link.get("utm_source", ""),
        "utm_medium": link.get("utm_medium", ""),
        "utm_campaign": link.get("utm_campaign", ""),
        "fraud_score": fs,
        "is_suspicious": fs >= 60,
        "created_at": now_utc().isoformat(),
    }
    await db.clicks.insert_one(click.copy())
    await db.links.update_one({"link_id": link["link_id"]}, {"$inc": {"clicks": 1}})
    # Append UTMs to destination
    dest = link["destination"]
    utm_params = []
    for k in ["utm_source", "utm_medium", "utm_campaign"]:
        if link.get(k):
            utm_params.append(f"{k}={link[k]}")
    if utm_params:
        sep = "&" if "?" in dest else "?"
        dest = f"{dest}{sep}{'&'.join(utm_params)}&lk_click={click['click_id']}"
    else:
        sep = "&" if "?" in dest else "?"
        dest = f"{dest}{sep}lk_click={click['click_id']}"
    return RedirectResponse(url=dest, status_code=302)

# ---------- Goals ----------
@api_router.get("/goals")
async def list_goals(user: User = Depends(get_current_user)):
    items = await db.goals.find({"user_id": user.user_id}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return items

@api_router.post("/goals")
async def create_goal(body: Dict[str, Any], user: User = Depends(get_current_user)):
    g = {
        "goal_id": f"goal_{uuid.uuid4().hex[:10]}",
        "user_id": user.user_id,
        "name": body.get("name", "Goal"),
        "value": float(body.get("value", 0)),
        "project_id": body.get("project_id"),
        "conversions": 0,
        "created_at": now_utc().isoformat(),
    }
    await db.goals.insert_one(g.copy())
    return g

@api_router.delete("/goals/{goal_id}")
async def delete_goal(goal_id: str, user: User = Depends(get_current_user)):
    await db.goals.delete_one({"goal_id": goal_id, "user_id": user.user_id})
    return {"ok": True}

@api_router.post("/track/conversion")
async def track_conversion(body: Dict[str, Any]):
    """Public endpoint — called via pixel/JS after a conversion."""
    click_id = body.get("click_id")
    goal_id = body.get("goal_id")
    value = float(body.get("value", 0))
    if not click_id:
        raise HTTPException(400, "click_id required")
    click = await db.clicks.find_one({"click_id": click_id}, {"_id": 0})
    if not click:
        raise HTTPException(404, "click not found")
    goal = None
    if goal_id:
        goal = await db.goals.find_one({"goal_id": goal_id}, {"_id": 0})
    conv = {
        "conversion_id": f"cnv_{uuid.uuid4().hex[:12]}",
        "click_id": click_id,
        "link_id": click["link_id"],
        "user_id": click["user_id"],
        "goal_id": goal_id,
        "value": value or (goal["value"] if goal else 0.0),
        "country": click.get("country"),
        "device": click.get("device"),
        "created_at": now_utc().isoformat(),
    }
    await db.conversions.insert_one(conv.copy())
    await db.links.update_one({"link_id": click["link_id"]}, {"$inc": {"conversions": 1}})
    if goal_id:
        await db.goals.update_one({"goal_id": goal_id}, {"$inc": {"conversions": 1}})
    return {"ok": True, "conversion_id": conv["conversion_id"]}

# ---------- Analytics ----------
@api_router.get("/analytics/overview")
async def analytics_overview(days: int = 30, user: User = Depends(get_current_user)):
    cutoff = (now_utc() - timedelta(days=days)).isoformat()
    clicks = await db.clicks.find({"user_id": user.user_id, "created_at": {"$gte": cutoff}}, {"_id": 0}).to_list(100000)
    convs = await db.conversions.find({"user_id": user.user_id, "created_at": {"$gte": cutoff}}, {"_id": 0}).to_list(100000)
    total_clicks = len(clicks)
    unique_ips = len({c["ip"] for c in clicks if c.get("ip")})
    total_convs = len(convs)
    total_revenue = sum(c.get("value", 0) for c in convs)
    suspicious = sum(1 for c in clicks if c.get("is_suspicious"))
    clean_clicks = total_clicks - suspicious
    conv_rate = (total_convs / total_clicks * 100) if total_clicks else 0
    cpa = 0.0
    cpc = 0.0
    avg_goal = (total_revenue / total_convs) if total_convs else 0.0
    # time series
    series: Dict[str, Dict[str, int]] = {}
    for i in range(days):
        d = (now_utc() - timedelta(days=days - 1 - i)).strftime("%Y-%m-%d")
        series[d] = {"date": d, "visits": 0, "conversions": 0}
    for c in clicks:
        d = (c.get("created_at") or "")[:10]
        if d in series:
            series[d]["visits"] += 1
    for c in convs:
        d = (c.get("created_at") or "")[:10]
        if d in series:
            series[d]["conversions"] += 1
    # breakdowns
    by_country: Dict[str, int] = {}
    by_device: Dict[str, int] = {}
    by_ref: Dict[str, int] = {}
    for c in clicks:
        by_country[c.get("country", "Unknown")] = by_country.get(c.get("country", "Unknown"), 0) + 1
        by_device[c.get("device", "Other")] = by_device.get(c.get("device", "Other"), 0) + 1
        r = c.get("referrer", "(direct)") or "(direct)"
        # host only
        m = re.match(r"^https?://([^/]+)", r)
        host = m.group(1) if m else r
        by_ref[host] = by_ref.get(host, 0) + 1
    return {
        "kpis": {
            "people": unique_ips,
            "visits": total_clicks,
            "conversions": total_convs,
            "conversion_rate": round(conv_rate, 2),
            "cost": round(cpa * total_convs, 2),
            "cpa": round(cpa, 2),
            "cpc": round(cpc, 2),
            "revenue": round(total_revenue, 2),
            "avg_goal_value": round(avg_goal, 2),
            "suspicious_clicks": suspicious,
            "clean_clicks": clean_clicks,
        },
        "series": list(series.values()),
        "by_country": sorted([{"name": k, "value": v} for k, v in by_country.items()], key=lambda x: -x["value"])[:10],
        "by_device": [{"name": k, "value": v} for k, v in by_device.items()],
        "by_referrer": sorted([{"name": k, "value": v} for k, v in by_ref.items()], key=lambda x: -x["value"])[:10],
    }

@api_router.get("/analytics/recent-clicks")
async def recent_clicks(limit: int = 50, user: User = Depends(get_current_user)):
    items = await db.clicks.find({"user_id": user.user_id}, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return items

# ---------- Payments / Subscriptions ----------
@api_router.get("/plans")
async def get_plans():
    return list(PLANS.values())

class CheckoutBody(BaseModel):
    plan_id: str
    origin_url: str

@api_router.post("/payments/checkout")
async def create_checkout(body: CheckoutBody, request: Request, user: User = Depends(get_current_user)):
    if body.plan_id not in PLANS or body.plan_id == "free":
        raise HTTPException(400, "Invalid plan")
    plan = PLANS[body.plan_id]
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    sc = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    origin = body.origin_url.rstrip("/")
    success_url = f"{origin}/billing?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/pricing"
    req = CheckoutSessionRequest(
        amount=float(plan["price"]),
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={"user_id": user.user_id, "plan_id": body.plan_id, "email": user.email},
    )
    session = await sc.create_checkout_session(req)
    await db.payment_transactions.insert_one({
        "session_id": session.session_id,
        "user_id": user.user_id,
        "email": user.email,
        "plan_id": body.plan_id,
        "amount": float(plan["price"]),
        "currency": "usd",
        "payment_status": "initiated",
        "status": "open",
        "metadata": {"plan_id": body.plan_id, "user_id": user.user_id},
        "created_at": now_utc().isoformat(),
    })
    return {"url": session.url, "session_id": session.session_id}

@api_router.get("/payments/status/{session_id}")
async def payment_status(session_id: str, request: Request, user: User = Depends(get_current_user)):
    tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not tx:
        raise HTTPException(404, "Transaction not found")
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    sc = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    status: CheckoutStatusResponse = await sc.get_checkout_status(session_id)
    if status.payment_status == "paid" and tx.get("payment_status") != "paid":
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"payment_status": "paid", "status": status.status, "paid_at": now_utc().isoformat()}},
        )
        await db.users.update_one({"user_id": tx["user_id"]}, {"$set": {"plan": tx["plan_id"]}})
    else:
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"payment_status": status.payment_status, "status": status.status}},
        )
    return {
        "status": status.status,
        "payment_status": status.payment_status,
        "amount_total": status.amount_total,
        "currency": status.currency,
        "plan_id": tx.get("plan_id"),
    }

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    sig = request.headers.get("Stripe-Signature", "")
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    sc = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    try:
        evt = await sc.handle_webhook(body, sig)
    except Exception as e:
        return JSONResponse({"ok": False, "error": str(e)}, status_code=400)
    if evt.payment_status == "paid" and evt.session_id:
        tx = await db.payment_transactions.find_one({"session_id": evt.session_id}, {"_id": 0})
        if tx and tx.get("payment_status") != "paid":
            await db.payment_transactions.update_one(
                {"session_id": evt.session_id},
                {"$set": {"payment_status": "paid", "status": "complete", "paid_at": now_utc().isoformat()}},
            )
            await db.users.update_one({"user_id": tx["user_id"]}, {"$set": {"plan": tx["plan_id"]}})
    return {"ok": True}

@api_router.get("/")
async def root():
    return {"service": "Linkly API", "status": "ok"}

# ---------- Seed demo data for current user ----------
@api_router.post("/seed-demo")
async def seed_demo(user: User = Depends(get_current_user)):
    """Populate the current user with sample projects, links, goals, and clicks for a nice first impression."""
    # clear existing seed (idempotent-ish)
    await db.projects.delete_many({"user_id": user.user_id, "seed": True})
    await db.links.delete_many({"user_id": user.user_id, "seed": True})
    await db.goals.delete_many({"user_id": user.user_id, "seed": True})
    await db.clicks.delete_many({"user_id": user.user_id, "seed": True})
    await db.conversions.delete_many({"user_id": user.user_id, "seed": True})

    projects = []
    for name, desc in [("Spring Campaign", "Q2 paid acquisition"), ("Newsletter", "Email CTAs"), ("Product Hunt Launch", "Launch day referrals")]:
        p = {
            "project_id": f"prj_{uuid.uuid4().hex[:10]}",
            "user_id": user.user_id,
            "name": name, "description": desc,
            "created_at": now_utc().isoformat(),
            "seed": True,
        }
        await db.projects.insert_one(p.copy())
        projects.append(p)

    links_created = []
    samples = [
        ("Homepage CTA", "https://example.com/signup", "google", "cpc", "spring-2026"),
        ("Pricing Page", "https://example.com/pricing", "twitter", "social", "launch"),
        ("Blog Post Share", "https://example.com/blog/seo-tips", "newsletter", "email", "weekly-digest"),
        ("YouTube Description", "https://example.com/demo", "youtube", "video", "demo"),
        ("Affiliate Partner A", "https://example.com/ref/a", "partner-a", "affiliate", "partners"),
    ]
    for i, (title, dest, s, m, c) in enumerate(samples):
        code = rand_code()
        lk = {
            "link_id": f"lnk_{uuid.uuid4().hex[:10]}",
            "user_id": user.user_id,
            "project_id": projects[i % len(projects)]["project_id"],
            "code": code, "destination": dest, "title": title,
            "utm_source": s, "utm_medium": m, "utm_campaign": c,
            "clicks": 0, "conversions": 0,
            "created_at": now_utc().isoformat(),
            "seed": True,
        }
        await db.links.insert_one(lk.copy())
        links_created.append(lk)

    goal = {
        "goal_id": f"goal_{uuid.uuid4().hex[:10]}",
        "user_id": user.user_id, "name": "Signup", "value": 12.5,
        "project_id": projects[0]["project_id"], "conversions": 0,
        "created_at": now_utc().isoformat(), "seed": True,
    }
    await db.goals.insert_one(goal.copy())

    # generate 30 days of clicks
    countries = ["United States", "United Kingdom", "Germany", "India", "Canada", "Australia", "France", "Brazil"]
    devices = ["Desktop", "Mobile", "Tablet"]
    browsers = ["Chrome", "Safari", "Firefox", "Edge"]
    refs = ["https://google.com/", "https://twitter.com/", "https://news.ycombinator.com/", "(direct)", "https://facebook.com/"]
    for d in range(30):
        day = now_utc() - timedelta(days=29 - d)
        daily = random.randint(15, 80)
        for _ in range(daily):
            lk = random.choice(links_created)
            hour = random.randint(0, 23)
            minute = random.randint(0, 59)
            created = day.replace(hour=hour, minute=minute, second=random.randint(0, 59))
            ua_sample = random.choice(["Mozilla/5.0 Chrome", "Mozilla/5.0 Safari", "Mozilla/5.0 Firefox"])
            fs = random.choice([0, 0, 0, 0, 5, 15, 70, 85]) if random.random() < 0.1 else random.randint(0, 30)
            click = {
                "click_id": f"clk_{uuid.uuid4().hex[:12]}",
                "link_id": lk["link_id"], "user_id": user.user_id,
                "project_id": lk["project_id"],
                "ip": f"203.0.{random.randint(1, 254)}.{random.randint(1, 254)}",
                "country": random.choice(countries),
                "device": random.choice(devices),
                "browser": random.choice(browsers),
                "os": random.choice(["Windows", "macOS", "iOS", "Android"]),
                "referrer": random.choice(refs), "user_agent": ua_sample,
                "utm_source": lk.get("utm_source", ""), "utm_medium": lk.get("utm_medium", ""),
                "utm_campaign": lk.get("utm_campaign", ""),
                "fraud_score": fs, "is_suspicious": fs >= 60,
                "created_at": created.isoformat(), "seed": True,
            }
            await db.clicks.insert_one(click)
            await db.links.update_one({"link_id": lk["link_id"]}, {"$inc": {"clicks": 1}})
            # conversion ~5%
            if random.random() < 0.05 and fs < 60:
                conv = {
                    "conversion_id": f"cnv_{uuid.uuid4().hex[:12]}",
                    "click_id": click["click_id"], "link_id": lk["link_id"], "user_id": user.user_id,
                    "goal_id": goal["goal_id"], "value": round(random.uniform(5, 60), 2),
                    "country": click["country"], "device": click["device"],
                    "created_at": created.isoformat(), "seed": True,
                }
                await db.conversions.insert_one(conv)
                await db.links.update_one({"link_id": lk["link_id"]}, {"$inc": {"conversions": 1}})
                await db.goals.update_one({"goal_id": goal["goal_id"]}, {"$inc": {"conversions": 1}})
    return {"ok": True, "projects": len(projects), "links": len(links_created)}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
