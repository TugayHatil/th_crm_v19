/** @odoo-module **/

import { patch } from "@web/core/utils/patch";
import { CrmKanbanDynamicGroupList } from "@crm/views/crm_kanban/crm_kanban_model";

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

                        notificationService.add(
                            `Bu fırsatı "${targetGroup.displayName}" aşamasına taşımak için şu zorunlu alanları doldurun: ${fieldNames}`,
                            {
                                type: "danger",
                                sticky: true,
                                buttons: [
                                    {
                                        name: "Alanları Doldur",
                                        onClick: () => {
                                            actionService.doAction(action, {
                                                onClose: onDialogClose,
                                            });
                                        },
                                    },
                                ],
                            }
                        );

                        actionService.doAction(action, {
                            onClose: onDialogClose,
                        });
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
