# -*- coding: utf-8 -*-

from odoo import api, fields, models


class CrmLeadStageWizard(models.TransientModel):
    _name = 'crm.lead.stage.wizard'
    _description = 'CRM Lead Stage Change Wizard'

    lead_id = fields.Many2one('crm.lead', string='Lead', required=True)
    current_stage_id = fields.Many2one('crm.stage', string='Current Stage', readonly=True)
    target_stage_id = fields.Many2one(
        'crm.stage',
        string='Target Stage',
        required=True,
        domain="['|', ('pipeline_ids', '=', False), ('pipeline_ids', '=', lead_id.pipeline_id)]"
    )

    @api.onchange('target_stage_id')
    def _onchange_target_stage_id(self):
        """Check required fields when target stage changes."""
        if not self.target_stage_id:
            return
        
        required_fields = self.target_stage_id.sudo().required_fields
        if not required_fields:
            return
        
        missing = []
        for field in required_fields:
            fname = field.name
            value = getattr(self.lead_id, fname, False)
            if hasattr(value, '_name'):
                is_empty = not bool(value)
            else:
                is_empty = value is False or value is None or (isinstance(value, str) and not value)
            if is_empty:
                missing.append(field.field_description)
        
        if missing:
            return {
                'warning': {
                    'title': 'Zorunlu Alanlar Eksik',
                    'message': f'Bu aşamaya geçiş için şu alanları doldurmalısınız: {", ".join(missing)}',
                }
            }

    def action_confirm(self):
        """Change stage after validation."""
        if not self.target_stage_id:
            return {'type': 'ir.actions.act_window_close'}
        
        required_fields = self.target_stage_id.sudo().required_fields
        if required_fields:
            missing = []
            for field in required_fields:
                fname = field.name
                value = getattr(self.lead_id, fname, False)
                if hasattr(value, '_name'):
                    is_empty = not bool(value)
                else:
                    is_empty = value is False or value is None or (isinstance(value, str) and not value)
                if is_empty:
                    missing.append(field.field_description)
            
            if missing:
                return {
                    'warning': {
                        'title': 'Zorunlu Alanlar Eksik',
                        'message': f'Bu aşamaya geçiş için şu alanları doldurmalısınız: {", ".join(missing)}',
                    }
                }
        
        self.lead_id.stage_id = self.target_stage_id.id
        return {'type': 'ir.actions.act_window_close'}
