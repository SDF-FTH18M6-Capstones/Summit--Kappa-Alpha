from flask import Blueprint, jsonify, request
from calendar import monthrange
from datetime import date, datetime, timezone
from app import db
from app.models import Contribution, ContributionType, Loan, LoanInstallment, LoanRepayment, Membership, Penalty
from flask_jwt_extended import get_jwt_identity, jwt_required

finance_bp = Blueprint('finance_bp', __name__)


def _json_object():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return None, (jsonify({'error': 'Request body must be a JSON object.'}), 400)
    return data, None


def _loan_total_repayable(loan):
    principal = float(loan.principal)
    interest_rate = float(loan.interest_rate)
    return principal + principal * (interest_rate / 100) * (loan.term_months / 12)


def _add_months(value, months):
    month_index = value.month - 1 + months
    year = value.year + month_index // 12
    month = month_index % 12 + 1
    return date(year, month, min(value.day, monthrange(year, month)[1]))


# Mpesa Contributions Endpoints

@finance_bp.route('/api/chamas/<int:chama_id>/contributions', methods=['POST'])
def create_contribution(chama_id):
    data, error = _json_object()
    if error:
        return error

    required_fields = ['membership_id', 'contribution_type_id', 'amount', 'mpesa_code', 'paid_at', 'recorded_by']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing field: {field}'}), 400

    try:
        membership_id = int(data['membership_id'])
        contribution_type_id = int(data['contribution_type_id'])
        recorded_by = int(data['recorded_by'])
        amount = float(data['amount'])
        mpesa_code = data['mpesa_code'].strip().upper()
        paid_at = datetime.fromisoformat(data['paid_at'])
        period_covered = (
            datetime.strptime(data['period_covered'], '%Y-%m-%d').date()
            if data.get('period_covered') else None
        )
    except (AttributeError, TypeError, ValueError):
        return jsonify({'error': 'Invalid contribution field value or date format.'}), 400

    if amount <= 0 or not mpesa_code:
        return jsonify({'error': 'amount must be positive and mpesa_code must not be empty.'}), 400

    membership = db.session.get(Membership, membership_id)
    contribution_type = db.session.get(ContributionType, contribution_type_id)
    if membership is None or membership.chama_id != chama_id:
        return jsonify({'error': 'membership_id does not belong to this chama.'}), 400
    if contribution_type is None or contribution_type.chama_id != chama_id:
        return jsonify({'error': 'contribution_type_id does not belong to this chama.'}), 400

    existing = Contribution.query.filter_by(mpesa_code=mpesa_code).first()
    if existing:
        return jsonify({'error': 'Duplicate M-Pesa transaction code detected.'}), 409

    try:
        new_contribution = Contribution(
            membership_id=membership_id,
            contribution_type_id=contribution_type_id,
            amount=amount,
            mpesa_code=mpesa_code,
            paid_at=paid_at,
            recorded_by=recorded_by,
            period_covered=period_covered,
        )
        db.session.add(new_contribution)
        db.session.commit()
        return jsonify({
            'message': 'Contribution recorded successfully',
            'contribution': new_contribution.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@finance_bp.route('/api/chamas/<int:chama_id>/contributions', methods=['GET'])
def get_contributions(chama_id):
    #Optional query parameters for filtering by user_id and pagination
    user_id = request.args.get('user_id', type=int)
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)

    query = Contribution.query.join(Membership).filter(Membership.chama_id == chama_id)

    if user_id:
        query = query.filter(Membership.user_id == user_id)

    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    contributions = pagination.items

    return jsonify({
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': pagination.page,
        'contributions': [contribution.to_dict() for contribution in contributions]
    }), 200
#Loan Requests and Approvals Endpoints
@finance_bp.route('/api/chamas/<int:chama_id>/loans', methods=['POST'])
def create_loan(chama_id):
    data, error = _json_object()
    if error:
        return error

    required_fields = ['membership_id', 'principal', 'interest_rate', 'term_months']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing field: {field}'}), 400

    try:
        membership_id = int(data['membership_id'])
        principal = float(data['principal'])
        interest_rate = float(data['interest_rate'])
        term_months = int(data['term_months'])
    except (TypeError, ValueError):
        return jsonify({'error': 'membership_id, principal, interest_rate, and term_months must be valid numbers.'}), 400

    membership = db.session.get(Membership, membership_id)
    if membership is None or membership.chama_id != chama_id:
        return jsonify({'error': 'membership_id does not belong to this chama.'}), 400
    if principal <= 0 or interest_rate < 0 or term_months <= 0:
        return jsonify({'error': 'principal and term_months must be positive; interest_rate cannot be negative.'}), 400

    # Auto-calculate total repayable and monthly installment based on simple interest formula
    total_interest = principal * (interest_rate / 100) * (term_months / 12)
    total_repayable = principal + total_interest
    monthly_installment = total_repayable / term_months

    try:
        new_loan = Loan(
            membership_id=membership_id,
            principal=principal,
            interest_rate=interest_rate,
            term_months=term_months,
            purpose=data.get('purpose'),
            status='pending'
        )
        db.session.add(new_loan)
        db.session.commit()

        loan_dict = new_loan.to_dict()
        loan_dict['total_repayable'] = round(total_repayable, 2)
        loan_dict['monthly_installment'] = round(monthly_installment, 2)

        return jsonify({
            'message': 'Loan requested successfully',
            'loan': loan_dict
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@finance_bp.route("/api/chamas/<int:chama_id>/loans/<int:loan_id>/decision", methods=["PATCH"])
@jwt_required()
def loan_decision(loan_id, chama_id):
    loan = db.session.get(Loan, loan_id)
    if loan is None:
        return jsonify({"error": "Loan not found"}), 404
    if loan.membership.chama_id != chama_id:
        return jsonify({"error": "Loan does not belong to this chama"}), 404

    data, error = _json_object()
    if error:
        return error
    status = data.get("status")

    if status not in ("approved", "rejected", "disbursed"):
        return jsonify({"error": "Invalid or missing status. Must be 'approved', 'rejected', or 'disbursed'."}), 400

    current_user_id = int(get_jwt_identity())

    if status == "approved":
        loan.status = "approved"
        loan.approved_by = current_user_id
        loan.approved_at = datetime.now(timezone.utc).replace(tzinfo=None)

        if not loan.installments:
            monthly_amount = round(_loan_total_repayable(loan) / loan.term_months, 2)
            first_due_date = datetime.now(timezone.utc).date()
            for i in range(1, loan.term_months + 1):
                installment = LoanInstallment(
                    loan_id=loan.id,
                    amount_due=monthly_amount,
                    due_date=_add_months(first_due_date, i)
                )
                db.session.add(installment)

    elif status == "disbursed":
        loan.status = "disbursed"
        loan.disbursed_at = datetime.now(timezone.utc).replace(tzinfo=None)

    elif status == "rejected":
        loan.status = "rejected"

    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

    return jsonify({
        "message": f"Loan status updated to {status}",
        "loan_id": loan.id,
        "status": loan.status
    }), 200

@finance_bp.route('/api/chamas/<int:chama_id>/loans', methods=['GET'])
def get_chama_loans(chama_id):
    loans = Loan.query.join(Membership).filter(Membership.chama_id == chama_id).all()

    result = []
    for loan in loans:
        d=loan.to_dict()
        # Calculate total repayable and monthly installment based on simple interest formula
        term = int(loan.term_months)
        total_repayable = _loan_total_repayable(loan)
        d['total_repayable'] = round(total_repayable, 2)
        d['monthly_installment'] = round(total_repayable / term, 2) if term > 0 else total_repayable
        result.append(d)

    return jsonify(result), 200

@finance_bp.route('/api/chamas/<int:chama_id>/loans/<int:loan_id>/approve', methods=['POST'])
def approve_loan(chama_id, loan_id):
    data, error = _json_object()
    if error:
        return error

    loan = db.session.get(Loan, loan_id)
    if loan is None:
        return jsonify({'error': 'Loan not found'}), 404
    if loan.membership.chama_id != chama_id:
        return jsonify({'error': 'Loan does not belong to this chama'}), 404

    status = data.get('status')
    approved_by = data.get('approved_by')

    if status not in ['approved', 'rejected']:
        return jsonify({'error': 'Invalid status. Must be "approved" or "rejected".'}), 400

    loan.status = status
    if status == 'approved':
        if not approved_by:
            return jsonify({'error': 'approved_by is required when approving a loan.'}), 400
        loan.approved_by = approved_by
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        loan.approved_at = now
        loan.disbursed_at = now

    try:
        db.session.commit()
        return jsonify({'message': f'Loan {status} successfully', 'loan': loan.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@finance_bp.route("/api/chamas/<int:chama_id>/loans/<int:loan_id>/repayments", methods=["POST"])
@jwt_required()
def create_loan_repayment(chama_id, loan_id):
    loan = db.session.get(Loan, loan_id)
    if loan is None:
        return jsonify({"error": "Loan not found"}), 404
    if loan.membership.chama_id != chama_id:
        return jsonify({"error": "Loan does not belong to this chama"}), 404

    data, error = _json_object()
    if error:
        return error
    amount = data.get("amount")
    mpesa_code = data.get("mpesa_code")
    paid_at = data.get("paid_at")

    try:
        amount = float(amount)
        mpesa_code = mpesa_code.strip().upper()
        paid_at = datetime.fromisoformat(paid_at) if paid_at else datetime.now(timezone.utc).replace(tzinfo=None)
    except (AttributeError, TypeError, ValueError):
        return jsonify({"error": "amount and mpesa_code are required; paid_at must be an ISO-8601 date if supplied."}), 400

    if amount <= 0 or not mpesa_code:
        return jsonify({"error": "amount must be positive and mpesa_code must not be empty."}), 400

    existing_repayment = LoanRepayment.query.filter_by(mpesa_code=mpesa_code).first()
    if existing_repayment:
        return jsonify({"error": "Duplicate M-Pesa transaction code detected"}), 409

    current_user_id = int(get_jwt_identity())

    repayment = LoanRepayment(
        loan_id=loan.id,
        amount=amount,
        mpesa_code=mpesa_code,
        paid_at=paid_at,
        recorded_by=current_user_id
    )
    previous_total = db.session.query(db.func.sum(LoanRepayment.amount)).filter_by(loan_id=loan.id).scalar() or 0
    total_repaid = float(previous_total) + amount
    db.session.add(repayment)
    if total_repaid >= _loan_total_repayable(loan):
        loan.status = "repaid"

    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

    return jsonify({
        "message": "Loan repayment recorded successfully",
        "repayment_id": repayment.id,
        "total_repaid": total_repaid,
        "loan_status": loan.status
    }), 201


@finance_bp.route("/api/chamas/<int:chama_id>/loans/<int:loan_id>/repayments", methods=["GET"])
@jwt_required()
def get_loan_repayments(chama_id, loan_id):
    loan = db.session.get(Loan, loan_id)
    if loan is None:
        return jsonify({"error": "Loan not found"}), 404
    if loan.membership.chama_id != chama_id:
        return jsonify({"error": "Loan does not belong to this chama"}), 404

    repayments = LoanRepayment.query.filter_by(loan_id=loan.id).all()

    return jsonify([{
        "id": r.id,
        "loan_id": r.loan_id,
        "amount": r.amount,
        "mpesa_code": r.mpesa_code,
        "paid_at": r.paid_at.isoformat() if r.paid_at else None,
        "recorded_by": r.recorded_by
    } for r in repayments]), 200

#Penalty Endpoints
@finance_bp.route('/api/chamas/<int:chama_id>/penalties', methods=['POST'])
def create_penalty(chama_id):
    data, error = _json_object()
    if error:
        return error

    required_fields = ['membership_id', 'amount', 'reason', 'applied_by', 'date_applied']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing field: {field}'}), 400

    try:
        membership_id = int(data['membership_id'])
        applied_by = int(data['applied_by'])
        amount = float(data['amount'])
        date_applied = datetime.strptime(data['date_applied'], '%Y-%m-%d').date()
    except (TypeError, ValueError):
        return jsonify({'error': 'membership_id, applied_by, amount, and date_applied must have valid values.'}), 400

    membership = db.session.get(Membership, membership_id)
    if membership is None or membership.chama_id != chama_id:
        return jsonify({'error': 'membership_id does not belong to this chama.'}), 400
    if amount <= 0:
        return jsonify({'error': 'amount must be positive.'}), 400

    try:
        new_penalty = Penalty(
            membership_id=membership_id,
            contribution_type_id=data.get('contribution_type_id'),
            amount=amount,
            reason=data['reason'],
            date_applied=date_applied,
            status='unpaid',
            applied_by=applied_by

        )
        db.session.add(new_penalty)
        db.session.commit()
        return jsonify({
            'message': 'Penalty recorded successfully',
            'penalty': new_penalty.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@finance_bp.route('/api/chamas/<int:chama_id>/penalties', methods=['GET'])
def get_chama_penalties(chama_id):
    penalties = Penalty.query.join(Membership).filter(Membership.chama_id == chama_id).all()
    return jsonify([penalty.to_dict() for penalty in penalties]), 200
