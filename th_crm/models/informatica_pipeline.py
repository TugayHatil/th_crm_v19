# -*- coding: utf-8 -*-

from odoo import api, fields, models


class InformaticaPipeline(models.Model):
    _name = 'informatica.pipeline'
    _description = 'Informatica Pipeline'

    name = fields.Char(string='Pipeline Name', required=True, translate=True)
    code = fields.Char(string='Code', required=True)
    description = fields.Text(string='Description')
    active = fields.Boolean(string='Active', default=True)

    @api.model_create_multi
    def create(self, vals_list):
        pipelines = super().create(vals_list)
        crm_lead_model = self.env.ref('crm.model_crm_lead')
        crm_lead_action = self.env.ref('crm.action_crm_lead')
        for pipeline in pipelines:
            self.env['ir.filters'].create({
                'name': pipeline.name,
                'model_id': crm_lead_model.id,
                'action_id': crm_lead_action.id,
                'domain': f"[('pipeline_id', '=', {pipeline.id})]",
                'context': "{}",
                'is_default': True,
            })
        return pipelines

    def unlink(self):
        crm_lead_model = self.env.ref('crm.model_crm_lead')
        for pipeline in self:
            filters = self.env['ir.filters'].search([
                ('model_id', '=', crm_lead_model.id),
                ('domain', 'like', f"'pipeline_id', '=', {pipeline.id}")
            ])
            filters.unlink()
        return super().unlink()
