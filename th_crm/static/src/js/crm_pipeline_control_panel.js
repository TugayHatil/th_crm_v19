/** @odoo-module **/

import { ControlPanel } from "@web/search/control_panel/control_panel";
import { patch } from "@web/core/utils/patch";
import { useService } from "@web/core/utils/hooks";

patch(ControlPanel.prototype, "th_crm.CrmPipelineControlPanel", {
    setup() {
        this._super(...arguments);
        this.orm = useService("orm");
        this.state = {
            pipelines: [],
            selectedPipelineId: null,
        };
        this.loadPipelines();
    },

    async loadPipelines() {
        this.state.pipelines = await this.orm.searchRead("crm.pipeline", [], ["id", "name"]);
    },

    onPipelineChange(event) {
        this.state.selectedPipelineId = parseInt(event.target.value) || null;
        this._updatePipelineFilter();
    },

    _updatePipelineFilter() {
        // Trigger search with pipeline filter
        const domain = this.state.selectedPipelineId 
            ? [['stage_id.pipeline_ids', 'in', [this.state.selectedPipelineId]]]
            : [];
        this.env.searchModel.setDomain(domain);
    },
});
