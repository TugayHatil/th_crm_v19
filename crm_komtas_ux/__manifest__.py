# -*- coding: utf-8 -*-

{
    'name': 'CRM Komtas UX',
    'version': '19.0.1.0.4',
    'category': 'CRM',
    'summary': 'Extend CRM lead qualification fields',
    'description': """
        CRM Komtas UX Module
        ====================
        This module extends the CRM Lead model with additional qualification fields.
    """,
    'author': 'Projet Solutions',
    'website': 'https://github.com/TugayHatil/crm_komtas_ux',
    'license': 'LGPL-3',
    'depends': ['crm'],
    'data': [
        'views/crm_lead_views.xml',
        'views/crm_pipeline_views.xml',
        'views/crm_stage_views.xml',
        'views/informatica_solution_views.xml',
        'views/informatica_pipeline_views.xml',
        'security/crm_pipeline_security.xml',
        'security/ir.model.access.csv',
    ],
    'installable': True,
    'application': False,
    'auto_install': False,
}
