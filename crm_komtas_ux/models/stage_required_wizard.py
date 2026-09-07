# -*- coding: utf-8 -*-

import json
import logging

from odoo import api, fields, models
from odoo.exceptions import ValidationError

_logger = logging.getLogger(__name__)


class StageRequiredWizard(models.TransientModel):
    _name = 'stage.required.wizard'
    _description = 'Stage Required Fields Wizard'

    lead_id = fields.Many2one('crm.lead', string='Lead', required=True, readonly=True)
    target_stage_id = fields.Many2one('crm.stage', string='Target Stage', required=True, readonly=True)
    field_values = fields.Text(string='Field Values', readonly=True)
    field_info = fields.Text(string='Field Info', readonly=True)

    def _get_field_info(self):
        """Return list of dicts with field metadata for the wizard."""
        self.ensure_one()
        if self.field_info:
            return json.loads(self.field_info)
        return []

    @api.model
    def create_wizard(self, lead_id, target_stage_id):
        """Create wizard with missing required fields info."""
        lead = self.env['crm.lead'].browse(lead_id).exists()
        if not lead:
            raise ValidationError("Lead not found")
        stage = self.env['crm.stage'].browse(target_stage_id).exists()
        if not stage:
            raise ValidationError("Stage not found")

        required_fields = stage.sudo().required_fields
        missing = []
        for field in required_fields:
            fname = field.name
            value = getattr(lead, fname, False)
            if hasattr(value, '_name'):
                value = value.id if value else False
            if not value and value != 0:
                missing.append({
                    'name': fname,
                    'label': field.field_description,
                    'ttype': field.ttype,
                    'relation': field.relation,
                })

        if not missing:
            return False

        wizard = self.create({
            'lead_id': lead_id,
            'target_stage_id': target_stage_id,
            'field_info': json.dumps(missing),
            'field_values': json.dumps({}),
        })
        return wizard.id

    def action_apply(self):
        """Apply field values and move lead to target stage."""
        self.ensure_one()
        vals = {}
        if self.field_values:
            vals = json.loads(self.field_values)

        _logger.warning('[crm_komtas_ux] wizard apply, vals=%s', vals)

        # Write field values first
        if vals:
            self.lead_id.write(vals)

        # Now move to target stage
        self.lead_id.write({'stage_id': self.target_stage_id.id})

        return {
            'type': 'ir.actions.act_window_close',
        }
