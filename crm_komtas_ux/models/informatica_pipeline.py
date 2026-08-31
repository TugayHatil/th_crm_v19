# -*- coding: utf-8 -*-

from odoo import fields, models


class InformaticaPipeline(models.Model):
    _name = 'informatica.pipeline'
    _description = 'Informatica Pipeline'

    name = fields.Char(string='Name', required=True, translate=True)
    code = fields.Char(string='Code', required=True)
    description = fields.Text(string='Description')
    active = fields.Boolean(string='Active', default=True)
