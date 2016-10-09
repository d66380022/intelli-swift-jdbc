/**
 * 设置过关系的region
 *
 * @class BI.SetRelationPane
 * @extends BI.Widget
 */

BI.SetRelationPane = BI.inherit(BI.Widget, {

    constants: {
        titleGap: 10,
        buttonHeight: 30,
        buttonGap: 10,
        titleHeight: 50,
        labelWidth: 45,
        labelHeight: 30,
        gap: 30,
        combineComboPosition: 2,
        Multi_Path: 1,
        Multi_Match_Multi: 2,
        No_Select_Dimension: 3
    },

    _defaultConfig: function () {
        return BI.extend(BI.SetRelationPane.superclass._defaultConfig.apply(this, arguments), {
            baseCls: "bi-set-relation-pane",
            tableName: "",
            targetIds: [],
            dimensionId: ""
        });
    },

    _init: function () {
        BI.SetRelationPane.superclass._init.apply(this, arguments);
        var self = this, o = this.options;

        this.targetLine = BI.createWidget({
            type: "bi.target_label_control"
        });

        this.dimensiontreeCombo = BI.createWidget({
            type: "bi.dimension_tree_combo",
            dId: o.dimensionId
        });

        this.dimensiontreeCombo.on(BI.DimensionTreeCombo.EVENT_CHANGE, function(){
            var fieldId = this.getValue()[0];
            self._checkDimensionAndTargetRelation(BI.Utils.getTableIdByFieldID(fieldId));
            self.tab.populate({
                dimensionFieldId: fieldId,
                targetIds: o.targetIds
            });
            self.fireEvent(BI.SetRelationPane.EVENT_PATH_PANE_CHANGE, false);
        });

        this.tab = BI.createWidget({
            type: "bi.tab",
            height: 200,
            cardCreator: BI.bind(this._createTabs, this)
        });

        this.tab.setSelect(this.constants.Multi_Path);

        this.emptyItem = BI.createWidget({
            type: "bi.default",
            items: []
        });

        this.layout = BI.createWidget({
            type: "bi.vtape",
            hgap: this.constants.titleGap,
            element: this.element,
            items: [{
                el: this.targetLine,
                height: 30
            }, {
                el: {
                    type: "bi.htape",
                    items: [{
                        el: {
                            type: "bi.label",
                            textAlign: "left",
                            text: BI.i18nText("BI-Dimension"),
                            height: this.constants.buttonHeight,
                            cls: "setting-tip-label"
                        },
                        width: this.constants.labelWidth
                    }, this.dimensiontreeCombo]
                },
                height: 30
            }, {
                el: this.emptyItem,
                height: 0
            }, {
                el: {
                    type: "bi.left",
                    items: [{
                        type: "bi.label",
                        cls: "setting-tip-label",
                        text: BI.i18nText("BI-Please_Select_Path_Between_Target_And_Dimension"),
                        height: this.constants.labelHeight,
                        rgap: 15
                    }, {
                        type: "bi.icon_button",
                        height: this.constants.labelHeight,
                        cls: "path-set-doubt"
                    }]
                },
                height: this.constants.labelHeight
            }, {
                type: "bi.vertical",
                cls: "select-path-region",
                scrolly: false,
                scrollable: true,
                vgap: 10,
                items: [this.tab]
            }]
        });
    },

    _createTabs: function (v) {
        var self = this;
        switch (v) {
            case this.constants.Multi_Path:
                var multiPathChooser = BI.createWidget({
                    type: "bi.multi_path_chooser",
                    height: 200
                });
                multiPathChooser.on(BI.MultiPathChooser.EVENT_PATH_CHANGE, function(v){
                    self.fireEvent(BI.SetRelationPane.EVENT_PATH_PANE_CHANGE, v);
                });
                return multiPathChooser;
            case this.constants.Multi_Match_Multi:
                return BI.createWidget({
                    type: "bi.multi_match_multi_path_chooser",
                    height: 200
                });
            case this.constants.No_Select_Dimension:
                return BI.createWidget({
                    type: "bi.vertical",
                    items: [{
                        type: "bi.label",
                        textAlign: "left",
                        cls: "setting-dimension-tip",
                        text: BI.i18nText("BI-Please_Select_Dimension_Field")
                    }],
                    height: 200
                });
        }
    },

    _checkDimensionAndTargetRelation: function (tId) {
        var o = this.options;
        var self = this;
        if(BI.isNull(tId)){
            this.tab.setSelect(this.constants.No_Select_Dimension);
            return;
        }
        var commonPrimaryTableIds = BI.Utils.getCommonPrimaryTablesByTableIDs([BI.Utils.getTableIDByDimensionID(o.targetIds[0]), tId]);
        var combineCombo = this.layout.attr("items")[this.constants.combineComboPosition];
        if(commonPrimaryTableIds.length !== 0 && BI.Utils.getPathsFromTableAToTableB(tId, BI.Utils.getTableIDByDimensionID(o.targetIds[0])).length === 0
        && tId != BI.Utils.getTableIDByDimensionID(o.targetIds[0])){
            if(!this.selectCombineTableCombo){
                this.selectCombineTableCombo = BI.createWidget({
                    type: "bi.text_value_combo",
                    text: BI.i18nText("BI-Please_Select_Combine_Table_For_Dimension_And_Target"),
                    height: 30
                });
                this.selectCombineTableCombo.on(BI.TextValueCombo.EVENT_CHANGE, function () {
                    self.tab.populate({
                        dimensionFieldId: self.dimensiontreeCombo.getValue()[0],
                        targetIds: o.targetIds,
                        combineTableId: this.getValue()[0]
                    });
                });
                this.emptyItem.addItem({
                    type: "bi.htape",
                    height: 30,
                    tgap: 5,
                    items: [{
                        el: {
                            type: "bi.label",
                            textAlign: "left",
                            text: BI.i18nText("BI-Merge_Table"),
                            cls: "setting-tip-label",
                            height: this.constants.buttonHeight
                        },
                        width: this.constants.labelWidth
                    }, this.selectCombineTableCombo]
                });
            }
            var items = BI.map(commonPrimaryTableIds, function(idx, tId){
                return {
                    text: BI.Utils.getTableNameByID(tId),
                    value: tId
                };
            });
            this.selectCombineTableCombo.populate(items);
            this.selectCombineTableCombo.setValue();
            combineCombo.height = 35;
            this.tab.setSelect(this.constants.Multi_Match_Multi);
        }else{
            combineCombo.height = 0;
            this.tab.setSelect(this.constants.Multi_Path);
        }
        this.layout.resize();
    },

    populate: function(items){
        var  o = this.options;
        o.targetIds = items;
        this.targetLine.populate(o.targetIds);
        this.dimensiontreeCombo.populate(o.targetIds);
        this.tab.populate({
            dimensionFieldId: BI.Utils.getFieldIDByDimensionID(o.dimensionId),
            targetIds: o.targetIds
        });
    },

    setValue: function(v){
        var o = this.options;
        if(BI.isEmpty(v)){
            this._checkDimensionAndTargetRelation(BI.Utils.getTableIdByFieldID(this.dimensiontreeCombo.getValue()[0]));
            return;
        }
        this._checkDimensionAndTargetRelation(BI.Utils.getTableIdByFieldID(v._src.field_id));
        this.dimensiontreeCombo.setValue(v._src.field_id);
        var items = {
            dimensionFieldId: v._src.field_id,
            targetIds: o.targetIds
        };
        if(this.tab.getSelect() === this.constants.Multi_Match_Multi){
            var combineTableId = BI.Utils.getTableIdByFieldID(BI.Utils.getPrimaryIdFromRelation(v.target_relation[0][0]));
            this.selectCombineTableCombo.setValue(combineTableId);
            items.combineTableId = combineTableId;
        }
        this.tab.populate(items);
        this.tab.setValue(v.target_relation);
    },

    getValue: function(){
        return {
            _src: {
                field_id: this.dimensiontreeCombo.getValue()[0]
            },
            target_relation: this.tab.getValue()
        }
    }
});
BI.SetRelationPane.EVENT_PATH_PANE_CHANGE = "SetRelationPane.EVENT_PATH_PANE_CHANGE";
BI.SetRelationPane.EVENT_DESTROY = "SetRelationPane.EVENT_DESTROY";
BI.SetRelationPane.EVENT_SET_RELATION = "SetRelationPane.EVENT_SET_RELATION";
$.shortcut('bi.set_relation_pane', BI.SetRelationPane);