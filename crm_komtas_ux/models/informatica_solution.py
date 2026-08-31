# -*- coding: utf-8 -*-

from odoo import fields, models


class InformaticaSolution(models.Model):
    _name = 'informatica.solution'
    _description = 'Informatica Solution'

    name = fields.Char(string='Solution Name', required=True, translate=True)
    code = fields.Char(string='Code', required=True)
    description = fields.Text(string='Description')
    active = fields.Boolean(string='Active', default=True)
