# -*- coding: utf-8 -*-

from odoo import models, fields


class CrmLead(models.Model):
    _inherit = 'crm.lead'

    dr_no = fields.Char(string='DR No')

    # Qualification / Opportunity
    # sequence_enrollment = fields.Boolean(string='Sequence enrollment')
    # second_contact_person_id = fields.Many2one('res.partner', string='2nd Contact Person')
    # hyperscaler = fields.Selection([
    #     ('ms_azure', 'MS Azure'),
    #     ('gcp', 'GCP'),
    #     ('aws', 'AWS'),
    # ], string='Hyperscaler')
    # informatica_solution_id = fields.Many2one('th.crm.informatica.solution', string='Informatica Solution')
    # technology = fields.Selection([
    #     ('analytics', 'Analytics'),
    #     ('data', 'Data'),
    # ], string='Technology')
    # selection_criterias = fields.Selection([
    #     ('technical_win', 'Technical Win'),
    #     ('cost_advantage', 'Cost Advantage'),
    #     ('delivery_capabilities', 'Delivery Capabilities'),
    # ], string='Selection Criterias')

    # # Commercial / Business
    # gcp_billing_account = fields.Char(string='GCP Billing Account')
    # ps_opp_exist = fields.Boolean(string='PS Opp. Exist')
    # training_opp_exist = fields.Boolean(string='Training Opp. Exist')
    # vendor_subscription_start_date = fields.Many2one('res.partner', string='Vendor Subscription Start Date')
    # year_of_commit = fields.Date(string='Year of Commit')

    # # Competition
    # service_competitor_ids = fields.Many2many('res.partner', string='Service-Competitors')
    # tech_competitor_ids = fields.Many2many('res.partner', string='Tech-Competitors')

    # # Qualification Details
    # authority = fields.Char(string='AUTHORITY:Who is Executive Sponsor? Who Own Funds?Who Sign Contract?')
    # budget = fields.Char(string='BUDGET:Who owns the Budget? Is it funded for Outside Purchase?')
    # lead_source_details = fields.Html(string='Details for Lead Source')
    # risk = fields.Html(string='RISK:General Risks? Product Risks:')
    # timing = fields.Html(string='TIMING:Timeframe? Why Buy Now?')
