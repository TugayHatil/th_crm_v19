# -*- coding: utf-8 -*-

from odoo import fields, models


class Criterias(models.Model):
    _name = 'criterias'
    _description = 'Selection Criteria'
    _order = 'name'

    name = fields.Char(string='Name', required=True)
    active = fields.Boolean(string='Active', default=True)
