from calendar import monthrange
from datetime import date, datetime, timezone
from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from marshmallow import ValidationError
from app.decorators import log_audit, role_required
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


@finance_bp.errorhandler(ValidationError)
def handle_validation_error(err):
    return jsonify({"errors": err.messages}), 400


def _add_months(value, months):
    month_index = value.month - 1 + months
    year = value.year + month_index // 12
    month = month_index % 12 + 1
    return date(year, month, min(value.day, monthrange(year, month)[1]))


def _loan_total_repayable(loan):
    return round(float(loan.principal) * (1 + float(loan.interest_rate) / 100), 2)


# ==========================================
# 1. CONTRIBUTION TYPES ENDPOINTS
# ==========================================

@finance_bp.route("/api/chamas/<int:chama_id>/contribution-types", methods=["POST"])
@role_required(*FINANCE_WRITE_ROLES)
def create_contribution_type(chama_id):
    db.get_or_404(Chama, chama_id)
    data = contrib_type_schema.load(request.get_json(silent=True) or {})

    name = data["name"].strip()
    if ContributionType.query.filter_by(chama_id=chama_id, name=name).first():
        return jsonify({"error": f"Contribution type '{name}' already exists."}), 409

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
            chama_id,
            int(get_jwt_identity()),
            "create",
            "contribution_types",
            new_type.id,
            new_values=new_type.to_dict(),
        )
        db.session.commit()
        return jsonify({
            "message": "Contribution type created successfully",
            "contribution_type": new_type.to_dict(),
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@finance_bp.route("/api/chamas/<int:chama_id>/contribution-types", methods=["GET"])
@role_required(*ALL_CHAMA_ROLES)
def get_contribution_types(chama_id):
    types = ContributionType.query.filter_by(chama_id=chama_id).all()
    return jsonify([t.to_dict() for t in types]), 200


# ==========================================
# 2. CONTRIBUTIONS ENDPOINTS
# ==========================================

@finance_bp.route("/api/chamas/<int:chama_id>/contributions", methods=["POST"])
@role_required(*FINANCE_WRITE_ROLES)
def create_contribution(chama_id):
    data = contrib_schema.load(request.get_json(silent=True) or {})

    membership = db.session.get(Membership, data["membership_id"])
    if membership is None or membership.chama_id != chama_id:
        return jsonify({"error": "Membership does not belong to this chama"}), 400

    ctype = db.session.get(ContributionType, data["contribution_type_id"])
    if ctype is None or ctype.chama_id != chama_id:
        return jsonify({"error": "Contribution type does not belong to this chama"}), 400

    mpesa_code = data["mpesa_code"].strip().upper()
    existing = Contribution.query.filter_by(mpesa_code=mpesa_code).first()
    if existing:
        return jsonify({"error": "Duplicate M-Pesa transaction code detected."}), 409

    current_user_id = int(get_jwt_identity())

    try:
        new_contribution = Contribution(
            membership_id=data["membership_id"],
            contribution_type_id=data["contribution_type_id"],
            amount=data["amount"],
            mpesa_code=mpesa_code,
            paid_at=data["paid_at"],
            recorded_by=current_user_id,
            period_covered=data.get("period_covered"),
            notes=data.get("notes"),
        )
        db.session.add(new_contribution)
        db.session.flush()
        log_audit(
            chama_id,
            current_user_id,
            "create",
            "contributions",
            new_contribution.id,
            new_values=new_contribution.to_dict(),
        )
        db.session.commit()
        return jsonify({
            "message": "Contribution recorded successfully",
            "contribution": new_contribution.to_dict(),
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@finance_bp.route("/api/chamas/<int:chama_id>/contributions", methods=["GET"])
@role_required(*ALL_CHAMA_ROLES)
def get_contributions(chama_id):
    membership_id = request.args.get("membership_id", type=int)
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 10, type=int)

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


# ==========================================
# 3. LOAN REQUESTS, APPROVALS & REPAYMENTS
# ==========================================

@finance_bp.route("/api/chamas/<int:chama_id>/loans", methods=["POST"])
@role_required(*ALL_CHAMA_ROLES)
def create_loan(chama_id):
    data = loan_request_schema.load(request.get_json(silent=True) or {})

    membership = db.session.get(Membership, data["membership_id"])
    if membership is None or membership.chama_id != chama_id:
        return jsonify({"error": "Membership does not belong to this chama"}), 400

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
            chama_id,
            int(get_jwt_identity()),
            "create",
            "loans",
            new_loan.id,
            new_values=new_loan.to_dict(),
        )
        db.session.commit()

        loan_dict = new_loan.to_dict()
        total_repayable = _loan_total_repayable(new_loan)
        loan_dict["total_repayable"] = total_repayable
        loan_dict["monthly_installment"] = round(total_repayable / new_loan.term_months, 2)

        return jsonify({
            "message": "Loan requested successfully",
            "loan": loan_dict,
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@finance_bp.route("/api/loans/<int:loan_id>/decision", methods=["PATCH"])
@role_required(*FINANCE_WRITE_ROLES)
def loan_decision(loan_id):
    loan = db.session.get(Loan, loan_id)
    if loan is None:
        return jsonify({"error": "Loan not found"}), 404

    data = request.get_json(silent=True) or {}
    decision = data.get("status")
    if decision not in ("approved", "rejected"):
        return jsonify({"error": "Status must be 'approved' or 'rejected'"}), 400

    old_status = loan.status
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    loan.status = decision
    loan.approved_by = int(get_jwt_identity())
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
        loan.membership.chama_id,
        int(get_jwt_identity()),
        "update",
        "loans",
        loan.id,
        old_values={"status": old_status},
        new_values={"status": decision},
    )
    db.session.commit()
    return jsonify({"message": f"Loan {decision}", "loan": loan.to_dict()}), 200


@finance_bp.route("/api/chamas/<int:chama_id>/loans", methods=["GET"])
@role_required(*ALL_CHAMA_ROLES)
def get_chama_loans(chama_id):
    membership_id = request.args.get("membership_id", type=int)
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 10, type=int)

    query = Loan.query.join(Membership).filter(Membership.chama_id == chama_id)
    if membership_id:
        query = query.filter(Loan.membership_id == membership_id)
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    result = []
    for loan in pagination.items:
        d = loan.to_dict()
        total_repayable = _loan_total_repayable(loan)
        term = int(loan.term_months)
        d["monthly_installment"] = round(total_repayable / term, 2) if term > 0 else total_repayable
        result.append(d)

    return jsonify({
        "items": result,
        "total": pagination.total,
        "pages": pagination.pages,
        "current_page": pagination.page,
    }), 200


@finance_bp.route("/api/loans/<int:loan_id>/repayments", methods=["POST"])
@role_required(*FINANCE_WRITE_ROLES)
def create_loan_repayment(loan_id):
    loan = db.session.get(Loan, loan_id)
    if loan is None:
        return jsonify({"error": "Loan not found"}), 404

    data = loan_repayment_schema.load(request.get_json(silent=True) or {})
    mpesa_code = data["mpesa_code"].strip().upper()
    if LoanRepayment.query.filter_by(mpesa_code=mpesa_code).first():
        return jsonify({"error": "Duplicate M-Pesa transaction code detected."}), 409

    repayment = LoanRepayment(
        loan_id=loan.id,
        amount=data["amount"],
        mpesa_code=mpesa_code,
        paid_at=data["paid_at"],
        recorded_by=int(get_jwt_identity()),
    )
    db.session.add(repayment)
    db.session.flush()

    total_paid = sum(float(r.amount) for r in loan.repayments)
    if total_paid >= _loan_total_repayable(loan):
        loan.status = "repaid"

    log_audit(
        loan.membership.chama_id,
        int(get_jwt_identity()),
        "create",
        "loan_repayments",
        repayment.id,
        new_values={**repayment.to_dict(), "loan_status": loan.status},
    )
    db.session.commit()
    return jsonify({
        "message": "Repayment recorded successfully",
        "repayment": repayment.to_dict(),
    }), 201


@finance_bp.route("/api/loans/<int:loan_id>/repayments", methods=["GET"])
@role_required(*ALL_CHAMA_ROLES)
def get_loan_repayments(loan_id):
    loan = db.session.get(Loan, loan_id)
    if loan is None:
        return jsonify({"error": "Loan not found"}), 404

    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 10, type=int)
    pagination = LoanRepayment.query.filter_by(loan_id=loan.id).paginate(
        page=page, per_page=per_page, error_out=False
    )
    return jsonify({
        "items": [r.to_dict() for r in pagination.items],
        "total": pagination.total,
        "pages": pagination.pages,
        "current_page": pagination.page,
    }), 200


@finance_bp.route("/api/loans/<int:loan_id>/installments", methods=["GET"])
@jwt_required()
def get_loan_installments(loan_id):
    loan = db.session.get(Loan, loan_id)
    if loan is None:
        return jsonify({"error": "Loan not found"}), 404

    installments = LoanInstallment.query.filter_by(loan_id=loan.id).all()
    return jsonify([
        {
            "id": inst.id,
            "loan_id": inst.loan_id,
            "amount_due": float(inst.amount_due),
            "due_date": inst.due_date.isoformat() if inst.due_date else None,
            "status": getattr(inst, "status", "pending"),
        }
        for inst in installments
    ]), 200


@finance_bp.route("/api/chamas/<int:chama_id>/financial-summary", methods=["GET"])
@jwt_required()
def get_financial_summary(chama_id):
    db.get_or_404(Chama, chama_id)

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


# ==========================================
# 4. PENALTIES ENDPOINTS
# ==========================================

@finance_bp.route("/api/chamas/<int:chama_id>/penalties", methods=["POST"])
@role_required(*FINANCE_WRITE_ROLES)
def create_penalty(chama_id):
    data = penalty_schema.load(request.get_json(silent=True) or {})
    membership = db.session.get(Membership, data["membership_id"])
    if membership is None or membership.chama_id != chama_id:
        return jsonify({"error": "Membership does not belong to this chama"}), 400

    try:
        new_penalty = Penalty(
            membership_id=data["membership_id"],
            contribution_type_id=data.get("contribution_type_id"),
            amount=data["amount"],
            reason=data["reason"],
            date_applied=data["date_applied"],
            status="unpaid",
            applied_by=int(get_jwt_identity()),
        )
        db.session.add(new_penalty)
        db.session.flush()
        log_audit(
            chama_id,
            int(get_jwt_identity()),
            "create",
            "penalties",
            new_penalty.id,
            new_values=new_penalty.to_dict(),
        )
        db.session.commit()
        return jsonify({
            "message": "Penalty applied successfully",
            "penalty": new_penalty.to_dict(),
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@finance_bp.route("/api/chamas/<int:chama_id>/penalties", methods=["GET"])
@role_required(*ALL_CHAMA_ROLES)
def get_chama_penalties(chama_id):
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 10, type=int)
    query = Penalty.query.join(Membership).filter(Membership.chama_id == chama_id)
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    return jsonify({
        "total": pagination.total,
        "pages": pagination.pages,
        "current_page": pagination.page,
        "items": [p.to_dict() for p in pagination.items],
    }), 200