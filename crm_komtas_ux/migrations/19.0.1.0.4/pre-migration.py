# -*- coding: utf-8 -*-

def migrate(cr, version):
    """Change authority column type from text to varchar."""
    cr.execute("""
        ALTER TABLE crm_lead 
        ALTER COLUMN authority TYPE varchar
    """)
