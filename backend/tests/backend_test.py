"""Linkly backend API tests."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # fallback - read from frontend/.env
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")

TOKEN = "test_session_pytest_abc123"
UID = "test-user-pytest"
HEADERS = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}

state = {}  # shared across tests


# ---------- Public / Health ----------
class TestPublic:
    def test_root(self):
        r = requests.get(f"{BASE_URL}/api/")
        assert r.status_code == 200
        d = r.json()
        assert d.get("status") == "ok"
        assert d.get("service") == "Linkly API"

    def test_plans(self):
        r = requests.get(f"{BASE_URL}/api/plans")
        assert r.status_code == 200
        plans = r.json()
        assert len(plans) == 4
        ids = {p["id"] for p in plans}
        assert ids == {"free", "starter", "pro", "business"}
        prices = {p["id"]: p["price"] for p in plans}
        assert prices["free"] == 0.0
        assert prices["starter"] == 29.0
        assert prices["pro"] == 79.0
        assert prices["business"] == 179.0


# ---------- Auth gating ----------
class TestAuthGate:
    def test_me_unauth_401(self):
        r = requests.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 401

    def test_projects_unauth_401(self):
        r = requests.get(f"{BASE_URL}/api/projects")
        assert r.status_code == 401

    def test_auth_me_with_token(self):
        r = requests.get(f"{BASE_URL}/api/auth/me", headers=HEADERS)
        assert r.status_code == 200
        u = r.json()
        assert u["user_id"] == UID
        assert u["email"] == "TEST_pytest@example.com"


# ---------- Projects CRUD ----------
class TestProjects:
    def test_create_project(self):
        r = requests.post(f"{BASE_URL}/api/projects",
                          json={"name": "TEST_proj", "description": "pytest"},
                          headers=HEADERS)
        assert r.status_code == 200
        p = r.json()
        assert p["name"] == "TEST_proj"
        assert p["user_id"] == UID
        assert "project_id" in p
        state["project_id"] = p["project_id"]

    def test_list_projects(self):
        r = requests.get(f"{BASE_URL}/api/projects", headers=HEADERS)
        assert r.status_code == 200
        lst = r.json()
        assert isinstance(lst, list)
        assert any(p["project_id"] == state["project_id"] for p in lst)


# ---------- Links CRUD ----------
class TestLinks:
    def test_create_link(self):
        r = requests.post(f"{BASE_URL}/api/links",
                          json={
                              "destination": "example.com/welcome",
                              "title": "TEST_link",
                              "project_id": state.get("project_id"),
                              "utm_source": "pytest",
                              "utm_medium": "test",
                              "utm_campaign": "c1",
                          }, headers=HEADERS)
        assert r.status_code == 200
        lk = r.json()
        assert lk["destination"].startswith("https://")
        assert lk["title"] == "TEST_link"
        assert "code" in lk and len(lk["code"]) >= 5
        state["link_id"] = lk["link_id"]
        state["code"] = lk["code"]

    def test_list_links(self):
        r = requests.get(f"{BASE_URL}/api/links", headers=HEADERS)
        assert r.status_code == 200
        lst = r.json()
        assert any(l["link_id"] == state["link_id"] for l in lst)


# ---------- Redirect (public) + click tracking ----------
class TestRedirectAndConversion:
    def test_redirect_302_and_click_logged(self):
        code = state["code"]
        r = requests.get(f"{BASE_URL}/api/r/{code}", allow_redirects=False,
                         headers={"User-Agent": "Mozilla/5.0 Chrome"})
        assert r.status_code == 302
        loc = r.headers.get("location", "")
        assert "example.com/welcome" in loc
        assert "lk_click=" in loc
        # extract click_id
        import urllib.parse as up
        qs = up.parse_qs(up.urlparse(loc).query)
        state["click_id"] = qs.get("lk_click", [None])[0]
        assert state["click_id"] is not None

        # verify link clicks incremented
        time.sleep(0.5)
        rlinks = requests.get(f"{BASE_URL}/api/links", headers=HEADERS).json()
        lk = next(l for l in rlinks if l["link_id"] == state["link_id"])
        assert lk["clicks"] >= 1

    def test_redirect_unknown_404(self):
        r = requests.get(f"{BASE_URL}/api/r/__nope__xyz", allow_redirects=False)
        assert r.status_code == 404

    def test_conversion_public(self):
        r = requests.post(f"{BASE_URL}/api/track/conversion",
                          json={"click_id": state["click_id"], "value": 25.5})
        assert r.status_code == 200
        d = r.json()
        assert d["ok"] is True
        assert "conversion_id" in d

    def test_conversion_missing_click_id(self):
        r = requests.post(f"{BASE_URL}/api/track/conversion", json={})
        assert r.status_code == 400


# ---------- Goals CRUD ----------
class TestGoals:
    def test_create_goal(self):
        r = requests.post(f"{BASE_URL}/api/goals",
                          json={"name": "TEST_signup", "value": 12.5,
                                "project_id": state.get("project_id")},
                          headers=HEADERS)
        assert r.status_code == 200
        g = r.json()
        assert g["name"] == "TEST_signup"
        assert g["value"] == 12.5
        state["goal_id"] = g["goal_id"]

    def test_list_goals(self):
        r = requests.get(f"{BASE_URL}/api/goals", headers=HEADERS)
        assert r.status_code == 200
        assert any(g["goal_id"] == state["goal_id"] for g in r.json())


# ---------- Analytics ----------
class TestAnalytics:
    def test_overview(self):
        r = requests.get(f"{BASE_URL}/api/analytics/overview?days=30", headers=HEADERS)
        assert r.status_code == 200
        d = r.json()
        assert "kpis" in d and "series" in d
        assert "by_country" in d and "by_device" in d and "by_referrer" in d
        assert d["kpis"]["visits"] >= 1
        assert d["kpis"]["conversions"] >= 1
        assert len(d["series"]) == 30

    def test_recent_clicks(self):
        r = requests.get(f"{BASE_URL}/api/analytics/recent-clicks?limit=10", headers=HEADERS)
        assert r.status_code == 200
        lst = r.json()
        assert isinstance(lst, list)
        assert len(lst) >= 1


# ---------- Seed demo ----------
class TestSeed:
    def test_seed_demo(self):
        r = requests.post(f"{BASE_URL}/api/seed-demo", headers=HEADERS, timeout=90)
        assert r.status_code == 200
        d = r.json()
        assert d["ok"] is True
        assert d["projects"] >= 3
        assert d["links"] >= 5


# ---------- Stripe Checkout ----------
class TestStripe:
    def test_checkout_creates_session(self):
        r = requests.post(f"{BASE_URL}/api/payments/checkout",
                          json={"plan_id": "starter",
                                "origin_url": "https://flow-track-26.preview.emergentagent.com"},
                          headers=HEADERS, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("url", "").startswith("http")
        assert "session_id" in d
        state["session_id"] = d["session_id"]

    def test_checkout_invalid_plan(self):
        r = requests.post(f"{BASE_URL}/api/payments/checkout",
                          json={"plan_id": "free",
                                "origin_url": "https://flow-track-26.preview.emergentagent.com"},
                          headers=HEADERS)
        assert r.status_code == 400

    def test_checkout_status(self):
        sid = state.get("session_id")
        if not sid:
            pytest.skip("no session id")
        r = requests.get(f"{BASE_URL}/api/payments/status/{sid}", headers=HEADERS, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "status" in d and "payment_status" in d
        assert d["plan_id"] == "starter"


# ---------- Cleanup ----------
class TestZZCleanup:
    def test_delete_link(self):
        if state.get("link_id"):
            r = requests.delete(f"{BASE_URL}/api/links/{state['link_id']}", headers=HEADERS)
            assert r.status_code == 200

    def test_delete_goal(self):
        if state.get("goal_id"):
            r = requests.delete(f"{BASE_URL}/api/goals/{state['goal_id']}", headers=HEADERS)
            assert r.status_code == 200

    def test_delete_project(self):
        if state.get("project_id"):
            r = requests.delete(f"{BASE_URL}/api/projects/{state['project_id']}", headers=HEADERS)
            assert r.status_code == 200
