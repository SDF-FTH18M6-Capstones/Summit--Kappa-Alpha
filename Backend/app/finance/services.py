"""
Financial Management Services: Contribution Types, Contributions, Loans, Repayments & Penalties.
Contains all database transactions, M-Pesa duplicate protection, loan math, and email notifications.
"""

from calendar import monthrange
from datetime import date, datetime, timezone
import re

from app.auth.services import _send_email
from app.models.models import (
    Chama,
    Contribution,
    ContributionType,
    Loan,
    LoanInstallment,
    LoanRepayment,
    Membership,
    Penalty,
    db,
)
from app.utils.decorators import SUPER_ADMIN, log_audit
from app.utils.exceptions import AppError, handle_db_exception, require_str

MPESA_CODE_REGEX = re.compile(r"^[A-Z0-9]{10}$")
MAX_PER_PAGE = 100


def _utc_now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _add_months(start_date, months):
    month_index = start_date.month - 1 + months
    year = start_date.year + month_index // 12
    month = month_index % 12 + 1
    return date(year, month, min(start_date.day, monthrange(year, month)[1]))


def _loan_total_repayable(loan):
    return round(float(loan.principal) * (1 + float(loan.interest_rate) / 100), 2)


def _assert_chama_exists(chama_id):
    chama = db.session.get(Chama, chama_id)
    if chama is None:
        raise AppError(f"Chama with ID {chama_id} was not found.", 404)
    return chama


def _assert_active_member(user, chama_id):
    if user.role == SUPER_ADMIN:
        return
    membership = Membership.query.filter_by(user_id=user.id, chama_id=chama_id).first()
    if membership is None or membership.status != "active":
        raise AppError(
            "Access denied. You must be an active member of this Chama to manage its finances.",
            403,
        )


def _validate_mpesa_code(raw_code):
    if not isinstance(raw_code, str) or not raw_code.strip():
        raise AppError("A valid 10-character M-Pesa transaction code is required.", 400)
    code = raw_code.strip().upper()
    if not MPESA_CODE_REGEX.match(code):
        raise AppError(
            "M-Pesa transaction code must be exactly 10 uppercase letters and numbers (e.g. QWE123RTY4).",
            400,
        )
    return code


def create_contribution_type_service(chama_id, user, data):
    _assert_chama_exists(chama_id)
    _assert_active_member(user, chama_id)

    name = data["name"].strip()
    if ContributionType.query.filter_by(chama_id=chama_id, name=name).first():
        raise AppError(f"A contribution rule named '{name}' already exists in this Chama.", 409)

    try:
        new_type = ContributionType(
            chama_id=chama_id,
            name=name,
            amount=data["amount"],
            frequency=data["frequency"],
            due_day=data.get("due_day"),
            grace_days=data.get("grace_days", 0),
            penalty_amount=data.get("penalty_amount", 0.0),
        )
        db.session.add(new_type)
        db.session.flush()
        log_audit(chama_id, user.id, "create", "contribution_types", new_type.id, new_values=new_type.to_dict())
        db.session.commit()
        return {"message": "Contribution rule created successfully.", "contribution_type": new_type.to_dict()}
    except Exception as exc:
        handle_db_exception(db, exc, "We could not create the contribution rule. Please try again.")


def get_contribution_types_service(chama_id, user):
    _assert_chama_exists(chama_id)
    _assert_active_member(user, chama_id)
    types = ContributionType.query.filter_by(chama_id=chama_id).all()
    return [t.to_dict() for t in types]


def create_contribution_service(chama_id, user, data):
    _assert_chama_exists(chama_id)
    _assert_active_member(user, chama_id)

    membership = db.session.get(Membership, data["membership_id"])
    if membership is None or membership.chama_id != chama_id:
        raise AppError("The selected member does not belong to this Chama.", 400)

    contribution_type = db.session.get(ContributionType, data["contribution_type_id"])
    if contribution_type is None or contribution_type.chama_id != chama_id:
        raise AppError("The selected contribution rule does not belong to this Chama.", 400)

    mpesa_code = _validate_mpesa_code(data.get("mpesa_code"))
    if Contribution.query.filter_by(mpesa_code=mpesa_code).first():
        raise AppError(f"Duplicate M-Pesa transaction code '{mpesa_code}' detected. This payment has already been recorded.", 409)

    try:
        new_contribution = Contribution(
            membership_id=data["membership_id"],
            contribution_type_id=data["contribution_type_id"],
            amount=data["amount"],
            mpesa_code=mpesa_code,
            paid_at=data["paid_at"],
            recorded_by=user.id,
            period_covered=data.get("period_covered"),
            notes=data.get("notes"),
        )
        db.session.add(new_contribution)
        db.session.flush()
        log_audit(chama_id, user.id, "create", "contributions", new_contribution.id, new_values=new_contribution.to_dict())
        db.session.commit()
        return {"message": "M-Pesa contribution recorded successfully.", "contribution": new_contribution.to_dict()}
    except Exception as exc:
        handle_db_exception(db, exc, "We could not record this M-Pesa contribution. Please try again.")


def get_contributions_service(chama_id, user, membership_id=None, page=1, per_page=10):
    _assert_chama_exists(chama_id)
    _assert_active_member(user, chama_id)

    safe_page = max(int(page or 1), 1)
    safe_per_page = min(max(int(per_page or 10), 1), MAX_PER_PAGE)

    query = Contribution.query.join(Membership).filter(Membership.chama_id == chama_id)
    if membership_id:
        query = query.filter(Contribution.membership_id == membership_id)

    pagination = query.order_by(Contribution.paid_at.desc()).paginate(page=safe_page, per_page=safe_per_page, error_out=False)
    return {
        "total": pagination.total,
        "pages": pagination.pages,
        "current_page": pagination.page,
        "contributions": [c.to_dict() for c in pagination.items],
    }


def create_loan_service(chama_id, user, data):
    _assert_chama_exists(chama_id)
    _assert_active_member(user, chama_id)

    membership = db.session.get(Membership, data["membership_id"])
    if membership is None or membership.chama_id != chama_id:
        raise AppError("The selected membership does not belong to this Chama.", 400)

    try:
        new_loan = Loan(
            membership_id=data["membership_id"],
            principal=data["principal"],
            interest_rate=data["interest_rate"],
            term_months=data["term_months"],
            purpose=data.get("purpose"),
            status="requested",
        )
        db.session.add(new_loan)
        db.session.flush()
        log_audit(chama_id, user.id, "create", "loans", new_loan.id, new_values=new_loan.to_dict())
        db.session.commit()

        loan_dict = new_loan.to_dict()
        total_repayable = _loan_total_repayable(new_loan)
        loan_dict["total_repayable"] = total_repayable
        loan_dict["monthly_installment"] = round(total_repayable / new_loan.term_months, 2)

        return {
            "message": "Your loan application has been submitted and is awaiting Treasurer approval.",
            "loan": loan_dict,
        }
    except Exception as exc:
        handle_db_exception(db, exc, "We could not submit your loan request. Please try again.")


def loan_decision_service(loan_id, user, payload):
    loan = db.session.get(Loan, loan_id)
    if loan is None:
        raise AppError(f"Loan with ID {loan_id} was not found.", 404)

    _assert_active_member(user, loan.membership.chama_id)
    decision = require_str(payload, "status", "Status", required=True)
    if decision not in ("approved", "rejected"):
        raise AppError("Invalid decision. Status must be either 'approved' or 'rejected'.", 400)

    if loan.status in ("approved", "rejected", "repaid"):
        raise AppError(f"This loan has already been marked as '{loan.status}' and cannot be modified.", 409)

    borrower = loan.membership.user if loan.membership else None
    chama = db.session.get(Chama, loan.membership.chama_id) if loan.membership else None
    chama_name = chama.name if chama else "Summit Chama"

    try:
        old_status = loan.status
        now = _utc_now()
        loan.status = decision
        loan.approved_by = user.id
        loan.approved_at = now

        total_repayable = _loan_total_repayable(loan)
        monthly_due = round(total_repayable / loan.term_months, 2) if loan.term_months else total_repayable

        if decision == "approved" and not loan.installments:
            loan.disbursed_at = now
            for idx in range(1, loan.term_months + 1):
                db.session.add(
                    LoanInstallment(
                        loan_id=loan.id,
                        due_date=_add_months(now.date(), idx),
                        amount_due=monthly_due,
                    )
                )

        log_audit(
            loan.membership.chama_id,
            user.id,
            "update",
            "loans",
            loan.id,
            old_values={"status": old_status},
            new_values={"status": decision, "approved_by": user.id},
        )
        db.session.commit()

        if borrower and borrower.email:
            if decision == "approved":
                subject = f"{chama_name}: Your Loan Request Has Been Approved"
                html_body = (
                    f"<p>Hello <strong>{borrower.full_name}</strong>,</p>"
                    f"<p>Your loan request of <strong>KES {float(loan.principal):,.2f}</strong> "
                    f"with <strong>{chama_name}</strong> has been approved.</p>"
                    f"<p>Total Repayable: KES {total_repayable:,.2f} | "
                    f"Monthly Installment: <strong>KES {monthly_due:,.2f}</strong> ({loan.term_months} months)</p>"
                )
            else:
                subject = f"{chama_name}: Update on Your Loan Request"
                html_body = (
                    f"Hello {borrower.full_name},"
                    f"Your loan request of KES {float(loan.principal):,.2f} "
                    f"with {chama_name} was not approved at this time."
                )
            _send_email(borrower.email, subject, html_body)
        return {"message": f"Loan application has been {decision}.", "loan": loan.to_dict()}
    except AppError:
        db.session.rollback()
        raise
    except Exception as exc:
        handle_db_exception(db, exc, "We could not update the loan status. Please try again.")


def get_chama_loans_service(chama_id, user, membership_id=None, page=1, per_page=10):
    _assert_chama_exists(chama_id)
    _assert_active_member(user, chama_id)
    safe_page = max(int(page or 1), 1)
    safe_per_page = min(max(int(per_page or 10), 1), MAX_PER_PAGE)
    query = Loan.query.join(Membership).filter(Membership.chama_id == chama_id)
    if membership_id:
        query = query.filter(Loan.membership_id == membership_id)
    pagination = query.order_by(Loan.created_at.desc()).paginate(
        page=safe_page, per_page=safe_per_page, error_out=False
    )
    loan_list = []
    for loan in pagination.items:
        item = loan.to_dict()
        total_repayable = _loan_total_repayable(loan)
        term = int(loan.term_months)
        item["total_repayable"] = total_repayable
        item["monthly_installment"] = round(total_repayable / term, 2) if term > 0 else total_repayable
        loan_list.append(item)
    return {
        "items": loan_list,
        "total": pagination.total,
        "pages": pagination.pages,
        "current_page": pagination.page,
    }


def create_loan_repayment_service(loan_id, user, data):
    loan = db.session.get(Loan, loan_id)
    if loan is None:
        raise AppError(f"Loan with ID {loan_id} was not found.", 404)
    _assert_active_member(user, loan.membership.chama_id)
    if loan.status not in ("approved", "disbursed"):
        raise AppError(f"Repayments can only be recorded for approved or disbursed loans (current status: '{loan.status}').", 400)
    mpesa_code = _validate_mpesa_code(data.get("mpesa_code"))
    if LoanRepayment.query.filter_by(mpesa_code=mpesa_code).first():
        raise AppError(f"Duplicate M-Pesa transaction code '{mpesa_code}' detected. This repayment was already logged.", 409)
    try:
        old_status = loan.status
        repayment = LoanRepayment(
            loan_id=loan.id,
            amount=data["amount"],
            mpesa_code=mpesa_code,
            paid_at=data["paid_at"],
            recorded_by=user.id,
        )
        db.session.add(repayment)
        db.session.flush()
        total_paid = sum(float(r.amount) for r in loan.repayments)
        if total_paid >= _loan_total_repayable(loan):
            loan.status = "repaid"
        log_audit(
            loan.membership.chama_id,
            user.id,
            "create",
            "loan_repayments",
            repayment.id,
            old_values={"loan_status": old_status},
            new_values={**repayment.to_dict(), "loan_status": loan.status},
        )
        db.session.commit()
        return {"message": "Repayment recorded successfully.", "repayment": repayment.to_dict()}
    except Exception as exc:
        handle_db_exception(db, exc, "We could not record the loan repayment. Please try again.")


def get_loan_repayments_service(loan_id, user, page=1, per_page=10):
    loan = db.session.get(Loan, loan_id)
    if loan is None:
        raise AppError(f"Loan with ID {loan_id} was not found.", 404)
    _assert_active_member(user, loan.membership.chama_id)
    safe_page = max(int(page or 1), 1)
    safe_per_page = min(max(int(per_page or 10), 1), MAX_PER_PAGE)
    pagination = LoanRepayment.query.filter_by(loan_id=loan.id).order_by(
        LoanRepayment.paid_at.desc()
    ).paginate(page=safe_page, per_page=safe_per_page, error_out=False)
    return {
        "items": [r.to_dict() for r in pagination.items],
        "total": pagination.total,
        "pages": pagination.pages,
        "current_page": pagination.page,
    }


def get_loan_installments_service(loan_id, user):
    loan = db.session.get(Loan, loan_id)
    if loan is None:
        raise AppError(f"Loan with ID {loan_id} was not found.", 404)
    _assert_active_member(user, loan.membership.chama_id)
    installments = LoanInstallment.query.filter_by(loan_id=loan.id).order_by(
        LoanInstallment.due_date.asc()
    ).all()
    return [inst.to_dict() for inst in installments]


def get_financial_summary_service(chama_id, user):
    _assert_chama_exists(chama_id)
    _assert_active_member(user, chama_id)
    total_contributions = (
        db.session.query(db.func.sum(Contribution.amount))
        .join(Membership)
        .filter(Membership.chama_id == chama_id)
        .scalar()
        or 0.0
    )
    active_loans_count = (
        Loan.query.join(Membership)
        .filter(Membership.chama_id == chama_id, Loan.status.in_(["approved", "disbursed"]))
        .count()
    )
    unpaid_penalties = (
        db.session.query(db.func.sum(Penalty.amount))
        .join(Membership)
        .filter(Membership.chama_id == chama_id, Penalty.status == "unpaid")
        .scalar()
        or 0.0
    )
    return {
        "total_contributions": float(total_contributions),
        "active_loans_count": active_loans_count,
        "unpaid_penalties": float(unpaid_penalties),
    }


def create_penalty_service(chama_id, user, data):
    _assert_chama_exists(chama_id)
    _assert_active_member(user, chama_id)
    membership = db.session.get(Membership, data["membership_id"])
    if membership is None or membership.chama_id != chama_id:
        raise AppError("The selected member does not belong to this Chama.", 400)
    try:
        new_penalty = Penalty(
            membership_id=data["membership_id"],
            contribution_type_id=data.get("contribution_type_id"),
            amount=data["amount"],
            reason=data["reason"],
            date_applied=data["date_applied"],
            status="unpaid",
            applied_by=user.id,
        )
        db.session.add(new_penalty)
        db.session.flush()
        log_audit(chama_id, user.id, "create", "penalties", new_penalty.id, new_values=new_penalty.to_dict())
        db.session.commit()
        return {"message": "Penalty applied successfully.", "penalty": new_penalty.to_dict()}
    except Exception as exc:
        handle_db_exception(db, exc, "We could not apply the penalty. Please try again.")


def get_chama_penalties_service(chama_id, user, membership_id=None, page=1, per_page=10):
    _assert_chama_exists(chama_id)
    _assert_active_member(user, chama_id)
    safe_page = max(int(page or 1), 1)
    safe_per_page = min(max(int(per_page or 10), 1), MAX_PER_PAGE)
    query = Penalty.query.join(Membership).filter(Membership.chama_id == chama_id)
    if membership_id:
        query = query.filter(Penalty.membership_id == membership_id)
    pagination = query.order_by(Penalty.date_applied.desc()).paginate(
        page=safe_page, per_page=safe_per_page, error_out=False
    )
    return {
        "total": pagination.total,
        "pages": pagination.pages,
        "current_page": pagination.page,
        "items": [p.to_dict() for p in pagination.items],
    }