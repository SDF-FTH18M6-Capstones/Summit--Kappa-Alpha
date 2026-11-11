from datetime import date, datetime, timedelta, timezone

from werkzeug.security import generate_password_hash

from app import create_app, db
from app.models import (
    Announcement,
    Chama,
    Meeting,
    MeetingMinutes,
    Membership,
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


def seed():
    app = create_app()
    with app.app_context():
        db.drop_all()
        db.create_all()

        password = generate_password_hash(DEFAULT_PASSWORD)

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
        db.session.flush()  # assigns user ids

        chama = Chama(
            name="Summit Chama",
            slug="summit-chama",
            description="A community savings group pooling monthly contributions.",
            location="Nairobi",
            created_by=users["admin"].id,
        )
        db.session.add(chama)
        db.session.flush()  # assigns chama id

        for key, _, _, _, _, member_number in PEOPLE:
            db.session.add(
                Membership(
                    user_id=users[key].id,
                    chama_id=chama.id,
                    member_number=member_number,
                    status="active",
                    joined_at=date.today(),
                )
            )

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
        db.session.flush()  # assigns meeting ids

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

        db.session.commit()

        print("Database seeded.")
        print(f"Password for every account: {DEFAULT_PASSWORD}")
        for _, _, email, _, role, _ in PEOPLE:
            print(f"  {role:<12} {email}")


if __name__ == "__main__":
    seed()
