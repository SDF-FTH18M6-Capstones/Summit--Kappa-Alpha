from marshmallow import Schema, fields, validate

Kenyan_Tel_Regex = r'^(?:254|0)\d{9}$'

class JoinRequestSchema(Schema):
    full_name = fields.Str(required=True, validate=validate.Length(min=3, max=150, error="Full name must be between 3 and 150 characters."))
    email = fields.Email(required=True, error_messages={"invalid":"Please enter a valid email address."})
    phone_number = fields.Str(required=True, validate=validate.Regexp(Kenyan_Tel_Regex, error="Phone number must use format 2547XXXXXXXX or 07XXXXXXXX."))
    message = fields.Str(required=False, allow_none=True)

class ProjectSchema(Schema):
    title = fields.Str(required=True, validate=validate.Length(min=3, max=200, error="Project title must be between 3 and 200 characters."))
    description = fields.Str(required=False, allow_none=True)
    amount_invested = fields.Float(load_default=0.0, validate=validate.Range(min=0.0, error="Amount invested cannot be negative."))
    status = fields.Str(load_default="planned", validate=validate.OneOf(['planned', 'ongoing', 'completed'], error="Status must be planned, ongoing, or completed."))
    image_url = fields.Str(required=False, allow_none=True)
    is_public = fields.Bool(load_default=True)

class ContributionTypeSchema(Schema):
    name = fields.Str(required=True, validate=validate.Length(min=2, max=100, error="Contribution type name must be between 2 and 100 characters."))
    amount = fields.Float(required=True, validate=validate.Range(min=1, error="Contribution amount must be greater than 0."))
    frequency = fields.Str(required=True, validate=validate.OneOf(['weekly', 'monthly', 'one_off'], error="Frequency must be weekly, monthly, or one_off."))
    due_day = fields.Int(required=False, allow_none=True, validate=validate.Range(min=1, max=31, error="Due day must be between 1 and 31."))
    grace_days = fields.Int(load_default=0, validate=validate.Range(min=0, max=30, error="Grace days must be between 0 and 30."))
    penalty_amount = fields.Float(load_default=0.0, validate=validate.Range(min=0, error="Penalty amount cannot be negative."))
class ContributionSchema(Schema):
    membership_id = fields.Int(required=True)
    contribution_type_id = fields.Int(required=True)
    amount = fields.Float(required=True, validate=validate.Range(min=1, error="Contribution amount must be greater than 0."))
    mpesa_code = fields.Str(required=True, validate=validate.Length(equal=10, error="M-Pesa transaction code must be strictly 10 characters."))
    paid_at = fields.DateTime(required=True)
    period_covered = fields.Date(required=False, allow_none=True)
    notes = fields.Str(required=False, allow_none=True, validate=validate.Length(max=255, error="Notes cannot exceed 255 characters."))
class LoanRequestSchema(Schema):
    membership_id = fields.Int(required=True)
    principal = fields.Float(required=True, validate=validate.Range(min=500, error="Minimum loan principal is KES 500."))
    interest_rate = fields.Float(required=True, validate=validate.Range(min=0, max=100, error="Interest rate must be between 0% and 100%."))
    term_months = fields.Int(required=True, validate=validate.Range(min=1, max=36, error="Loan term must be between 1 and 36 months."))
    purpose = fields.Str(required=False, allow_none=True, validate=validate.Length(max=255, error="Purpose cannot exceed 255 characters."))
class LoanRepaymentSchema(Schema):
    amount = fields.Float(required=True, validate=validate.Range(min=1, error="Repayment amount must be greater than 0."))
    mpesa_code = fields.Str(required=True, validate=validate.Length(equal=10, error="M-Pesa transaction code must be strictly 10 characters."))
    paid_at = fields.DateTime(required=True)


class PenaltySchema(Schema):
    membership_id = fields.Int(required=True)
    contribution_type_id = fields.Int(required=False, allow_none=True)
    amount = fields.Float(required=True, validate=validate.Range(min=1, error="Penalty amount must be greater than 0."))
    reason = fields.Str(required=True, validate=validate.Length(min=3, max=255, error="Reason must be between 3 and 255 characters."))
    date_applied = fields.Date(required=True)
class MeetingSchema(Schema):
    title = fields.Str(required=True, validate=validate.Length(min=3, max=200, error="Meeting title must be between 3 and 200 characters."))
    meeting_date = fields.DateTime(required=True)
    venue = fields.Str(required=False, allow_none=True, validate=validate.Length(max=150, error="Venue cannot exceed 150 characters."))
    agenda = fields.Str(required=False, allow_none=True)


class MeetingMinutesSchema(Schema):
    minutes = fields.Str(required=True, validate=validate.Length(min=5, error="Meeting minutes must be at least 5 characters long."))
    file_url = fields.Str(required=False, allow_none=True)


class MeetingAttendanceSchema(Schema):
    membership_id = fields.Int(required=True)
    status = fields.Str(required=True, validate=validate.OneOf(['present', 'absent', 'apology'], error="Attendance status must be present, absent, or apology."))


class AnnouncementSchema(Schema):
    title = fields.Str(required=True, validate=validate.Length(min=3, max=200, error="Announcement title must be between 3 and 200 characters."))
    content = fields.Str(required=True, validate=validate.Length(min=3, error="Announcement content cannot be empty."))
    image_url = fields.Str(required=False, allow_none=True)
