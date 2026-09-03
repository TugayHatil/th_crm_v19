# -*- coding: utf-8 -*-

from odoo import fields, models


class CrmStage(models.Model):
    _inherit = 'crm.stage'

    pipeline_ids = fields.Many2many(
        'informatica.pipeline',
        'crm_stage_informatica_pipeline_rel',
        'stage_id',
        'pipeline_id',
        string='Pipelines'
    )
