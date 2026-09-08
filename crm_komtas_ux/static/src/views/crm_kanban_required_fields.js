/** @odoo-module **/

import { patch } from "@web/core/utils/patch";
import { CrmKanbanDynamicGroupList } from "@crm/views/crm_kanban/crm_kanban_model";
import { FormController } from "@web/views/form/form_controller";
import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";

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

patch(FormController.prototype, {
    setup() {
        super.setup(...arguments);
        if (this.props.resModel === "crm.lead") {
            this._stageChangeHandler = this._onStageChange.bind(this);
        }
    },
    async loadRecord(params) {
        await super.loadRecord(...arguments);
        if (this.props.resModel === "crm.lead" && this.model.root) {
            this.model.root.on("change:stage_id", this._stageChangeHandler);
        }
    },
    _onStageChange(ev) {
        const record = ev.target;
        if (!record || !record.resId) {
            return;
        }
        const currentStageVal = record.data.stage_id;
        const currentStageId = Array.isArray(currentStageVal) ? currentStageVal[0] : currentStageVal;
        if (!currentStageId) {
            return;
        }
        
        this.orm.call(
            "crm.lead",
            "check_required_fields_for_stage",
            [record.resId, currentStageId],
        ).then((result) => {
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
                    const missingFieldNames = actuallyMissing.map((f) => f.name);
                    // Only highlight fields, don't revert stage (Python onchange handles that)
                    highlightMissingFields(missingFieldNames);
                }
            }
        }).catch((e) => {
            console.error("[crm_komtas_ux] Error checking required fields on stage change:", e);
        });
    },
    async onWillSaveRecord(record) {
        if (record.resModel === "crm.lead" && record.resId) {
            const currentStageVal = record.data.stage_id;
            const currentStageId = Array.isArray(currentStageVal) ? currentStageVal[0] : currentStageVal;
            if (currentStageId) {
                try {
                    const result = await this.orm.call(
                        "crm.lead",
                        "check_required_fields_for_stage",
                        [record.resId, currentStageId],
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
                            this.env.services.notification.add(
                                `Bu aşamaya geçiş için şu zorunlu alanları doldurun: ${fieldLabels}`,
                                {
                                    type: "danger",
                                    sticky: true,
                                }
                            );
                            highlightMissingFields(missingFieldNames);
                            return false;
                        }
                    }
                } catch (e) {
                    console.error("[crm_komtas_ux] Error checking required fields in form:", e);
                }
            }
        }
        return super.onWillSaveRecord(...arguments);
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
