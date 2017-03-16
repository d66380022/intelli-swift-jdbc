SimpleSelectDataSearcherView = BI.inherit(BI.View, {
    _defaultConfig: function () {
        return BI.extend(SimpleSelectDataSearcherView.superclass._defaultConfig.apply(this, arguments), {
            baseCls: "mvc-simple-select-data-searcher bi-mvc-layout"
        })
    },

    _init: function () {
        SimpleSelectDataSearcherView.superclass._init.apply(this, arguments);
    },

    _createSearcher: function () {
        var seacher = BI.createWidget({
            type: "bi.simple_select_data_searcher",
            width: 200,
            height: 600,
            cls: "mvc-border",
            itemsCreator: function (op, populate) {
                var packageName = "";
                if (op.searchType) {
                    packageName = op.searchType + "--" + op.keyword;
                } else {
                    packageName = "";
                }
                if (!op.node) {
                    populate([
                        {
                            id: 1,
                            type: "bi.select_data_level0_node",
                            text: "合同回款信息--" + packageName,
                            value: 1,
                            isParent: true
                        }, {
                            id: 2,
                            type: "bi.select_data_level0_node",
                            text: "合同信息--" + packageName,
                            value: 2,
                            isParent: true
                        }
                    ]);
                    return;
                }
                if (op.node.id === 1) {
                    populate([
                        {
                            pId: 1,
                            id: 11,
                            type: "bi.select_data_level0_item",
                            fieldType: BICst.COLUMN.NUMBER,
                            text: "回款金额--" + packageName,
                            value: 11
                        }, {
                            pId: 1,
                            id: 12,
                            type: "bi.select_data_level0_item",
                            fieldType: BICst.COLUMN.STRING,
                            text: "记录人--" + packageName,
                            value: 12
                        }, {
                            pId: 1,
                            id: 13,
                            type: "bi.select_data_level1_date_node",
                            text: "付款时间--" + packageName,
                            value: 13,
                            isParent: true
                        }, {
                            pId: 1,
                            id: 14,
                            type: "bi.select_data_level1_node",
                            text: "合同信息--" + packageName,
                            value: 14,
                            isParent: true
                        }
                    ]);
                    return;
                }
                if (op.node.id === 2) {
                    populate([{
                        pId: 2,
                        id: 21,
                        type: "bi.select_data_level0_item",
                        fieldType: BICst.COLUMN.NUMBER,
                        text: "购买数量--" + packageName,
                        value: 21
                    }]);
                    return;
                }
                if (op.node.id === 13) {
                    populate([
                        {
                            pId: 13,
                            id: 131,
                            type: "bi.select_data_level1_item",
                            fieldType: BICst.COLUMN.DATE,
                            text: "年份--" + packageName,
                            value: 131
                        }, {
                            pId: 13,
                            id: 132,
                            type: "bi.select_data_level1_item",
                            fieldType: BICst.COLUMN.DATE,
                            text: "季度--" + packageName,
                            value: 132
                        }, {
                            pId: 13,
                            id: 133,
                            type: "bi.select_data_level1_item",
                            fieldType: BICst.COLUMN.DATE,
                            text: "月--" + packageName,
                            value: 133
                        }, {
                            pId: 13,
                            id: 134,
                            type: "bi.select_data_level1_item",
                            fieldType: BICst.COLUMN.DATE,
                            text: "星期--" + packageName,
                            value: 134
                        }, {
                            pId: 13,
                            id: 135,
                            type: "bi.select_data_level1_item",
                            fieldType: BICst.COLUMN.DATE,
                            text: "日期--" + packageName,
                            value: 135
                        }
                    ]);
                    return;
                }
                if (op.node.id === 14) {
                    populate([{
                        pId: 14,
                        id: 141,
                        type: "bi.select_data_level1_item",
                        fieldType: BICst.COLUMN.NUMBER,
                        text: "购买数量--" + packageName,
                        value: 141
                    }]);
                    return;
                }
            }
        });
        seacher.populate();
        return seacher;
    },

    _render: function (vessel) {
        var self = this;
        BI.createWidget({
            type: "bi.vertical",
            element: vessel,
            hgap: 30,
            vgap: 20,
            items: [{
                type: "bi.label",
                height: 50,
                text: "搜索功能面板"
            }, {
                el: this._createSearcher()
            }]
        });
    }
});

SimpleSelectDataSearcherModel = BI.inherit(BI.Model, {});