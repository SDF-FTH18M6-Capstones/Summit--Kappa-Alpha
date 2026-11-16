from calendar import monthrange
from datetime import date, datetime, timezone

from flask import Blueprint, g, jsonify, request
from marshmallow import ValidationError

from app.decorators import SUPER_ADMIN, log_audit, role_required
from app.models import (
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
from app.schemas import (
    ContributionSchema,
    ContributionTypeSchema,
    LoanRepaymentSchema,
    LoanRequestSchema,
    PenaltySchema,
)

finance_bp = Blueprint("finance", __name__)

contrib_type_schema = ContributionTypeSchema()
contrib_schema = ContributionSchema()
loan_request_schema = LoanRequestSchema()
loan_repayment_schema = LoanRepaymentSchema()
penalty_schema = PenaltySchema()

ALL_CHAMA_ROLES = ("member", "secretary", "treasurer", "chama_admin")
FINANCE_WRITE_ROLES = ("treasurer", "chama_admin")
MAX_PER_PAGE = 100


@finance_bp.errorhandler(ValidationError)
def handle_validation_error(err):
    """Return clear field-level validation feedback whenever Marshmallow rejects a request payload."""
    return jsonify({
        "error": "Please check the highlighted financial form fields and try again.",
        "errors": err.messages,
    }), 400


# ==============================================================================
# HELPER UTILITIES
# ==============================================================================

def _utc_now():
    """Return the current UTC timestamp as a naive datetime for consistent SQLite3 storage."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _add_months(start_date, months):
    """Add a whole number of calendar months to a date while clamping to the month's final day."""
    month_index = start_date.month - 1 + months
    year = start_date.year + month_index // 12
    month = month_index % 12 + 1
    return date(year, month, min(start_date.day, monthrange(year, month)[1]))


def _loan_total_repayable(loan):
    """Calculate total repayable amount: principal * (1 + interest_rate / 100)."""
    return round(float(loan.principal) * (1 + float(loan.interest_rate) / 100), 2)


def _verify_chama_membership(chama_id):
    """
    Confirm that g.current_user is either a platform-level super_admin or an active member of the Chama.
    """
    user = g.current_user
    if user.role == SUPER_ADMIN:
        return None

    membership = Membership.query.filter_by(user_id=user.id, chama_id=chama_id).first()
    if membership is None or membership.status != "active":
        return jsonify({
            "error": "Access denied. You must be an active member of this Chama to manage its finances."
        }), 403

    return None


# ==============================================================================
# 1. CONTRIBUTION TYPES ENDPOINTS
# ==============================================================================

@finance_bp.route("/api/chamas/<int:chama_id>/contribution-types", methods=["POST"])
@role_required(*FINANCE_WRITE_ROLES)
def create_contribution_type(chama_id):
    """Allow the Treasurer or Chama Admin to create a new contribution rule."""
    chama = db.session.get(Chama, chama_id)
    if chama is None:
        return jsonify({"error": f"Chama with ID {chama_id} was not found."}), 404

    membership_error = _verify_chama_membership(chama_id)
    if membership_error:
        return membership_error

    data = contrib_type_schema.load(request.get_json(silent=True) or {})
    name = data["name"].strip()

    if ContributionType.query.filter_by(chama_id=chama_id, name=name).first():
        return jsonify({
            "error": f"A contribution rule named '{name}' already exists in this Chama."
        }), 409

    user = g.current_user

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

        log_audit(
            chama_id=chama_id,
            user_id=user.id,
            action="create",
            table_name="contribution_types",
            record_id=new_type.id,
            new_values=new_type.to_dict(),
        )
        db.session.commit()

        return jsonify({
            "message": "Contribution rule created successfully.",
            "contribution_type": new_type.to_dict(),
        }), 201
    except Exception as exc:
        db.session.rollback()
        return jsonify({
            "error": "We could not create the contribution rule due to a server error. Please try again.",
            "details": str(exc),
        }), 500


@finance_bp.route("/api/chamas/<int:chama_id>/contribution-types", methods=["GET"])
@role_required(*ALL_CHAMA_ROLES)
def get_contribution_types(chama_id):
    """Return all configured contribution rules for a Chama."""
    chama = db.session.get(Chama, chama_id)
    if chama is None:
        return jsonify({"error": f"Chama with ID {chama_id} was not found."}), 404

    membership_error = _verify_chama_membership(chama_id)
    if membership_error:
        return membership_error

    try:
        contribution_types = ContributionType.query.filter_by(chama_id=chama_id).all()
        return jsonify([t.to_dict() for t in contribution_types]), 200
    except Exception as exc:
        return jsonify({
            "error": "We could not load the Chama's contribution rules due to a server error.",
            "details": str(exc),
        }), 500


# ==============================================================================
# 2. CONTRIBUTIONS ENDPOINTS
# ==============================================================================

@finance_bp.route("/api/chamas/<int:chama_id>/contributions", methods=["POST"])
@role_required(*FINANCE_WRITE_ROLES)
def create_contribution(chama_id):
    """Allow the Treasurer or Chama Admin to record a member's M-Pesa contribution."""
    chama = db.session.get(Chama, chama_id)
    if chama is None:
        return jsonify({"error": f"Chama with ID {chama_id} was not found."}), 404

    membership_error = _verify_chama_membership(chama_id)
    if membership_error:
        return membership_error

    data = contrib_schema.load(request.get_json(silent=True) or {})

    membership = db.session.get(Membership, data["membership_id"])
    if membership is None or membership.chama_id != chama_id:
        return jsonify({
            "error": "The selected member does not belong to this Chama."
        }), 400

    contribution_type = db.session.get(ContributionType, data["contribution_type_id"])
    if contribution_type is None or contribution_type.chama_id != chama_id:
        return jsonify({
            "error": "The selected contribution rule does not belong to this Chama."
        }), 400

    mpesa_code = data["mpesa_code"].strip().upper()
    if Contribution.query.filter_by(mpesa_code=mpesa_code).first():
        return jsonify({
            "error": f"Duplicate M-Pesa transaction code '{mpesa_code}' detected. This payment has already been recorded."
        }), 409

    user = g.current_user

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

        log_audit(
            chama_id=chama_id,
            user_id=user.id,
            action="create",
            table_name="contributions",
            record_id=new_contribution.id,
            new_values=new_contribution.to_dict(),
        )
        db.session.commit()

        return jsonify({
            "message": "M-Pesa contribution recorded successfully.",
            "contribution": new_contribution.to_dict(),
        }), 201
    except Exception as exc:
        db.session.rollback()
        return jsonify({
            "error": "We could not record this M-Pesa contribution due to a server error. Please try again.",
            "details": str(exc),
        }), 500


@finance_bp.route("/api/chamas/<int:chama_id>/contributions", methods=["GET"])
@role_required(*ALL_CHAMA_ROLES)
def get_contributions(chama_id):
    """Return paginated contributions for a Chama, optionally filtered by membership_id."""
    chama = db.session.get(Chama, chama_id)
    if chama is None:
        return jsonify({"error": f"Chama with ID {chama_id} was not found."}), 404

    membership_error = _verify_chama_membership(chama_id)
    if membership_error:
        return membership_error

    try:
        membership_id = request.args.get("membership_id", type=int)
        page = max(request.args.get("page", 1, type=int), 1)
        per_page = min(max(request.args.get("per_page", 10, type=int), 1), MAX_PER_PAGE)

        query = Contribution.query.join(Membership).filter(Membership.chama_id == chama_id)
        if membership_id:
            query = query.filter(Contribution.membership_id == membership_id)

        pagination = query.order_by(Contribution.paid_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )

        return jsonify({
            "total": pagination.total,
            "pages": pagination.pages,
            "current_page": pagination.page,
            "contributions": [c.to_dict() for c in pagination.items],
        }), 200
    except Exception as exc:
        return jsonify({
            "error": "We could not load the contribution records due to a server error.",
            "details": str(exc),
        }), 500


# ==============================================================================
# 3. LOAN REQUESTS, APPROVALS, INSTALLMENTS & REPAYMENTS
# ==============================================================================

@finance_bp.route("/api/chamas/<int:chama_id>/loans", methods=["POST"])
@role_required(*ALL_CHAMA_ROLES)
def create_loan(chama_id):
    """Allow an active Chama member to submit a new loan application."""
    chama = db.session.get(Chama, chama_id)
    if chama is None:
        return jsonify({"error": f"Chama with ID {chama_id} was not found."}), 404

    membership_error = _verify_chama_membership(chama_id)
    if membership_error:
        return membership_error

    data = loan_request_schema.load(request.get_json(silent=True) or {})
    membership = db.session.get(Membership, data["membership_id"])
    if membership is None or membership.chama_id != chama_id:
        return jsonify({
            "error": "The selected membership does not belong to this Chama."
        }), 400

    user = g.current_user

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

        log_audit(
            chama_id=chama_id,
            user_id=user.id,
            action="create",
            table_name="loans",
            record_id=new_loan.id,
            new_values=new_loan.to_dict(),
        )
        db.session.commit()

        loan_dict = new_loan.to_dict()
        total_repayable = _loan_total_repayable(new_loan)
        loan_dict["total_repayable"] = total_repayable
        loan_dict["monthly_installment"] = round(total_repayable / new_loan.term_months, 2)

        return jsonify({
            "message": "Your loan application has been submitted and is awaiting Treasurer approval.",
            "loan": loan_dict,
        }), 201
    except Exception as exc:
        db.session.rollback()
        return jsonify({
            "error": "We could not submit your loan request due to a server error. Please try again.",
            "details": str(exc),
        }), 500


@finance_bp.route("/api/loans/<int:loan_id>/decision", methods=["PATCH"])
@role_required(*FINANCE_WRITE_ROLES)
def loan_decision(loan_id):
    """Allow the Treasurer or Chama Admin to approve or reject a loan request."""
    loan = db.session.get(Loan, loan_id)
    if loan is None:
        return jsonify({"error": f"Loan with ID {loan_id} was not found."}), 404

    membership_error = _verify_chama_membership(loan.membership.chama_id)
    if membership_error:
        return membership_error

    data = request.get_json(silent=True) or {}
    decision = data.get("status")
    if decision not in ("approved", "rejected"):
        return jsonify({
            "error": "Invalid decision. Status must be either 'approved' or 'rejected'."
        }), 400

    user = g.current_user

    try:
        old_status = loan.status
        now = _utc_now()
        loan.status = decision
        loan.approved_by = user.id
        loan.approved_at = now

        if decision == "approved" and not loan.installments:
            loan.disbursed_at = now
            total_repayable = _loan_total_repayable(loan)
            monthly_due = round(total_repayable / loan.term_months, 2)
            for idx in range(1, loan.term_months + 1):
                db.session.add(
                    LoanInstallment(
                        loan_id=loan.id,
                        due_date=_add_months(now.date(), idx),
                        amount_due=monthly_due,
                    )
                )

        log_audit(
            chama_id=loan.membership.chama_id,
            user_id=user.id,
            action="update",
            table_name="loans",
            record_id=loan.id,
            old_values={"status": old_status},
            new_values={"status": decision, "approved_by": user.id},
        )
        db.session.commit()
        return jsonify({
            "message": f"Loan application has been {decision}.",
            "loan": loan.to_dict(),
        }), 200
    except Exception as exc:
        db.session.rollback()
        return jsonify({
            "error": "We could not update the loan status due to a server error. Please try again.",
            "details": str(exc),
        }), 500


@finance_bp.route("/api/chamas/<int:chama_id>/loans", methods=["GET"])
@role_required(*ALL_CHAMA_ROLES)
def get_chama_loans(chama_id):
    """Return paginated loans for a Chama, optionally filtered by membership_id."""
    chama = db.session.get(Chama, chama_id)
    if chama is None:
        return jsonify({"error": f"Chama with ID {chama_id} was not found."}), 404

    membership_error = _verify_chama_membership(chama_id)
    if membership_error:
        return membership_error

    try:
        membership_id = request.args.get("membership_id", type=int)
        page = max(request.args.get("page", 1, type=int), 1)
        per_page = min(max(request.args.get("per_page", 10, type=int), 1), MAX_PER_PAGE)

        query = Loan.query.join(Membership).filter(Membership.chama_id == chama_id)
        if membership_id:
            query = query.filter(Loan.membership_id == membership_id)

        pagination = query.order_by(Loan.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )

        loan_list = []
        for loan in pagination.items:
            item = loan.to_dict()
            total_repayable = _loan_total_repayable(loan)
            term = int(loan.term_months)
            item["total_repayable"] = total_repayable
            item["monthly_installment"] = round(total_repayable / term, 2) if term > 0 else total_repayable
            loan_list.append(item)

        return jsonify({
            "items": loan_list,
            "total": pagination.total,
            "pages": pagination.pages,
            "current_page": pagination.page,
        }), 200
    except Exception as exc:
        return jsonify({
            "error": "We could not load the Chama's loan records due to a server error.",
            "details": str(exc),
        }), 500


@finance_bp.route("/api/loans/<int:loan_id>/repayments", methods=["POST"])
@role_required(*FINANCE_WRITE_ROLES)
def create_loan_repayment(loan_id):
    """Allow the Treasurer or Chama Admin to log a loan repayment."""
    loan = db.session.get(Loan, loan_id)
    if loan is None:
        return jsonify({"error": f"Loan with ID {loan_id} was not found."}), 404

    membership_error = _verify_chama_membership(loan.membership.chama_id)
    if membership_error:
        return membership_error

    data = loan_repayment_schema.load(request.get_json(silent=True) or {})
    mpesa_code = data["mpesa_code"].strip().upper()
    if LoanRepayment.query.filter_by(mpesa_code=mpesa_code).first():
        return jsonify({
            "error": f"Duplicate M-Pesa transaction code '{mpesa_code}' detected. This repayment was already logged."
        }), 409

    user = g.current_user

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
            chama_id=loan.membership.chama_id,
            user_id=user.id,
            action="create",
            table_name="loan_repayments",
            record_id=repayment.id,
            old_values={"loan_status": old_status},
            new_values={**repayment.to_dict(), "loan_status": loan.status},
        )
        db.session.commit()

        return jsonify({
            "message": "Repayment recorded successfully.",
            "repayment": repayment.to_dict(),
        }), 201
    except Exception as exc:
        db.session.rollback()
        return jsonify({
            "error": "We could not record the repayment due to a server error. Please try again.",
            "details": str(exc),
        }), 500


@finance_bp.route("/api/loans/<int:loan_id>/repayments", methods=["GET"])
@role_required(*ALL_CHAMA_ROLES)
def get_loan_repayments(loan_id):
    """Return paginated repayments for a specific loan."""
    loan = db.session.get(Loan, loan_id)
    if loan is None:
        return jsonify({"error": f"Loan with ID {loan_id} was not found."}), 404

    membership_error = _verify_chama_membership(loan.membership.chama_id)
    if membership_error:
        return membership_error

    try:
        page = max(request.args.get("page", 1, type=int), 1)
        per_page = min(max(request.args.get("per_page", 10, type=int), 1), MAX_PER_PAGE)
        pagination = LoanRepayment.query.filter_by(loan_id=loan.id).order_by(
            LoanRepayment.paid_at.desc()
        ).paginate(page=page, per_page=per_page, error_out=False)

        return jsonify({
            "items": [r.to_dict() for r in pagination.items],
            "total": pagination.total,
            "pages": pagination.pages,
            "current_page": pagination.page,
        }), 200
    except Exception as exc:
        return jsonify({
            "error": "We could not load the loan repayments due to a server error.",
            "details": str(exc),
        }), 500


@finance_bp.route("/api/loans/<int:loan_id>/installments", methods=["GET"])
@role_required(*ALL_CHAMA_ROLES)
def get_loan_installments(loan_id):
    """Return the monthly installment schedule for a specific loan."""
    loan = db.session.get(Loan, loan_id)
    if loan is None:
        return jsonify({"error": f"Loan with ID {loan_id} was not found."}), 404

    membership_error = _verify_chama_membership(loan.membership.chama_id)
    if membership_error:
        return membership_error

    try:
        installments = LoanInstallment.query.filter_by(loan_id=loan.id).order_by(
            LoanInstallment.due_date.asc()
        ).all()
        return jsonify([inst.to_dict() for inst in installments]), 200
    except Exception as exc:
        return jsonify({
            "error": "We could not load the loan installment schedule due to a server error.",
            "details": str(exc),
        }), 500


@finance_bp.route("/api/chamas/<int:chama_id>/financial-summary", methods=["GET"])
@role_required(*ALL_CHAMA_ROLES)
def get_financial_summary(chama_id):
    """Return aggregate financial KPI totals for a Chama's dashboard summary cards."""
    chama = db.session.get(Chama, chama_id)
    if chama is None:
        return jsonify({"error": f"Chama with ID {chama_id} was not found."}), 404

    membership_error = _verify_chama_membership(chama_id)
    if membership_error:
        return membership_error

    try:
        total_contributions = (
            db.session.query(db.func.sum(Contribution.amount))
            .join(Membership)
            .filter(Membership.chama_id == chama_id)
            .scalar()
            or 0.0
        )

        active_loans_count = (
            Loan.query.join(Membership)
            .filter(
                Membership.chama_id == chama_id,
                Loan.status.in_(["approved", "disbursed"]),
            )
            .count()
        )

        unpaid_penalties = (
            db.session.query(db.func.sum(Penalty.amount))
            .join(Membership)
            .filter(Membership.chama_id == chama_id, Penalty.status == "unpaid")
            .scalar()
            or 0.0
        )

        return jsonify({
            "total_contributions": float(total_contributions),
            "active_loans_count": active_loans_count,
            "unpaid_penalties": float(unpaid_penalties),
        }), 200
    except Exception as exc:
        return jsonify({
            "error": "We could not compute the Chama financial summary due to a server error.",
            "details": str(exc),
        }), 500


# ==============================================================================
# 4. PENALTIES ENDPOINTS
# ==============================================================================

@finance_bp.route("/api/chamas/<int:chama_id>/penalties", methods=["POST"])
@role_required(*FINANCE_WRITE_ROLES)
def create_penalty(chama_id):
    """Allow the Treasurer or Chama Admin to apply a penalty to a member."""
    chama = db.session.get(Chama, chama_id)
    if chama is None:
        return jsonify({"error": f"Chama with ID {chama_id} was not found."}), 404

    membership_error = _verify_chama_membership(chama_id)
    if membership_error:
        return membership_error

    data = penalty_schema.load(request.get_json(silent=True) or {})
    membership = db.session.get(Membership, data["membership_id"])
    if membership is None or membership.chama_id != chama_id:
        return jsonify({
            "error": "The selected member does not belong to this Chama."
        }), 400

    user = g.current_user

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

        log_audit(
            chama_id=chama_id,
            user_id=user.id,
            action="create",
            table_name="penalties",
            record_id=new_penalty.id,
            new_values=new_penalty.to_dict(),
        )
        db.session.commit()

        return jsonify({
            "message": "Penalty applied successfully.",
            "penalty": new_penalty.to_dict(),
        }), 201
    except Exception as exc:
        db.session.rollback()
        return jsonify({
            "error": "We could not apply the penalty due to a server error. Please try again.",
            "details": str(exc),
        }), 500


@finance_bp.route("/api/chamas/<int:chama_id>/penalties", methods=["GET"])
@role_required(*ALL_CHAMA_ROLES)
def get_chama_penalties(chama_id):
    """Return paginated penalties for a Chama, optionally filtered by membership_id."""
    chama = db.session.get(Chama, chama_id)
    if chama is None:
        return jsonify({"error": f"Chama with ID {chama_id} was not found."}), 404

    membership_error = _verify_chama_membership(chama_id)
    if membership_error:
        return membership_error

    try:
        membership_id = request.args.get("membership_id", type=int)
        page = max(request.args.get("page", 1, type=int), 1)
        per_page = min(max(request.args.get("per_page", 10, type=int), 1), MAX_PER_PAGE)

        query = Penalty.query.join(Membership).filter(Membership.chama_id == chama_id)
        if membership_id:
            query = query.filter(Penalty.membership_id == membership_id)

        pagination = query.order_by(Penalty.date_applied.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )

        return jsonify({
            "total": pagination.total,
            "pages": pagination.pages,
            "current_page": pagination.page,
            "items": [p.to_dict() for p in pagination.items],
        }), 200
    except Exception as exc:
        return jsonify({
            "error": "We could not load the penalty records due to a server error.",
            "details": str(exc),
        }), 500
