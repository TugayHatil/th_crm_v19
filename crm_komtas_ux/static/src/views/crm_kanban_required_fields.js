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
            .o_required_highlight,
            .o_required_highlight .o_input,
            .o_required_highlight input,
            .o_required_highlight textarea,
            .o_required_highlight select,
            .o_required_highlight .o_field_many2one_selection,
            .o_required_highlight .o_field_many2many_selection,
            .o_required_highlight .o_field_many2many_tags,
            .o_required_highlight .o_field_tags,
            .o_required_highlight .o_input_dropdown,
            .o_required_highlight .o_dropdown_toggler,
            .o_required_highlight .o-autocomplete--input {
                background-color: #fff5f5 !important;
                border-color: #dc3545 !important;
                border-width: 1px !important;
                border-style: solid !important;
            }
            .o_required_highlight {
                outline: 2px solid #dc3545 !important;
                outline-offset: 2px !important;
                border-radius: 4px !important;
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
        // Find form views, prefer those inside open dialogs
        const allForms = [...document.querySelectorAll(".o_form_view")];
        const dialogForms = allForms.filter((f) => f.closest(".o_dialog, .modal, .o_technical_modal"));
        const forms = dialogForms.length > 0 ? dialogForms : allForms;

        if (forms.length === 0) {
            return false;
        }

        let totalFound = 0;
        for (const form of forms) {
            for (const fieldName of fieldNames) {
                const fieldEl =
                    form.querySelector(`[name="${fieldName}"]`) ||
                    form.querySelector(`[field-name="${fieldName}"]`) ||
                    form.querySelector(`[data-field-name="${fieldName}"]`) ||
                    form.querySelector(`.o_field_widget[name="${fieldName}"]`);
                if (fieldEl) {
                    const container =
                        fieldEl.closest(".o_field_widget") ||
                        fieldEl.closest(".o_cell") ||
                        fieldEl;
                    container.classList.add("o_required_highlight");
                    totalFound++;
                }

                const labelEl =
                    form.querySelector(`label[for="${fieldName}"]`) ||
                    form.querySelector(`label.o_form_label[for="${fieldName}"]`);
                if (labelEl) {
                    labelEl.classList.add("o_required_highlight_label");
                }
            }
        }
        console.log("[crm_komtas_ux] highlightMissingFields found", totalFound, "of", fieldNames.length, "fields");
        return totalFound > 0;
    };

    let attempts = 0;
    const maxAttempts = 30;
    const tryHighlight = () => {
        attempts++;
        const found = applyHighlight();
        if (found || attempts >= maxAttempts) {
            return;
        }
        setTimeout(tryHighlight, 300);
    };
    setTimeout(tryHighlight, 500);
}

patch(StatusBarField.prototype, {
    async selectItem(item) {
        // Only intercept for crm.lead stage_id field
        if (this.props.record.resModel === "crm.lead" && this.props.name === "stage_id") {
            const record = this.props.record;
            const targetStageId = item.id;
            
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
                            const fieldLabels = actuallyMissing.map((f) => f.label).join(", ");
                            const missingFieldNames = actuallyMissing.map((f) => f.name);
                            
                            // Show notification with button - same as kanban flow
                            const ormService = this.env.services.orm;
                            const actionService = this.env.services.action;
                            const notificationService = this.env.services.notification;
                            const leadResId = record.resId;
                            
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
                                        // Reload the form to show the new stage
                                        record.model.load();
                                    }
                                } catch (e) {
                                    console.error("[crm_komtas_ux] Error after dialog close:", e);
                                }
                            };

                            const closeNotification = notificationService.add(
                                `Bu aşamaya geçiş için şu zorunlu alanları doldurun: ${fieldLabels}`,
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

                            // Highlight missing fields in the main form immediately
                            highlightMissingFields(missingFieldNames);
                            
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

            if (targetStageId && record && record.resId) {
                try {
                    const result = await this.model.orm.call(
                        "crm.lead",
                        "check_required_fields_for_stage",
                        [record.resId, targetStageId],
                    );

                    if (result && result.missing && result.missing.length > 0) {
                        const ormService = this.model.orm;
                        const actionService = this.model.env.services.action;
                        const notificationService = this.model.env.services.notification;
                        const leadResId = record.resId;
                        const model = this.model;

                        const fieldNames = result.missing.map((f) => f.label).join(", ");

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
                            await model.load();
                        };

                        const missingFieldNames = result.missing.map((f) => f.name);

                        const closeNotification = notificationService.add(
                            `Bu fırsatı "${targetGroup.displayName}" aşamasına taşımak için şu zorunlu alanları doldurun: ${fieldNames}`,
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

                        // Highlight missing fields in the main form immediately
                        highlightMissingFields(missingFieldNames);
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
