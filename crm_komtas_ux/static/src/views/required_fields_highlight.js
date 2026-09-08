/** @odoo-module **/

import { FormRenderer } from "@web/views/form/form_renderer";
import { patch } from "@web/core/utils/patch";
import { onMounted } from "@odoo/owl";

let _highlightFields = [];

export function setHighlightFields(fields) {
    _highlightFields = fields || [];
}

export function clearHighlightFields() {
    _highlightFields = [];
}

patch(FormRenderer.prototype, {
    setup() {
        super.setup();
        onMounted(() => {
            this._highlightRequiredFields();
        });
    },

    _highlightRequiredFields() {
        if (!_highlightFields || _highlightFields.length === 0) {
            return;
        }
        const formEl = this.el;
        if (!formEl) {
            return;
        }
        // Small delay to ensure all field widgets are rendered
        setTimeout(() => {
            for (const fieldName of _highlightFields) {
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
        }, 300);
    },
});
