/**
 * Created by Young's on 2016/4/7.
 */
BI.LinkageFilterItem = BI.inherit(BI.Widget, {
    _defaultConfig: function () {
        return BI.extend(BI.LinkageFilterItem.superclass._defaultConfig.apply(this, arguments), {
            baseCls: "bi-linkage-filter-item"
        })
    },

    _init: function () {
        BI.LinkageFilterItem.superclass._init.apply(this, arguments);
        var self = this, o = this.options;
        var tId = o.tId, linkFilter = o.filter;
        var wId = BI.Utils.getWidgetIDByDimensionID(tId);
        var items = [];
        BI.each(linkFilter, function (i, value) {
            items.push(self._createSingleLinkageFilter(value.dId, value.value[0]));
        });
        var widgetType = BI.Utils.getWidgetTypeByID(wId);
        var wrapper = BI.createWidget({
            type: "bi.left",
            element: this.element,
            items: [{
                type: "bi.center_adapt",
                cls: BICst.WIDGET_ICON_CLS_MAP[widgetType],
                items: [{
                    type: "bi.icon",
                    width: 20,
                    height: 20
                }],
                width: 20,
                height: 30
            }, {
                type: "bi.label",
                text: BI.Utils.getWidgetNameByID(wId),
                height: 30
            }],
            hgap: 5,
            vgap: 5
        });
        wrapper.addItems(items);
    },

    _formatDate: function (d) {
        if (BI.isNull(d) || !BI.isNumeric(d)) {
            return d || "";
        }
        var date = new Date(BI.parseInt(d));
        return date.print("%Y-%X-%d")
    },

    _parseClicked4Group: function (dId, v) {
        var group = BI.Utils.getDimensionGroupByID(dId);
        var fieldType = BI.Utils.getFieldTypeByDimensionID(dId);
        var clicked = v;

        if (BI.isNotNull(group)) {
            if (fieldType === BICst.COLUMN.STRING) {
                var details = group.details,
                    ungroup2Other = group.ungroup2Other,
                    ungroup2OtherName = group.ungroup2OtherName;
                if (ungroup2Other === BICst.CUSTOM_GROUP.UNGROUP2OTHER.SELECTED &&
                    v === BICst.UNGROUP_TO_OTHER) {
                    clicked = ungroup2OtherName;
                }
                BI.some(details, function (i, detail) {
                    if (detail.id === v) {
                        clicked = detail.value;
                        return true;
                    }
                });
            } else if (fieldType === BICst.COLUMN.NUMBER) {
                var groupValue = group.group_value, groupType = group.type;
                if (groupType === BICst.GROUP.CUSTOM_NUMBER_GROUP) {
                    var groupNodes = groupValue.group_nodes, useOther = groupValue.use_other;
                    if (v === BICst.UNGROUP_TO_OTHER) {
                        clicked = useOther;
                    }
                    BI.some(groupNodes, function (i, node) {
                        if (node.id === v) {
                            clicked = node.group_name;
                            return true;
                        }
                    });
                }
            }
        }
        return clicked;
    },

    _createSingleLinkageFilter: function (dId, value) {
        var tId = this.options.tId;
        var onRemoveFilter = this.options.onRemoveFilter;
        var text = this._parseClicked4Group(dId, value);
        //日期需要format
        if (BI.Utils.getFieldTypeByDimensionID(dId) === BICst.COLUMN.DATE &&
            BI.Utils.getDimensionGroupByID(dId).type === BICst.GROUP.YMD) {
            text = this._formatDate(text);
        }
        var removeButton = BI.createWidget({
            type: "bi.icon_button",
            cls: "close-ha-font",
            width: 20,
            height: 30
        });
        removeButton.on(BI.IconButton.EVENT_CHANGE, function () {
            onRemoveFilter(tId, dId);
        });
        return {
            type: "bi.left",
            cls: "single-filter",
            items: [{
                type: "bi.label",
                text: BI.Utils.getDimensionNameByID(dId) + "=" + text,
                height: 30
            }, removeButton],
            hgap: 2
        }
    }
});
BI.LinkageFilterItem.EVENT_REMOVE_FILTER = "EVENT_REMOVE_FILTER";
$.shortcut("bi.linkage_filter_item", BI.LinkageFilterItem);