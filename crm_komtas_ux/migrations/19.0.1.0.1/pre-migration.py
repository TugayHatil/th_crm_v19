# -*- coding: utf-8 -*-

def migrate(cr, version):
    """Drop the old vendor_subscription_start_date column to allow recreation as Date field."""
    cr.execute("""
        ALTER TABLE crm_lead 
        DROP COLUMN IF EXISTS vendor_subscription_start_date
    """)
