# -*- coding: utf-8 -*-

from odoo import models, fields


class ThCrmInformaticaSolution(models.Model):
    _name = 'th.crm.informatica.solution'
    _description = 'Informatica Solution'

    name = fields.Char(string="Name", required=True)
