"""Populate the database with development test data.

Schema is owned by Flask-Migrate, so run the migrations first:
    flask db upgrade
Then:
    python seed.py

This script only deletes and re-inserts ROWS (children before parents).
It never creates or drops tables. Local development only.
"""
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import inspect
from werkzeug.security import generate_password_hash

from app import create_app, db
from app.models import (
    Announcement,
    Chama,
    Contribution,
    ContributionType,
    Loan,
    Meeting,
    MeetingMinutes,
    Membership,
    Project,
    User,
)

DEFAULT_PASSWORD = "Password123!"

PEOPLE = [
    # key, full_name, email, phone, role, member_number
    ("admin", "Alice Wanjiru", "admin@summit.test", "254700000001", "chama_admin", "SUM001"),
    ("treasurer", "Tom Otieno", "treasurer@summit.test", "254700000002", "treasurer", "SUM002"),
    ("secretary", "Sarah Njeri", "secretary@summit.test", "254700000003", "secretary", "SUM003"),
    ("member", "Mike Kamau", "member@summit.test", "254700000004", "member", "SUM004"),
]


def utc_now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def clear_rows():
    """Delete every row, children before parents, leaving the schema alone.

    sorted_tables lists parents first, so reversing it deletes children
    first. alembic_version is not part of the model metadata, so Alembic's
    tracking is never touched.
    """
    for table in reversed(db.metadata.sorted_tables):
        db.session.execute(table.delete())
    db.session.commit()


def seed():
    app = create_app()
    with app.app_context():
        if not inspect(db.engine).has_table(User.__tablename__):
            raise SystemExit(
                "Tables not found. Run the migrations first (flask db upgrade), then seed."
            )

        clear_rows()
        password = generate_password_hash(DEFAULT_PASSWORD)

        # ---------------------------------------------------------- users
        users = {}
        for key, full_name, email, phone, role, _ in PEOPLE:
            users[key] = User(
                full_name=full_name,
                email=email,
                password=password,
                phone_number=phone,
                role=role,
                is_email_verified=True,
                is_active=True,
            )
        db.session.add_all(users.values())
        db.session.flush()

        # ---------------------------------------------------------- chama
        chama = Chama(
            name="Summit Chama",
            slug="summit-chama",
            description="A community savings group pooling monthly contributions.",
            location="Nairobi",
            created_by=users["admin"].id,
        )
        db.session.add(chama)
        db.session.flush()

        memberships = {}
        for key, _, _, _, _, member_number in PEOPLE:
            memberships[key] = Membership(
                user_id=users[key].id,
                chama_id=chama.id,
                member_number=member_number,
                status="active",
            )
        db.session.add_all(memberships.values())
        db.session.flush()

        # ---------------------------------------------------- operations
        secretary = users["secretary"]
        now = utc_now()

        past_meeting = Meeting(
            chama_id=chama.id,
            title="October Monthly Meeting",
            meeting_date=now - timedelta(days=30),
            venue="Community Hall",
            agenda="Review contributions and approve pending loans.",
            created_by=secretary.id,
        )
        upcoming_meeting = Meeting(
            chama_id=chama.id,
            title="November Monthly Meeting",
            meeting_date=now + timedelta(days=7),
            venue="Community Hall",
            agenda="Project update and year-end planning.",
            created_by=secretary.id,
        )
        db.session.add_all([past_meeting, upcoming_meeting])
        db.session.flush()

        db.session.add(
            MeetingMinutes(
                meeting_id=past_meeting.id,
                recorded_by=secretary.id,
                minutes="Attendance recorded. Contributions reviewed. Two loans approved.",
            )
        )
        db.session.add_all(
            [
                Announcement(
                    chama_id=chama.id,
                    created_by=secretary.id,
                    title="Welcome to Summit",
                    content="Please submit your monthly contribution before the 5th.",
                ),
                Announcement(
                    chama_id=chama.id,
                    created_by=secretary.id,
                    title="November Meeting Reminder",
                    content="Our next meeting is in one week. Please be on time.",
                ),
            ]
        )

        # -------------------------------------------------------- finance
        treasurer = users["treasurer"]

        monthly = ContributionType(
            chama_id=chama.id,
            name="Monthly savings",
            amount=Decimal("1000.00"),
            frequency="monthly",
            due_day=5,
            grace_days=3,
            penalty_amount=Decimal("100.00"),
            is_active=True,
        )
        welfare = ContributionType(
            chama_id=chama.id,
            name="Welfare",
            amount=Decimal("200.00"),
            frequency="monthly",
            due_day=5,
            grace_days=0,
            penalty_amount=Decimal("0.00"),
            is_active=True,
        )
        db.session.add_all([monthly, welfare])
        db.session.flush()

        # M-Pesa codes must be unique and exactly 10 characters.
        first_of_month = date.today().replace(day=1)
        contributions = []
        code_number = 1
        for key in ("admin", "treasurer", "secretary", "member"):
            for months_back, paid_days_ago in ((1, 35), (0, 3)):
                period = first_of_month if months_back == 0 else (first_of_month - timedelta(days=1)).replace(day=1)
                contributions.append(
                    Contribution(
                        membership_id=memberships[key].id,
                        contribution_type_id=monthly.id,
                        amount=Decimal("1000.00"),
                        mpesa_code=f"SUM{code_number:07d}",
                        paid_at=now - timedelta(days=paid_days_ago),
                        period_covered=period,
                        notes="Seed data",
                        recorded_by=treasurer.id,
                    )
                )
                code_number += 1
        db.session.add_all(contributions)

        db.session.add_all(
            [
                Loan(  # approved and paid out
                    membership_id=memberships["member"].id,
                    principal=Decimal("5000.00"),
                    interest_rate=Decimal("10.00"),
                    term_months=6,
                    purpose="School fees",
                    status="approved",
                    approved_by=treasurer.id,
                    approved_at=now - timedelta(days=20),
                    disbursed_at=now - timedelta(days=19),
                ),
                Loan(  # still waiting for the treasurer
                    membership_id=memberships["secretary"].id,
                    principal=Decimal("3000.00"),
                    interest_rate=Decimal("10.00"),
                    term_months=3,
                    purpose="Stock for small business",
                    status="pending",
                ),
            ]
        )

        # ------------------------------------------------------- projects
        admin = users["admin"]
        db.session.add_all(
            [
                Project(
                    chama_id=chama.id,
                    title="Rental Plot in Kitengela",
                    description="Plot bought to build rental units for the group.",
                    amount_invested=Decimal("250000.00"),
                    status="ongoing",
                    is_public=True,
                    created_by=admin.id,
                ),
                Project(
                    chama_id=chama.id,
                    title="Dairy Goat Farm",
                    description="Group farm project, completed last year.",
                    amount_invested=Decimal("120000.00"),
                    status="completed",
                    is_public=True,
                    created_by=admin.id,
                ),
                Project(
                    chama_id=chama.id,
                    title="Minibus Investment",
                    description="Planned matatu purchase, not yet funded.",
                    amount_invested=Decimal("0.00"),
                    status="planned",
                    is_public=False,
                    created_by=admin.id,
                ),
            ]
        )

        db.session.commit()

        print("Database seeded.")
        print(f"Chama id: {chama.id}   Password for every account: {DEFAULT_PASSWORD}")
        for key, _, email, _, role, _ in PEOPLE:
            print(f"  {role:<12} {email:<26} membership id {memberships[key].id}")


if __name__ == "__main__":
    seed()
