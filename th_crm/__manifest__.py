# -*- coding: utf-8 -*-

{
    'name': 'TH CRM',
    'version': '19.0.1.0.0',
    'category': 'CRM',
    'summary': 'Extend CRM lead qualification fields',
    'description': """
        TH CRM Module
        =============
        This module extends the CRM Lead model with additional qualification fields.
    """,
    'author': 'TugayHatil',
    'website': 'https://github.com/TugayHatil/th_crm_v19',
    'license': 'LGPL-3',
    'depends': ['crm'],
    'data': [
        'views/crm_lead_views.xml',
        'views/crm_pipeline_views.xml',
        'views/crm_stage_views.xml',
        'security/crm_pipeline_security.xml',
        'security/ir.model.access.csv',
        # 'views/informatica_solution_views.xml',
    ],
    'assets': {
        'web.assets_backend': [
            'th_crm/static/src/js/pipeline_selector.js',
            'th_crm/static/src/xml/pipeline_selector.xml',
            'th_crm/static/src/js/crm_pipeline_control_panel.js',
            'th_crm/static/src/xml/control_panel_patch.xml',
        ],
    },
    'installable': True,
    'application': False,
    'auto_install': False,
}
