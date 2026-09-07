# -*- coding: utf-8 -*-

from odoo import fields, models


class Hyperscalers(models.Model):
    _name = 'hyperscalers'
    _description = 'Hyperscaler'
    _order = 'name'

    name = fields.Char(string='Name', required=True)
    active = fields.Boolean(string='Active', default=True)
