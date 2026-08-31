# -*- coding: utf-8 -*-

from odoo import fields, models


class CrmPipeline(models.Model):
    _name = 'crm.pipeline'
    _description = 'CRM Pipeline'

    name = fields.Char(string='Name', required=True)
