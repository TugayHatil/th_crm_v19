/** @odoo-module **/

import { patch } from "@web/core/utils/patch";
import { CrmKanbanDynamicGroupList } from "@crm/views/crm_kanban/crm_kanban_model";
import { StatusBarField } from "@web/views/fields/statusbar/statusbar_field";

function highlightMissingFields(fieldNames) {
    const styleId = "o_required_highlight_style";
    if (!document.getElementById(styleId)) {
        const style = document.createElement("style");
        style.id = styleId;
        style.textContent = `
            .o_required_highlight {
                border-radius: 4px;
                background-color: #fff5f5 !important;
                padding: 4px;
            }
            .o_required_highlight_label {
                color: #dc3545 !important;
                font-weight: bold !important;
            }
            .o_required_highlight_label::after {
                content: " *";
                color: #dc3545;
                font-weight: bold;
            }
        `;
        document.head.appendChild(style);
    }

    const applyHighlight = () => {
        const modal = document.querySelector(".o_dialog:not(.o_modal_closed) .o_form_view") ||
                      document.querySelector(".modal-body .o_form_view") ||
                      document.querySelector(".o_form_view");
        if (!modal) {
            return false;
        }
        let found = 0;
        for (const fieldName of fieldNames) {
            const fieldEl = modal.querySelector(`[name="${fieldName}"]`);
            if (fieldEl) {
                const container = fieldEl.closest(".o_field_widget") || fieldEl;
                container.classList.add("o_required_highlight");
                const labelEl = modal.querySelector(`label[for="${fieldName}"]`);
                if (labelEl) {
                    labelEl.classList.add("o_required_highlight_label");
                }
                found++;
            }
        }
        return found > 0;
    };

    let attempts = 0;
    const maxAttempts = 10;
    const tryHighlight = () => {
        attempts++;
        if (applyHighlight() || attempts >= maxAttempts) {
            return;
        }
        setTimeout(tryHighlight, 200);
    };
    setTimeout(tryHighlight, 300);
}

async function promptRequiredFields(ormService, actionService, notificationService, leadResId, targetStageId, targetStageName, model, missingFields) {
    const fieldLabels = missingFields.map((f) => f.label).join(", ");
    const missingFieldNames = missingFields.map((f) => f.name);

    const action = {
        type: "ir.actions.act_window",
        name: "Zorunlu Alanları Doldurun",
        res_model: "crm.lead",
        res_id: leadResId,
        view_mode: "form",
        views: [[false, "form"]],
        target: "new",
        context: {
            default_stage_id: targetStageId,
        },
    };

    const onDialogClose = async () => {
        try {
            const recheck = await ormService.call(
                "crm.lead",
                "check_required_fields_for_stage",
                [leadResId, targetStageId],
            );
            if (!recheck.missing || recheck.missing.length === 0) {
                await ormService.call(
                    "crm.lead",
                    "move_to_stage",
                    [leadResId, targetStageId],
                );
            }
        } catch (e) {
            console.error("[crm_komtas_ux] Error after dialog close:", e);
        }
        if (model && model.load) {
            await model.load();
        }
    };

    const closeNotification = notificationService.add(
        `Bu fırsatı "${targetStageName}" aşamasına taşımak için şu zorunlu alanları doldurun: ${fieldLabels}`,
        {
            type: "danger",
            sticky: true,
            buttons: [
                {
                    name: "Alanları Doldur",
                    onClick: () => {
                        closeNotification();
                        actionService.doAction(action, {
                            onClose: () => {
                                onDialogClose();
                            },
                        });
                        highlightMissingFields(missingFieldNames);
                    },
                },
            ],
        }
    );
}

patch(StatusBarField.prototype, {
    async selectItem(item) {
        // Only intercept for crm.lead stage_id field
        if (this.props.record.resModel === "crm.lead" && this.props.name === "stage_id") {
            const record = this.props.record;
            const targetStageId = item.id;
            const targetStageName = item.name || item.label || "Hedef";

            if (targetStageId && record.resId) {
                try {
                    const result = await this.env.services.orm.call(
                        "crm.lead",
                        "check_required_fields_for_stage",
                        [record.resId, targetStageId],
                    );

                    if (result && result.missing && result.missing.length > 0) {
                        const actuallyMissing = result.missing.filter((f) => {
                            const val = record.data[f.name];
                            if (val === false || val === null || val === undefined || val === "") {
                                return true;
                            }
                            if (Array.isArray(val) && val.length === 0) {
                                return true;
                            }
                            if (val && val.length === 0 && typeof val.length === "number") {
                                return true;
                            }
                            return false;
                        });

                        if (actuallyMissing.length > 0) {
                            await promptRequiredFields(
                                this.env.services.orm,
                                this.env.services.action,
                                this.env.services.notification,
                                record.resId,
                                targetStageId,
                                targetStageName,
                                record.model,
                                actuallyMissing,
                            );
                            // Don't call super - prevent stage change
                            return;
                        }
                    }
                } catch (e) {
                    console.error("[crm_komtas_ux] Error checking required fields on stage select:", e);
                }
            }
        }

        // All checks passed, proceed with stage change
        await super.selectItem(...arguments);
    },
});

patch(CrmKanbanDynamicGroupList.prototype, {
    async moveRecord(dataRecordId, dataGroupId, refId, targetGroupId) {
        const sourceGroup = this.groups.find((g) => g.id === dataGroupId);
        const targetGroup = this.groups.find((g) => g.id === targetGroupId);

        if (
            dataGroupId !== targetGroupId &&
            sourceGroup &&
            targetGroup &&
            sourceGroup.groupByField.name === "stage_id"
        ) {
            const record = sourceGroup.list.records.find((r) => r.id === dataRecordId);
            const targetStageId = targetGroup.value;
            const targetStageName = targetGroup.displayName || "Hedef";

            if (targetStageId && record && record.resId) {
                try {
                    const result = await this.model.orm.call(
                        "crm.lead",
                        "check_required_fields_for_stage",
                        [record.resId, targetStageId],
                    );

                    if (result && result.missing && result.missing.length > 0) {
                        await promptRequiredFields(
                            this.model.orm,
                            this.model.env.services.action,
                            this.model.env.services.notification,
                            record.resId,
                            targetStageId,
                            targetStageName,
                            this.model,
                            result.missing,
                        );
                        return;
                    }
                } catch (e) {
                    console.error("[crm_komtas_ux] Error checking required fields:", e);
                }
            }
        }

        await super.moveRecord(...arguments);
    },
});
