import os

import pytest
from flask_jwt_extended import create_access_token
from werkzeug.security import generate_password_hash

os.environ["DATABASE_URL"] = "sqlite:///:memory:"  # set before create_app()

from app import create_app, db  # noqa: E402
from app.models import AuditLog, Chama, Membership, User  # noqa: E402

MEETING = {"title": "December Meeting", "meeting_date": "2026-12-05T10:00:00Z"}


@pytest.fixture()
def app():
    app = create_app()
    app.config["TESTING"] = True
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()


@pytest.fixture()
def world(app):
    """Two chamas, with users in each, plus a super_admin with no membership."""
    pw = generate_password_hash("Password123!")

    def user(n, role):
        return User(full_name=f"{role} {n}", email=f"{role}{n}@test.local",
                    password=pw, phone_number=f"2547000000{n:02d}", role=role,
                    is_email_verified=True, is_active=True)

    admin, sec, mem, outsider, sup = (
        user(1, "chama_admin"), user(2, "secretary"), user(3, "member"),
        user(4, "member"), user(5, "super_admin"),
    )
    db.session.add_all([admin, sec, mem, outsider, sup])
    db.session.flush()

    chama1 = Chama(name="Chama One", slug="one", created_by=admin.id)
    chama2 = Chama(name="Chama Two", slug="two", created_by=admin.id)
    db.session.add_all([chama1, chama2])
    db.session.flush()

    m_admin = Membership(user_id=admin.id, chama_id=chama1.id, member_number="A1", status="active")
    m_sec = Membership(user_id=sec.id, chama_id=chama1.id, member_number="A2", status="active")
    m_mem = Membership(user_id=mem.id, chama_id=chama1.id, member_number="A3", status="active")
    m_out = Membership(user_id=outsider.id, chama_id=chama2.id, member_number="B1", status="active")
    db.session.add_all([m_admin, m_sec, m_mem, m_out])
    db.session.commit()

    return {
        "chama": chama1.id,
        "sec": sec.id, "mem": mem.id, "outsider": outsider.id, "super": sup.id,
        "m_mem": m_mem.id, "m_sec": m_sec.id, "m_out": m_out.id,
    }


def auth(user_id):
    return {"Authorization": f"Bearer {create_access_token(identity=str(user_id))}"}


def make_meeting(client, w, title="December Meeting"):
    body = {**MEETING, "title": title}
    r = client.post(f"/api/chamas/{w['chama']}/meetings", headers=auth(w["sec"]), json=body)
    assert r.status_code == 201
    return r.get_json()["id"]


# ---- meetings -------------------------------------------------------------

def test_secretary_can_schedule_meeting(client, world):
    r = client.post(f"/api/chamas/{world['chama']}/meetings", headers=auth(world["sec"]), json=MEETING)
    assert r.status_code == 201
    assert r.get_json()["title"] == "December Meeting"


def test_member_cannot_schedule_meeting(client, world):
    r = client.post(f"/api/chamas/{world['chama']}/meetings", headers=auth(world["mem"]), json=MEETING)
    assert r.status_code == 403


def test_short_title_is_rejected_by_schema(client, world):
    r = client.post(f"/api/chamas/{world['chama']}/meetings", headers=auth(world["sec"]),
                    json={**MEETING, "title": "Hi"})
    assert r.status_code == 400
    assert "title" in r.get_json()["errors"]


def test_no_token_is_401(client, world):
    assert client.get(f"/api/chamas/{world['chama']}/meetings").status_code == 401


def test_member_of_another_chama_is_blocked(client, world):
    r = client.get(f"/api/chamas/{world['chama']}/meetings", headers=auth(world["outsider"]))
    assert r.status_code == 403


def test_meetings_are_paginated(client, world):
    for i in range(3):
        make_meeting(client, world, title=f"Meeting {i}")
    r = client.get(f"/api/chamas/{world['chama']}/meetings?per_page=2", headers=auth(world["mem"]))
    data = r.get_json()
    assert r.status_code == 200
    assert (len(data["items"]), data["total"], data["pages"]) == (2, 3, 2)


# ---- minutes --------------------------------------------------------------

def test_minutes_are_one_per_meeting(client, world):
    mid = make_meeting(client, world)
    url = f"/api/meetings/{mid}/minutes"
    assert client.get(url, headers=auth(world["mem"])).status_code == 404
    assert client.post(url, headers=auth(world["sec"]), json={"minutes": "Plans agreed."}).status_code == 201
    assert client.post(url, headers=auth(world["sec"]), json={"minutes": "Again and again"}).status_code == 409
    assert client.get(url, headers=auth(world["mem"])).status_code == 200


def test_member_cannot_publish_minutes(client, world):
    mid = make_meeting(client, world)
    r = client.post(f"/api/meetings/{mid}/minutes", headers=auth(world["mem"]), json={"minutes": "Sneaky minutes"})
    assert r.status_code == 403


# ---- attendance -----------------------------------------------------------

def test_bulk_attendance_and_update(client, world):
    mid = make_meeting(client, world)
    url = f"/api/meetings/{mid}/attendance"
    body = {"records": [{"membership_id": world["m_mem"], "status": "present"},
                        {"membership_id": world["m_sec"], "status": "apology"}]}
    assert client.post(url, headers=auth(world["sec"]), json=body).status_code == 201

    # posting the same member again updates the row instead of duplicating it
    client.post(url, headers=auth(world["sec"]),
                json={"membership_id": world["m_mem"], "status": "absent"})
    items = client.get(url, headers=auth(world["mem"])).get_json()["items"]
    assert len(items) == 2
    assert {i["membership_id"]: i["status"] for i in items}[world["m_mem"]] == "absent"


def test_bad_attendance_status_is_400(client, world):
    mid = make_meeting(client, world)
    r = client.post(f"/api/meetings/{mid}/attendance", headers=auth(world["sec"]),
                    json={"membership_id": world["m_mem"], "status": "late"})
    assert r.status_code == 400


def test_attendance_for_member_of_other_chama_is_400(client, world):
    mid = make_meeting(client, world)
    r = client.post(f"/api/meetings/{mid}/attendance", headers=auth(world["sec"]),
                    json={"membership_id": world["m_out"], "status": "present"})
    assert r.status_code == 400
    assert "membership_id" in r.get_json()["errors"]


# ---- announcements --------------------------------------------------------

def test_announcements_create_and_paginate(client, world):
    url = f"/api/chamas/{world['chama']}/announcements"
    for i in range(3):
        r = client.post(url, headers=auth(world["sec"]), json={"title": f"Notice {i}", "content": "Pay by the 5th."})
        assert r.status_code == 201
    assert client.post(url, headers=auth(world["mem"]), json={"title": "Nope", "content": "Nope"}).status_code == 403
    data = client.get(url + "?per_page=1", headers=auth(world["mem"])).get_json()
    assert (data["total"], data["pages"]) == (3, 3)


# ---- RBAC branch only (skipped until app/decorators.py exists) -------------

def test_super_admin_reads_any_chama_without_membership(client, world):
    pytest.importorskip("app.decorators")
    assert client.get(f"/api/chamas/{world['chama']}/meetings", headers=auth(world["super"])).status_code == 200
    assert client.get("/api/chamas/999/meetings", headers=auth(world["super"])).status_code == 404


def test_audit_rows_are_written_only_for_successful_actions(client, world):
    pytest.importorskip("app.decorators")
    client.post(f"/api/chamas/{world['chama']}/meetings", headers=auth(world["mem"]), json=MEETING)  # 403
    assert AuditLog.query.count() == 0
    mid = make_meeting(client, world)
    client.post(f"/api/meetings/{mid}/minutes", headers=auth(world["sec"]), json={"minutes": "Plans agreed."})
    tables = [a.table_name for a in AuditLog.query.order_by(AuditLog.id)]
    assert tables == ["meetings", "meeting_minutes"]
