# -*- coding: utf-8 -*-

def migrate(cr, version):
    """Drop the old informatica_solution_id column to allow recreation as Many2one field."""
    cr.execute("""
        ALTER TABLE crm_lead 
        DROP COLUMN IF EXISTS informatica_solution_id
    """)
