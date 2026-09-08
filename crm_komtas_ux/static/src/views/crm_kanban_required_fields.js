/** @odoo-module **/

import { patch } from "@web/core/utils/patch";
import { CrmKanbanDynamicGroupList } from "@crm/views/crm_kanban/crm_kanban_model";

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
                                            const missingFieldNames = result.missing.map((f) => f.name);
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
