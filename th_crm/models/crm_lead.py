# -*- coding: utf-8 -*-

from odoo import models, fields


class CrmLead(models.Model):
    _inherit = 'crm.lead'

    dr_no = fields.Char(string='DR No')
    sequence_enrollment = fields.Boolean(string='Sequence enrollment')
