"""
Financial Management HTTP Routes (/api/chamas/<id>/contributions, /loans/*, /penalties).
Thin controller layer — all database logic lives in app/finance/services.py.
"""

from flask import Blueprint, g, jsonify, request
from marshmallow import ValidationError

from app.finance.services import (
    create_contribution_service,
    create_contribution_type_service,
    create_loan_repayment_service,
    create_loan_service,
    create_penalty_service,
    get_chama_loans_service,
    get_chama_penalties_service,
    get_contribution_types_service,
    get_contributions_service,
    get_financial_summary_service,
    get_loan_installments_service,
    get_loan_repayments_service,
    loan_decision_service,
    pay_penalty_service,
)

from app.utils.decorators import role_required
from app.utils.exceptions import AppError
from app.utils.schemas import (
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
    return jsonify({"error": "Please check the highlighted financial form fields and try again.", "errors": err.messages}), 400


@finance_bp.errorhandler(AppError)
def handle_app_error(err):
    payload = {"error": err.message}
    if err.errors:
        payload["errors"] = err.errors
    return jsonify(payload), err.status_code


@finance_bp.route("/api/chamas/<int:chama_id>/contribution-types", methods=["POST"])
@role_required(*FINANCE_WRITE_ROLES)
def create_contribution_type(chama_id):
    data = contrib_type_schema.load(request.get_json(silent=True) or {})
    return jsonify(create_contribution_type_service(chama_id, g.current_user, data)), 201


@finance_bp.route("/api/chamas/<int:chama_id>/contribution-types", methods=["GET"])
@role_required(*ALL_CHAMA_ROLES)
def get_contribution_types(chama_id):
    return jsonify(get_contribution_types_service(chama_id, g.current_user)), 200


@finance_bp.route("/api/chamas/<int:chama_id>/contributions", methods=["POST"])
@role_required(*FINANCE_WRITE_ROLES)
def create_contribution(chama_id):
    data = contrib_schema.load(request.get_json(silent=True) or {})
    return jsonify(create_contribution_service(chama_id, g.current_user, data)), 201


@finance_bp.route("/api/chamas/<int:chama_id>/contributions", methods=["GET"])
@role_required(*ALL_CHAMA_ROLES)
def get_contributions(chama_id):
    result = get_contributions_service(
        chama_id=chama_id,
        user=g.current_user,
        membership_id=request.args.get("membership_id", type=int),
        page=request.args.get("page", 1, type=int),
        per_page=request.args.get("per_page", 10, type=int),
    )
    return jsonify(result), 200


@finance_bp.route("/api/chamas/<int:chama_id>/loans", methods=["POST"])
@role_required(*ALL_CHAMA_ROLES)
def create_loan(chama_id):
    data = loan_request_schema.load(request.get_json(silent=True) or {})
    return jsonify(create_loan_service(chama_id, g.current_user, data)), 201


@finance_bp.route("/api/loans/<int:loan_id>/decision", methods=["PATCH"])
@role_required(*FINANCE_WRITE_ROLES)
def loan_decision(loan_id):
    payload = request.get_json(silent=True) or {}
    return jsonify(loan_decision_service(loan_id, g.current_user, payload)), 200


@finance_bp.route("/api/chamas/<int:chama_id>/loans", methods=["GET"])
@role_required(*ALL_CHAMA_ROLES)
def get_chama_loans(chama_id):
    result = get_chama_loans_service(
        chama_id=chama_id,
        user=g.current_user,
        membership_id=request.args.get("membership_id", type=int),
        status_filter=request.args.get("status", type=str),
        page=request.args.get("page", 1, type=int),
        per_page=request.args.get("per_page", 10, type=int),
    )
    return jsonify(result), 200


@finance_bp.route("/api/loans/<int:loan_id>/repayments", methods=["POST"])
@role_required(*FINANCE_WRITE_ROLES)
def create_loan_repayment(loan_id):
    data = loan_repayment_schema.load(request.get_json(silent=True) or {})
    return jsonify(create_loan_repayment_service(loan_id, g.current_user, data)), 201


@finance_bp.route("/api/loans/<int:loan_id>/repayments", methods=["GET"])
@role_required(*ALL_CHAMA_ROLES)
def get_loan_repayments(loan_id):
    result = get_loan_repayments_service(
        loan_id=loan_id,
        user=g.current_user,
        page=request.args.get("page", 1, type=int),
        per_page=request.args.get("per_page", 10, type=int),
    )
    return jsonify(result), 200


@finance_bp.route("/api/loans/<int:loan_id>/installments", methods=["GET"])
@role_required(*ALL_CHAMA_ROLES)
def get_loan_installments(loan_id):
    return jsonify(get_loan_installments_service(loan_id, g.current_user)), 200


@finance_bp.route("/api/chamas/<int:chama_id>/financial-summary", methods=["GET"])
@role_required(*ALL_CHAMA_ROLES)
def get_financial_summary(chama_id):
    return jsonify(get_financial_summary_service(chama_id, g.current_user)), 200


@finance_bp.route("/api/chamas/<int:chama_id>/penalties", methods=["POST"])
@role_required(*FINANCE_WRITE_ROLES)
def create_penalty(chama_id):
    data = penalty_schema.load(request.get_json(silent=True) or {})
    return jsonify(create_penalty_service(chama_id, g.current_user, data)), 201


@finance_bp.route("/api/chamas/<int:chama_id>/penalties", methods=["GET"])
@role_required(*ALL_CHAMA_ROLES)
def get_chama_penalties(chama_id):
    result = get_chama_penalties_service(
        chama_id=chama_id,
        user=g.current_user,
        membership_id=request.args.get("membership_id", type=int),
        status_filter=request.args.get("status", type=str),
        page=request.args.get("page", 1, type=int),
        per_page=request.args.get("per_page", 10, type=int),
    )
    return jsonify(result), 200


@finance_bp.route("/api/penalties/<int:penalty_id>/pay", methods=["PATCH"])
@role_required(*FINANCE_WRITE_ROLES)
def pay_penalty(penalty_id):
    return jsonify(pay_penalty_service(penalty_id, g.current_user)), 200
