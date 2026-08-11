# -*- coding: utf-8 -*-

from odoo import models, fields


class CrmPipeline(models.Model):
    _name = 'crm.pipeline'
    _description = 'CRM Pipeline'

    name = fields.Char(string='Pipeline Name', required=True)
