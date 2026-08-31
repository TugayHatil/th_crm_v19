# -*- coding: utf-8 -*-

from odoo import models, fields


class CrmStage(models.Model):
    _inherit = 'crm.stage'

    pipeline_ids = fields.Many2many('crm.pipeline', 'crm_stage_pipeline_rel', 'stage_id', 'pipeline_id', string='Pipelines')
