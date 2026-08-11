# -*- coding: utf-8 -*-

{
    'name': 'TH CRM',
    'version': '19.0.1.0.0',
    'category': 'CRM',
    'summary': 'Add DR No field to CRM leads',
    'description': """
        TH CRM Module
        =============
        This module adds a DR No field to the CRM Lead model.
    """,
    'author': 'TugayHatil',
    'website': 'https://github.com/TugayHatil/th_crm_v19',
    'license': 'LGPL-3',
    'depends': ['crm'],
    'data': [
        'views/crm_lead_views.xml',
    ],
    'installable': True,
    'application': False,
    'auto_install': False,
}
