/** @odoo-module **/

import { FormRenderer } from "@web/views/form/form_renderer";
import { patch } from "@web/core/utils/patch";
import { onMounted } from "@odoo/owl";

patch(FormRenderer.prototype, {
    setup() {
        super.setup();
        onMounted(() => {
            this._highlightRequiredFields();
        });
    },

    _highlightRequiredFields() {
        const highlightFields = this.props.record?.context?.highlight_fields;
        if (!highlightFields || !Array.isArray(highlightFields) || highlightFields.length === 0) {
            return;
        }
        const formEl = this.el;
        if (!formEl) {
            return;
        }
        for (const fieldName of highlightFields) {
            const fieldEl = formEl.querySelector(`[name="${fieldName}"]`);
            if (fieldEl) {
                const container = fieldEl.closest(".o_field_widget") || fieldEl;
                container.classList.add("o_required_highlight");
                const labelEl = formEl.querySelector(`label[for="${fieldName}"]`);
                if (labelEl) {
                    labelEl.classList.add("o_required_highlight_label");
                }
            }
        }
    },
});
