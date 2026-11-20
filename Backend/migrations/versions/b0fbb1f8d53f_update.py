"""update

Revision ID: b0fbb1f8d53f
Revises: 0b2efc9ed4c2
Create Date: 2026-11-19 23:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b0fbb1f8d53f'
down_revision = '0b2efc9ed4c2'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('chamas', schema=None) as batch_op:
        batch_op.add_column(sa.Column('default_interest_rate', sa.Numeric(precision=5, scale=2), server_default='10.0', nullable=False))
        batch_op.add_column(sa.Column('max_loan_amount', sa.Numeric(precision=12, scale=2), server_default='100000.0', nullable=False))


def downgrade():
    with op.batch_alter_table('chamas', schema=None) as batch_op:
        batch_op.drop_column('max_loan_amount')
        batch_op.drop_column('default_interest_rate')
