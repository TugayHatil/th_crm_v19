/** @odoo-module **/

import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";
import { Component } from "@odoo/owl";

export class PipelineSelector extends Component {
    setup() {
        this.orm = useService("orm");
        this.state = {
            pipelines: [],
            selectedPipelineId: null,
        };
        this.loadPipelines();
    }

    async loadPipelines() {
        this.state.pipelines = await this.orm.searchRead("crm.pipeline", [], ["id", "name"]);
        this.render();
    }

    onPipelineChange(event) {
        this.state.selectedPipelineId = parseInt(event.target.value) || null;
        this.trigger("pipeline-changed", { pipelineId: this.state.selectedPipelineId });
    }
}

PipelineSelector.template = "th_crm.PipelineSelector";
registry.category("actions").add("th_crm.pipeline_selector", PipelineSelector);
