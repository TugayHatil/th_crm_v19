odoo.define('th_crm.PipelineSelector', function (require) {
    "use strict";

    var ControlPanel = require('web.ControlPanel');
    var core = require('web.core');
    var rpc = require('web.rpc');

    ControlPanel.include({
        /**
         * Override to add pipeline selector to control panel
         */
        _renderButtons: function () {
            this._super.apply(this, arguments);
            if (this.action && this.action.res_model === 'crm.lead') {
                this._addPipelineSelector();
            }
        },

        /**
         * Add pipeline selector to control panel
         */
        _addPipelineSelector: function () {
            var self = this;
            
            // Check if pipeline selector already exists
            if (this.$('.o_pipeline_selector').length) {
                return;
            }

            // Create pipeline selector HTML
            var $pipelineSelector = $('<div>', {
                class: 'o_pipeline_selector btn-group'
            });

            var $pipelineSelect = $('<select>', {
                class: 'o_pipeline_select form-control'
            });

            // Add empty option
            $pipelineSelect.append($('<option>', {value: '', text: 'All Pipelines'}));

            // Fetch pipelines from server
            rpc.query({
                model: 'crm.pipeline',
                method: 'search_read',
                args: [[], ['id', 'name']],
                kwargs: {}
            }).then(function (pipelines) {
                _.each(pipelines, function (pipeline) {
                    $pipelineSelect.append($('<option>', {
                        value: pipeline.id,
                        text: pipeline.name
                    }));
                });

                // Add selector to control panel
                $pipelineSelector.append($pipelineSelect);
                self.$('.o_control_panel').find('.o_control_panel_main_buttons').before($pipelineSelector);

                // Bind change event
                $pipelineSelect.on('change', function () {
                    var pipelineId = $(this).val();
                    var domain = pipelineId ? [['pipeline_id', '=', parseInt(pipelineId)]] : [];
                    self.trigger_up('search', {domain: domain});
                });
            });
        }
    });
});
