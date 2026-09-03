# -*- coding: utf-8 -*-

from odoo import fields, models


class CrmStage(models.Model):
    _inherit = 'crm.stage'

    pipeline_ids = fields.Many2many(
        'crm.pipeline',
        'crm_stage_pipeline_rel',
        'stage_id',
        'pipeline_id',
        string='Pipelines'
    )
    pipeline_id = fields.Many2one(
        'informatica.pipeline',
        string='Pipeline'
    )
