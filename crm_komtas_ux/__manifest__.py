# -*- coding: utf-8 -*-

{
    'name': 'CRM Komtas UX',
    'version': '19.0.1.0.0',
    'category': 'CRM',
    'summary': 'CRM Lead Qualification Enhancement',
    'author': 'Projet Solutions',
    'website': 'https://www.projet.solutions',
    'license': 'LGPL-3',
    'depends': ['crm'],
    'data': [
        'security/ir.model.access.csv',
        'views/crm_lead_views.xml',
        'views/crm_stage_views.xml',
        'views/informatica_solution_views.xml',
        'views/informatica_pipeline_views.xml',
        'views/hyperscalers_views.xml',
        'views/criterias_views.xml',
    ],
    'assets': {
        'web.assets_backend': [
            'crm_komtas_ux/static/src/views/crm_kanban_required_fields.js',
        ],
    },
    'installable': True,
    'application': False,
    'auto_install': False,
}
