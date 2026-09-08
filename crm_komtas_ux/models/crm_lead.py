# -*- coding: utf-8 -*-

import logging

from odoo import api, fields, models
from odoo.exceptions import ValidationError

_logger = logging.getLogger(__name__)


class CrmLead(models.Model):
    _inherit = 'crm.lead'

    dr_no = fields.Char(string='DR No')

    sequence_enrollment = fields.Boolean(string='Sequence Enrollment')
    second_contact_person_id = fields.Many2one('res.partner', string='Second Contact Person')
    hyperscaler_ids = fields.Many2many(
        'hyperscalers',
        'crm_lead_hyperscaler_rel',
        'lead_id',
        'hyperscaler_id',
        string='Hyperscalers',
    )
    informatica_solution_id = fields.Many2one('informatica.solution', string='Informatica Solution')
    pipeline_id = fields.Many2one('informatica.pipeline', string='Pipeline')
    technology = fields.Selection([
        ('analytics', 'Analytics'),
        ('data', 'Data'),
    ], string='Technology')
    selection_criterias_ids = fields.Many2many(
        'criterias',
        'crm_lead_criterias_rel',
        'lead_id',
        'criteria_id',
        string='Selection Criterias',
    )

    gcp_billing_account = fields.Char(string='GCP Billing Account')
    ps_opp_exist = fields.Boolean(string='PS Opportunity Exists')
    training_opp_exist = fields.Boolean(string='Training Opportunity Exists')
    vendor_subscription_start_date = fields.Date(string='Vendor Subscription Start Date')
    year_of_commit = fields.Date(string='Year of Commit')

    stage_id = fields.Many2one(
        'crm.stage',
        string='Stage',
        index=True,
        tracking=True,
        compute='_compute_stage_id',
        readonly=False,
        store=True,
        copy=False,
        group_expand='_read_group_stage_ids',
        ondelete='restrict',
        domain="['|', ('pipeline_ids', '=', False), ('pipeline_ids', '=', pipeline_id)]"
    )

    @api.depends('pipeline_id')
    def _compute_stage_id(self):
        for lead in self:
            if not lead.stage_id:
                lead.stage_id = lead._stage_find(domain=[('fold', '=', False)]).id
            elif lead.pipeline_id and lead.pipeline_id.id not in lead.stage_id.pipeline_ids.ids:
                lead.stage_id = lead._stage_find(domain=[('fold', '=', False)]).id

    def _stage_find(self, pipeline_id=False, domain=None, order='sequence, id', limit=1):
        if pipeline_id:
            search_domain = ['|', ('pipeline_ids', '=', False), ('pipeline_ids', '=', pipeline_id)]
        else:
            search_domain = [('pipeline_ids', '=', False)]
        if domain:
            search_domain += list(domain)
        return self.env['crm.stage'].search(search_domain, order=order, limit=limit)

    @api.model
    def _read_group_stage_ids(self, stages, domain, order=None):
        pipeline_ids = []
        if self.env.context.get('default_pipeline_id'):
            pipeline_ids = [self.env.context.get('default_pipeline_id')]
        else:
            pipeline_ids = self.search(domain).mapped('pipeline_id').ids

        if pipeline_ids:
            search_domain = ['|', ('id', 'in', stages.ids), '|', ('pipeline_ids', '=', False), ('pipeline_ids', 'in', pipeline_ids)]
        else:
            search_domain = ['|', ('id', 'in', stages.ids), ('pipeline_ids', '=', False)]
            
        stage_ids = stages.sudo()._search(search_domain, order=order if order else stages._order)
        return stages.browse(stage_ids)

    service_competitor_ids = fields.Many2many(
        'res.partner',
        'crm_lead_service_competitor_rel',
        'lead_id',
        'partner_id',
        string='Service Competitors',
    )
    tech_competitor_ids = fields.Many2many(
        'res.partner',
        'crm_lead_tech_competitor_rel',
        'lead_id',
        'partner_id',
        string='Technology Competitors',
    )

    authority = fields.Char(string='Authority')
    budget = fields.Char(string='Budget')
    lead_source_details = fields.Text(string='Lead Source Details')
    risk = fields.Text(string='Risk')
    timing = fields.Text(string='Timing')

    currency_id = fields.Many2one(
        'res.currency',
        string='Deal Currency',
        default=lambda self: self.env.company.currency_id,
    )
    planned_revenue_second = fields.Monetary(
        string='Revenue Other Currency',
        currency_field='currency_id',
        tracking=True,
    )
    prorated_revenue_second = fields.Monetary(
        string='Prorated Revenue (Other Currency)',
        currency_field='currency_id',
        compute='_compute_prorated_revenue_second',
    )

    @api.depends('planned_revenue_second', 'probability')
    def _compute_prorated_revenue_second(self):
        for lead in self:
            lead.prorated_revenue_second = lead.planned_revenue_second * (lead.probability / 100.0)

    @api.onchange('currency_id', 'planned_revenue_second')
    def _onchange_planned_revenue_second(self):
        """Mirror the amount quoted in the customer's currency into the
        company-currency ``expected_revenue`` so that probability weighting
        and pipeline reporting stay consistent.
        """
        if not self.currency_id:
            return
        company = self.company_id or self.env.company
        self.expected_revenue = self.currency_id._convert(
            self.planned_revenue_second,
            company.currency_id,
            company,
            self.create_date or fields.Date.context_today(self),
        )

    @api.model
    def check_required_fields_for_stage(self, lead_id, target_stage_id):
        """Check if required fields are missing for target stage.
        Returns dict with missing field info.
        """
        lead = self.browse(lead_id).exists()
        if not lead:
            return {'missing': []}
        stage = self.env['crm.stage'].browse(target_stage_id).exists()
        if not stage:
            return {'missing': []}
        required_fields = stage.sudo().required_fields
        if not required_fields:
            return {'missing': []}
        missing = []
        for field in required_fields:
            fname = field.name
            value = getattr(lead, fname, False)
            if hasattr(value, '_name'):
                is_empty = not bool(value)
            else:
                is_empty = value is False or value is None or (isinstance(value, str) and not value)
            if is_empty:
                missing.append({
                    'name': fname,
                    'label': field.field_description,
                    'ttype': field.ttype,
                    'relation': field.relation,
                })
        return {'missing': missing}

    @api.model
    def move_to_stage(self, lead_id, target_stage_id):
        """Move lead to target stage (field values should already be saved)."""
        lead = self.browse(lead_id).exists()
        if not lead:
            return False
        lead.write({'stage_id': target_stage_id})
        return True

    def web_save(self, vals, specification, next_id=None):
        return super(CrmLead, self).web_save(vals, specification, next_id=next_id)

    def write(self, vals):
        return super(CrmLead, self).write(vals)

