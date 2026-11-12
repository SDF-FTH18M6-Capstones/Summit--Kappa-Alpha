from datetime import datetime
from app import db

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(150), nullable=False)
    email = db.Column(db.String(254), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    phone_number = db.Column(db.String(20), nullable=True)
    role = db.Column(db.String(50), nullable=False, default='member')
    profile_image_url = db.Column(db.String(500), nullable=True)
    is_email_verified = db.Column(db.Boolean, default=False, nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

#relationships
    tokens = db.relationship('EmailVerificationToken', backref='user', lazy=True, cascade='all, delete-orphan')
    memberships = db.relationship('Membership', backref='user', lazy=True, cascade='all, delete-orphan')
    audit_logs = db.relationship('AuditLog', backref='user', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'full_name': self.full_name,
            'email': self.email,
            'phone_number': self.phone_number,
            'role': self.role,
            'profile_image_url': self.profile_image_url,
            'is_email_verified': self.is_email_verified,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat()
        }

class EmailVerificationToken(db.Model):
    __tablename__ = 'email_verification_tokens'

    id = db.Column(db.Integer, primary_key=True)
    token = db.Column(db.String(255), unique=True, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)   

    def to_dict(self):
        return {
            'id': self.id,
            'token': self.token,
            'user_id': self.user_id,
            'created_at': self.created_at.isoformat(),
            'used_at': self.used_at.isoformat() if self.used_at else None,
            'expires_at': self.expires_at.isoformat()
        } 

class Chama(db.Model):
    __tablename__ = 'chamas'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(158), unique=True, nullable=False)
    slug = db.Column(db.String(200), unique=True, nullable=False)
    description = db.Column(db.Text, nullable=True)
    location = db.Column(db.String(150), nullable=True)
    constitution = db.Column(db.Text, nullable=True)
    registration_number = db.Column(db.String(50), nullable=True)
    logo_url = db.Column(db.String(500), nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

 # relationships
    memberships = db.relationship('Membership', backref='chama', lazy=True, cascade='all, delete-orphan')
    contribution_types = db.relationship('ContributionType', backref='chama', lazy=True, cascade='all, delete-orphan')
    meetings = db.relationship('Meeting', backref='chama', lazy=True, cascade='all, delete-orphan')
    announcements = db.relationship('Announcement', backref='chama', lazy=True, cascade='all, delete-orphan')
    projects = db.relationship('Project', backref='chama', lazy=True, cascade='all, delete-orphan')
    audit_logs = db.relationship('AuditLog', backref='chama', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'slug': self.slug,
            'description': self.description,
            'location': self.location,
            'constitution': self.constitution,
            'registration_number': self.registration_number,
            'logo_url': self.logo_url,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat()
        }

class Membership(db.Model):
    __tablename__ = 'memberships'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    chama_id = db.Column(db.Integer, db.ForeignKey('chamas.id'), nullable=False)
    member_number = db.Column(db.String(50), nullable=True)
    status = db.Column(db.String(50), default='active', nullable=False) 
    joined_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

#relationships
    contributions = db.relationship('Contribution', backref='membership', lazy=True, cascade='all, delete-orphan')
    penalties = db.relationship('Penalty', backref='membership', lazy=True, cascade='all, delete-orphan')
    attendance = db.relationship('MeetingAttendance', backref='membership', lazy=True, cascade='all, delete-orphan')
    loans = db.relationship('Loan', backref='membership', lazy=True, cascade='all, delete-orphan')    

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'chama_id': self.chama_id,
            'member_number': self.member_number,
            'status': self.status,
            'joined_at': self.joined_at.isoformat()
        }   


class JoinRequest(db.Model):
    __tablename__ = 'join_requests'

    id = db.Column(db.Integer, primary_key=True)
    chama_id = db.Column(db.Integer, db.ForeignKey('chamas.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    status = db.Column(db.String(50), default='pending', nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'chama_id': self.chama_id,
            'user_id': self.user_id,
            'status': self.status,
            'created_at': self.created_at.isoformat()
        }

class ContributionType(db.Model):
    __tablename__ = 'contribution_types'

    id = db.Column(db.Integer, primary_key=True)
    chama_id = db.Column(db.Integer, db.ForeignKey('chamas.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    frequency = db.Column(db.String(50), nullable=False)
    due_day = db.Column(db.SmallInteger, nullable=True)
    grace_days = db.Column(db.SmallInteger, nullable=True)
    penalty_amount = db.Column(db.Numeric(12, 2), nullable=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)

# relationships
    contributions = db.relationship('Contribution', backref='contribution_type', lazy=True)
    penalties = db.relationship('Penalty', backref='contribution_type', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'chama_id': self.chama_id,
            'name': self.name,
            'amount': float(self.amount),
            'frequency': self.frequency,
            'due_day': self.due_day,
            'grace_days': self.grace_days,
            'penalty_amount': float(self.penalty_amount) if self.penalty_amount else None,
            'is_active': self.is_active
        }     

class Contribution(db.Model):
    __tablename__ = 'contributions'
    id = db.Column(db.Integer, primary_key=True)
    membership_id = db.Column(db.Integer, db.ForeignKey('memberships.id'), nullable=False)
    contribution_type_id = db.Column(db.Integer, db.ForeignKey('contribution_types.id'), nullable=False)
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    mpesa_code = db.Column(db.String(26), unique=True, nullable=False)
    paid_at = db.Column(db.DateTime, nullable=False)
    period_covered = db.Column(db.Date, nullable=True)
    notes = db.Column(db.Text, nullable=True)
    recorded_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

   

    def to_dict(self):
        return {
            'id': self.id,
            'membership_id': self.membership_id,
            'contribution_type_id': self.contribution_type_id,
            'amount': float(self.amount),
            'mpesa_code': self.mpesa_code,
            'paid_at': self.paid_at.isoformat(),
            'period_covered': self.period_covered.isoformat() if self.period_covered else None,
            'notes': self.notes,
            'recorded_by': self.recorded_by,
            'created_at': self.created_at.isoformat()
        } 

class Penalty(db.Model):
    __tablename__ = 'penalties'

    id = db.Column(db.Integer, primary_key=True)
    membership_id = db.Column(db.Integer, db.ForeignKey('memberships.id'), nullable=False)
    contribution_type_id = db.Column(db.Integer, db.ForeignKey('contribution_types.id'), nullable=True)
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    reason = db.Column(db.String(255), nullable=False)
    date_applied = db.Column(db.Date, nullable=False)
    status = db.Column(db.String(50), default='unpaid', nullable=False) # unpaid, paid, waived
    applied_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    def to_dict(self):
        return {
            'id': self.id,
            'membership_id': self.membership_id,
            'contribution_type_id': self.contribution_type_id,
            'amount': float(self.amount),
            'reason': self.reason,
            'date_applied': self.date_applied.isoformat(),
            'status': self.status,
            'applied_by': self.applied_by
        } 

class Meeting(db.Model):
    __tablename__ = 'meetings'

    id = db.Column(db.Integer, primary_key=True)
    chama_id = db.Column(db.Integer, db.ForeignKey('chamas.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    meeting_date = db.Column(db.DateTime, nullable=False)
    venue = db.Column(db.String(150), nullable=True)
    agenda = db.Column(db.Text, nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
# relationships
    minutes = db.relationship('MeetingMinutes', backref='meeting', lazy=True, cascade='all, delete-orphan')
    attendance = db.relationship('MeetingAttendance', backref='meeting', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'chama_id': self.chama_id,
            'title': self.title,
            'meeting_date': self.meeting_date.isoformat(),
            'venue': self.venue,
            'agenda': self.agenda,
            'created_by': self.created_by
        }    
class MeetingMinutes(db.Model):
    __tablename__ = 'meeting_minutes'

    id = db.Column(db.Integer, primary_key=True)
    meeting_id = db.Column(db.Integer, db.ForeignKey('meetings.id'), nullable=False)
    recorded_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    minutes = db.Column(db.Text, nullable=False)
    file_url = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'meeting_id': self.meeting_id,
            'recorded_by': self.recorded_by,
            'minutes': self.minutes,
            'file_url': self.file_url,
            'created_at': self.created_at.isoformat()
        }  
class MeetingAttendance(db.Model):
    __tablename__ = 'meeting_attendance'

    id = db.Column(db.Integer, primary_key=True)
    meeting_id = db.Column(db.Integer, db.ForeignKey('meetings.id'), nullable=False)
    membership_id = db.Column(db.Integer, db.ForeignKey('memberships.id'), nullable=False)
    status = db.Column(db.String(50), default='absent', nullable=False) # present, absent, excused

    def to_dict(self):
        return {
            'id': self.id,
            'meeting_id': self.meeting_id,
            'membership_id': self.membership_id,
            'status': self.status
        }


class Loan(db.Model):
    __tablename__ = 'loans'

    id = db.Column(db.Integer, primary_key=True)
    membership_id = db.Column(db.Integer, db.ForeignKey('memberships.id'), nullable=False)
    principal = db.Column(db.Numeric(12, 2), nullable=False)
    interest_rate = db.Column(db.Numeric(5, 2), nullable=False)
    term_months = db.Column(db.SmallInteger, nullable=False)
    purpose = db.Column(db.String(255), nullable=True)
    status = db.Column(db.String(50), default='pending', nullable=False) # pending, approved, rejected, repaid
    approved_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    approved_at = db.Column(db.DateTime, nullable=True)
    disbursed_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    installments = db.relationship('LoanInstallment', backref='loan', lazy=True, cascade='all, delete-orphan')
    repayments = db.relationship('LoanRepayment', backref='loan', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'membership_id': self.membership_id,
            'principal': float(self.principal) if self.principal else 0.0,
            'interest_rate': float(self.interest_rate) if self.interest_rate else 0.0,
            'term_months': self.term_months,
            'purpose': self.purpose,
            'status': self.status,
            'approved_by': self.approved_by,
            'approved_at': self.approved_at.isoformat() if self.approved_at else None,
            'disbursed_at': self.disbursed_at.isoformat() if self.disbursed_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class LoanInstallment(db.Model):
    __tablename__ = 'loan_installments'

    id = db.Column(db.Integer, primary_key=True)
    loan_id = db.Column(db.Integer, db.ForeignKey('loans.id'), nullable=False)
    due_date = db.Column(db.Date, nullable=False)
    amount_due = db.Column(db.Numeric(12, 2), nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'loan_id': self.loan_id,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'amount_due': float(self.amount_due) if self.amount_due else 0.0
        }


class LoanRepayment(db.Model):
    __tablename__ = 'loan_repayments'

    id = db.Column(db.Integer, primary_key=True)
    loan_id = db.Column(db.Integer, db.ForeignKey('loans.id'), nullable=False)
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    mpesa_code = db.Column(db.String(20), nullable=False)
    paid_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    recorded_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'loan_id': self.loan_id,
            'amount': float(self.amount) if self.amount else 0.0,
            'mpesa_code': self.mpesa_code,
            'paid_at': self.paid_at.isoformat() if self.paid_at else None,
            'recorded_by': self.recorded_by
        }


class Announcement(db.Model):
    __tablename__ = 'announcements'

    id = db.Column(db.Integer, primary_key=True)
    chama_id = db.Column(db.Integer, db.ForeignKey('chamas.id'), nullable=False)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    image_url = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'chama_id': self.chama_id,
            'created_by': self.created_by,
            'title': self.title,
            'content': self.content,
            'image_url': self.image_url,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Project(db.Model):
    __tablename__ = 'projects'

    id = db.Column(db.Integer, primary_key=True)
    chama_id = db.Column(db.Integer, db.ForeignKey('chamas.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    amount_invested = db.Column(db.Numeric(14, 2), nullable=False, default=0.0)
    status = db.Column(db.String(50), default='planning', nullable=False) # planning, active, completed
    image_url = db.Column(db.String(500), nullable=True)
    is_public = db.Column(db.Boolean, default=False, nullable=False)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'chama_id': self.chama_id,
            'title': self.title,
            'description': self.description,
            'amount_invested': float(self.amount_invested) if self.amount_invested else 0.0,
            'status': self.status,
            'image_url': self.image_url,
            'is_public': self.is_public,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class AuditLog(db.Model):
    __tablename__ = 'audit_logs'

    id = db.Column(db.Integer, primary_key=True)
    chama_id = db.Column(db.Integer, db.ForeignKey('chamas.id'), nullable=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    action = db.Column(db.String(50), nullable=False)
    table_name = db.Column(db.String(50), nullable=False)
    record_id = db.Column(db.Integer, nullable=True)
    old_values = db.Column(db.JSON, nullable=True)
    new_values = db.Column(db.JSON, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'chama_id': self.chama_id,
            'user_id': self.user_id,
            'action': self.action,
            'table_name': self.table_name,
            'record_id': self.record_id,
            'old_values': self.old_values,
            'new_values': self.new_values,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }           