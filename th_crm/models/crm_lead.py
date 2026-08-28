# -*- coding: utf-8 -*-

from odoo import api, fields, models


class CrmLead(models.Model):
    _inherit = 'crm.lead'

    dr_no = fields.Char(string='DR No')

    # Qualification / Opportunity
    sequence_enrollment = fields.Boolean(string='Sequence enrollment')
    second_contact_person_id = fields.Many2one('res.partner', string='2nd Contact Person')
    hyperscaler = fields.Selection([
        ('ms_azure', 'MS Azure'),
        ('gcp', 'GCP'),
        ('aws', 'AWS'),
    ], string='Hyperscaler')
    informatica_solution_id = fields.Many2one('informatica.solution', string='Informatica Solution')
    informatica_pipeline_id = fields.Many2one('informatica.pipeline', string='Informatica Pipeline')
    technology = fields.Selection([
        ('analytics', 'Analytics'),
        ('data', 'Data'),
    ], string='Technology')
    selection_criterias = fields.Selection([
        ('technical_win', 'Technical Win'),
        ('cost_advantage', 'Cost Advantage'),
        ('delivery_capabilities', 'Delivery Capabilities'),
    ], string='Selection Criterias')

    # Commercial / Business
    gcp_billing_account = fields.Char(string='GCP Billing Account')
    ps_opp_exist = fields.Boolean(string='PS Opp. Exist')
    training_opp_exist = fields.Boolean(string='Training Opp. Exist')
    vendor_subscription_start_date = fields.Date(string='Vendor Subscription Start Date')
    year_of_commit = fields.Date(string='Year of Commit')

    # Competition
    service_competitor_ids = fields.Many2many('res.partner', 'crm_lead_service_competitor_rel', 'lead_id', 'partner_id', string='Service-Competitors')
    tech_competitor_ids = fields.Many2many('res.partner', 'crm_lead_tech_competitor_rel', 'lead_id', 'partner_id', string='Tech-Competitors')

    # Qualification Details
    authority = fields.Char(string='AUTHORITY:Who is Executive Sponsor? Who Own Funds?Who Sign Contract?')
    budget = fields.Char(string='BUDGET:Who owns the Budget? Is it funded for Outside Purchase?')
    lead_source_details = fields.Html(string='Details for Lead Source')
    risk = fields.Html(string='RISK:General Risks? Product Risks:')
    timing = fields.Html(string='TIMING:Timeframe? Why Buy Now?')

    # Second Currency
    currency_id = fields.Many2one('res.currency', string='Currency')
    planned_revenue_second = fields.Monetary('Revenue Other Currency', currency_field='currency_id', tracking=True)
    value = fields.Monetary('Value', currency_field='currency_id', compute='_compute_value', store=True)

    @api.depends('planned_revenue_second', 'probability')
    def _compute_value(self):
        for lead in self:
            if lead.planned_revenue_second and lead.probability:
                lead.value = lead.planned_revenue_second * (lead.probability / 100)
            else:
                lead.value = 0.0

    @api.onchange('currency_id', 'planned_revenue_second')
    def _onchange_planned_revenue_second(self):
        if self.currency_id and self.planned_revenue_second:
            company_currency = self.company_id.currency_id if self.company_id else self.env.company.currency_id
            self.expected_revenue = self.currency_id._convert(
                self.planned_revenue_second,
                company_currency,
                self.company_id or self.env.company,
                self.create_date or fields.Date.today()
            )
