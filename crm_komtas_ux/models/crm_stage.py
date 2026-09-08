# -*- coding: utf-8 -*-

from odoo import fields, models


class CrmStage(models.Model):
    _inherit = 'crm.stage'

    pipeline_ids = fields.Many2many(
        'informatica.pipeline',
        'crm_stage_informatica_pipeline_rel',
        'stage_id',
        'pipeline_id',
        string='Pipelines',
    )

    required_fields = fields.Many2many(
        'ir.model.fields',
        'crm_stage_required_fields_rel',
        'stage_id',
        'field_id',
        string='Required Fields',
        domain=[('model_id.model', '=', 'crm.lead'), ('ttype', 'not in', ['one2many', 'binary']), ('store', '=', True)],
        help='Bu aşamaya geçildiğinde seçilen alanlar zorunlu hale gelir.',
    )
