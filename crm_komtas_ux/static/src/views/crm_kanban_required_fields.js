/** @odoo-module **/

import { patch } from "@web/core/utils/patch";
import { CrmKanbanDynamicGroupList } from "@crm/views/crm_kanban/crm_kanban_model";
import { Dialog } from "@web/core/dialog/dialog";
import { Component, useState, xml } from "@odoo/owl";

class RequiredFieldsDialog extends Component {
    setup() {
        this.missingFields = this.props.missingFields || [];
        this.state = useState({});
        for (const field of this.missingFields) {
            this.state[field.name] = "";
        }
    }

    _getInputType(ttype) {
        const typeMap = {
            'char': 'text',
            'text': 'text',
            'integer': 'number',
            'float': 'number',
            'monetary': 'number',
            'date': 'date',
            'datetime': 'datetime-local',
            'boolean': 'checkbox',
            'selection': 'select',
        };
        return typeMap[ttype] || 'text';
    }

    _onConfirm() {
        const values = {};
        for (const field of this.missingFields) {
            let val = this.state[field.name];
            if (field.ttype === 'many2one') {
                if (val && typeof val === 'object') {
                    values[field.name] = val.id;
                }
            } else if (field.ttype === 'boolean') {
                values[field.name] = !!val;
            } else if (field.ttype === 'integer' || field.ttype === 'float' || field.ttype === 'monetary') {
                values[field.name] = val ? parseFloat(val) : 0;
            } else if (val === '') {
                values[field.name] = false;
            } else {
                values[field.name] = val;
            }
        }
        this.props.onConfirm(values);
        this.props.close();
    }

    _onCancel() {
        this.props.onCancel();
        this.props.close();
    }
}

RequiredFieldsDialog.template = xml`
    <Dialog title="'Zorunlu Alanları Doldurun'" size="'md'">
        <div class="alert alert-warning" t-if="props.stageName">
            Bu fırsatı <strong t-esc="props.stageName"/> aşamasına taşımak için aşağıdaki zorunlu alanları doldurmanız gerekir.
        </div>
        <div class="row g-3">
            <t t-foreach="missingFields" t-as="field" t-key="field.name">
                <div class="col-12">
                    <label class="form-label fw-bold" t-att-for="field.name">
                        <t t-esc="field.label"/>
                    </label>
                    <t t-if="field.ttype === 'many2one'">
                        <input
                            type="text"
                            class="form-control"
                            t-att-id="field.name"
                            t-att-placeholder="field.relation"
                            t-model="state[field.name]"
                        />
                    </t>
                    <t t-elif="field.ttype === 'text'">
                        <textarea
                            class="form-control"
                            t-att-id="field.name"
                            t-model="state[field.name]"
                        />
                    </t>
                    <t t-elif="field.ttype === 'boolean'">
                        <div class="form-check">
                            <input
                                type="checkbox"
                                class="form-check-input"
                                t-att-id="field.name"
                                t-model="state[field.name]"
                            />
                        </div>
                    </t>
                    <t t-else="">
                        <input
                            t-att-type="_getInputType(field.ttype)"
                            class="form-control"
                            t-att-id="field.name"
                            t-model="state[field.name]"
                        />
                    </t>
                </div>
            </t>
        </div>
        <t t-set-slot="footer">
            <button class="btn btn-primary" t-on-click="_onConfirm">Kaydet ve Aşamayı Değiştir</button>
            <button class="btn btn-secondary" t-on-click="_onCancel">Vazgeç</button>
        </t>
    </Dialog>
`;

RequiredFieldsDialog.components = { Dialog };
RequiredFieldsDialog.props = {
    missingFields: Array,
    stageName: String,
    onConfirm: Function,
    onCancel: Function,
    close: Function,
};

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
                        const dialogService = this.model.env.services.dialog;
                        const ormService = this.model.orm;
                        const leadResId = record.resId;
                        const model = this.model;

                        dialogService.add(RequiredFieldsDialog, {
                            missingFields: result.missing,
                            stageName: targetGroup.displayName,
                            onConfirm: async (values) => {
                                try {
                                    await ormService.call(
                                        "crm.lead",
                                        "apply_required_fields_and_stage",
                                        [leadResId, targetStageId, values],
                                    );
                                    await model.load();
                                } catch (e) {
                                    const notification = model.env.services.notification;
                                    notification.add(e.message || "Bir hata oluştu", {
                                        type: "danger",
                                    });
                                }
                            },
                            onCancel: async () => {
                                await model.load();
                            },
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
