# -*- coding: utf-8 -*-

{
    'name': 'CRM Komtas UX',
    'version': '19.0.1.0.5',
    'category': 'CRM',
    'summary': 'CRM Lead Qualification Enhancement',
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
