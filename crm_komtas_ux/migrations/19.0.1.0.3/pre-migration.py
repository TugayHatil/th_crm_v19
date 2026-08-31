# -*- coding: utf-8 -*-

def migrate(cr, version):
    """Rename informatica_pipeline_id column to pipeline_id."""
    cr.execute("""
        ALTER TABLE crm_lead 
        RENAME COLUMN informatica_pipeline_id TO pipeline_id
    """)
