/** @odoo-module **/

import { patch } from "@web/core/utils/patch";
import { CrmKanbanDynamicGroupList } from "@crm/views/crm_kanban/crm_kanban_model";
import { StatusBarField } from "@web/views/fields/statusbar/statusbar_field";
import { FormController } from "@web/views/form/form_controller";

let pendingStageChange = null;

function clearHighlight() {
    document.querySelectorAll(".o_required_highlight").forEach((el) => {
        el.classList.remove("o_required_highlight");
    });
    document.querySelectorAll(".o_required_highlight_label").forEach((el) => {
        el.classList.remove("o_required_highlight_label");
    });
}

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
        setTimeout(tryHighlight, 100);
    };
    setTimeout(tryHighlight, 50);
}

async function promptRequiredFields(ormService, actionService, notificationService, leadResId, targetStageId, targetStageName, model, missingFields, isFormView = false) {
    const fieldLabels = missingFields.map((f) => f.label).join(", ");
    const missingFieldNames = missingFields.map((f) => f.name);

    if (isFormView) {
        // Form view: highlight fields on the current form, no popup dialog
        // Store pending stage change for auto-retry on form save
        highlightMissingFields(missingFieldNames);
        const closeNotification = notificationService.add(
            `Bu fırsatı "${targetStageName}" aşamasına taşımak için şu zorunlu alanları doldurun: ${fieldLabels}`,
            { type: "danger", sticky: true }
        );
        pendingStageChange = {
            ormService,
            notificationService,
            leadResId,
            targetStageId,
            targetStageName,
            model,
            closeNotification,
        };
        return;
    }

    // Kanban view: show notification with button to open dialog
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
                        pendingStageChange = {
                            ormService,
                            notificationService,
                            leadResId,
                            targetStageId,
                            targetStageName,
                            model,
                            closeNotification: () => {},
                        };
                        actionService.doAction(action);
                        highlightMissingFields(missingFieldNames);
                    },
                },
            ],
        }
    );
}

patch(StatusBarField.prototype, {
    async selectItem(item) {
        // Clear any previous highlights
        clearHighlight();
        // Only intercept for crm.lead stage_id field
        if (this.props.record.resModel === "crm.lead" && this.props.name === "stage_id") {
            const record = this.props.record;
            const targetStageId = item.value;
            const targetStageName = item.label || "Hedef";

            if (targetStageId && record.resId) {
                try {
                    const ormService = record.model.orm;
                    const services = record.model.env.services;
                    const result = await ormService.call(
                        "crm.lead",
                        "check_required_fields_for_stage",
                        [record.resId, targetStageId],
                    );

                    if (result && result.missing && result.missing.length > 0) {
                        await promptRequiredFields(
                            ormService,
                            services.action,
                            services.notification,
                            record.resId,
                            targetStageId,
                            targetStageName,
                            record.model,
                            result.missing,
                            true, // isFormView
                        );
                        // Don't call super - prevent stage change
                        return;
                    }
                } catch (e) {
                    console.error("[crm_komtas_ux] Error checking required fields on stage select:", e);
                    // Prevent stage change on error as well
                    return;
                }
            }
        }

        // All checks passed, proceed with stage change
        await super.selectItem(...arguments);
    },
});

patch(FormController.prototype, {
    async beforeExecuteActionButton(clickParams) {
        const isCrmLeadDialog =
            pendingStageChange &&
            this.model.root.resModel === "crm.lead" &&
            this.model.root.resId === pendingStageChange.leadResId &&
            this.env.inDialog;

        if (isCrmLeadDialog && clickParams.special === "cancel") {
            pendingStageChange = null;
            clearHighlight();
            return await super.beforeExecuteActionButton(clickParams);
        }

        if (isCrmLeadDialog && clickParams.special !== "cancel") {
            const record = this.model.root;
            let saved = false;
            if (clickParams.special === "save" && this.props.saveRecord) {
                saved = await this.props.saveRecord(record, clickParams);
            } else {
                const params = { reload: !(this.env.inDialog && clickParams.close) };
                saved = await record.save(params);
            }
            if (saved === false) {
                return saved;
            }

            const psc = pendingStageChange;
            try {
                const recheck = await psc.ormService.call(
                    "crm.lead",
                    "check_required_fields_for_stage",
                    [psc.leadResId, psc.targetStageId],
                );
                if (!recheck.missing || recheck.missing.length === 0) {
                    pendingStageChange = null;
                    clearHighlight();
                    await psc.ormService.call(
                        "crm.lead",
                        "move_to_stage",
                        [psc.leadResId, psc.targetStageId],
                    );
                    psc.closeNotification();
                    if (this.props.onSave) {
                        this.props.onSave(record, clickParams);
                    }
                    if (psc.model && psc.model.load) {
                        await psc.model.load();
                    }
                } else {
                    clearHighlight();
                    const stillLabels = recheck.missing.map((f) => f.label).join(", ");
                    const stillNames = recheck.missing.map((f) => f.name);
                    highlightMissingFields(stillNames);
                    psc.closeNotification();
                    const closeNew = psc.notificationService.add(
                        `Hâlâ eksik alanlar var: ${stillLabels}`,
                        { type: "danger", sticky: true }
                    );
                    pendingStageChange = { ...psc, closeNotification: closeNew };
                    return false;
                }
            } catch (e) {
                console.error("[crm_komtas_ux] Error on dialog save recheck:", e);
                pendingStageChange = null;
                clearHighlight();
                if (this.props.onSave) {
                    this.props.onSave(record, clickParams);
                }
            }
            return saved;
        }

        return await super.beforeExecuteActionButton(clickParams);
    },

    async onRecordSaved(record, changes) {
        await super.onRecordSaved(...arguments);
        if (
            pendingStageChange &&
            !this.env.inDialog &&
            record.resModel === "crm.lead" &&
            record.resId === pendingStageChange.leadResId
        ) {
            const psc = pendingStageChange;
            pendingStageChange = null;
            try {
                const recheck = await psc.ormService.call(
                    "crm.lead",
                    "check_required_fields_for_stage",
                    [psc.leadResId, psc.targetStageId],
                );
                if (!recheck.missing || recheck.missing.length === 0) {
                    await psc.ormService.call(
                        "crm.lead",
                        "move_to_stage",
                        [psc.leadResId, psc.targetStageId],
                    );
                    psc.closeNotification();
                    clearHighlight();
                    if (psc.model && psc.model.load) {
                        await psc.model.load();
                    }
                } else {
                    psc.closeNotification();
                    clearHighlight();
                    const stillLabels = recheck.missing.map((f) => f.label).join(", ");
                    const stillNames = recheck.missing.map((f) => f.name);
                    highlightMissingFields(stillNames);
                    const closeNew = psc.notificationService.add(
                        `Hâlâ eksik alanlar var: ${stillLabels}`,
                        { type: "danger", sticky: true }
                    );
                    pendingStageChange = { ...psc, closeNotification: closeNew };
                }
            } catch (e) {
                console.error("[crm_komtas_ux] Error on auto-retry after save:", e);
            }
        }
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
