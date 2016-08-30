/**
 * Created by fay on 2016/7/22.
 */
BI.DataLabelNumberFieldFilterItem = BI.inherit(BI.AbstractDataLabelFilterItem, {
    _constant: {
        LEFT_ITEMS_H_GAP: 5,
        CONTAINER_HEIGHT: 40,
        BUTTON_HEIGHT: 30,
        COMBO_WIDTH: 120,
        FIELD_NAME_BUTTON_WIDTH: 80,
        TEXT_BUTTON_H_GAP: 10,
        INPUT_WIDTH: 230,
        INPUT_WIDTH_CHANGE: 180,
        COMBO_WIDTH_CHANGE: 80,
        LABEL_WIDTH: 30
    },

    _defaultConfig: function () {
        return BI.extend(BI.DataLabelNumberFieldFilterItem.superclass._defaultConfig.apply(this, arguments), {
            extraCls: "data-label-condition-item"
        })
    },

    _init: function () {
        BI.DataLabelNumberFieldFilterItem.superclass._init.apply(this, arguments);
        var self = this, o = this.options;

        this.isDimension = false;
        var wId = BI.Utils.getWidgetIDByDimensionID(o.dId);
        if(BI.contains(BI.Utils.getAllDimDimensionIDs(wId), o.dId)){
            this.isDimension = true;
        }
        this.size = {};
        var left = this._buildConditions();
        this.styleSetting = this._createStyle(o.style_setting);
        this.deleteButton = BI.createWidget({
            type: "bi.icon_button",
            cls: "close-h-font"
        });
        this.deleteButton.on(BI.Controller.EVENT_CHANGE, function () {
            self.fireEvent(BI.AbstractDataLabelFilterItem.DELETE, self);
            self.destroy();
            BI.DataLabelNumberFieldFilterItem.superclass.destroy.apply(this, arguments);
        });

        BI.createWidget({
            type: "bi.vertical",
            cls: "item-content",
            element: this.element,
            items: [{
                type: "bi.left_right_vertical_adapt",
                height: this._constant.CONTAINER_HEIGHT,
                items: {
                    left: [left[0], left[1], left[2], left[3]],
                    right: [this.styleSetting, this.deleteButton]
                },
                lhgap: this._constant.LEFT_ITEMS_H_GAP,
                rhgap: this._constant.LEFT_ITEMS_H_GAP
            }]
        });
    },

    populate: function (item) {
        this.filterType.setValue(item.filter_type);
        this._refreshFilterWidget(item.filter_type, item.filter_value);
    },

    _buildConditions: function () {
        var self = this, o = this.options;
        o.filter_type = this.isDimension === false ? o.filter_type : BICst.DIMENSION_FILTER_STRING.BELONG_VALUE;
        if (BI.isNull(o.dId)) {
            return [];
        }

        var fieldName = BI.Utils.getDimensionNameByID(o.dId);
        var selfName = BI.Utils.getDimensionNameByID(o.sdId);
        var hasSeries = false;

        this.isSelf = fieldName === selfName;
        this.changeWidth = false;
        BI.each(BI.Utils.getWidgetViewByID(BI.Utils.getWidgetIDByDimensionID(o.dId))[20000], function (idx, dId) {
            if (BI.Utils.isDimensionUsable(dId)) {
                self.changeWidth = self.isSelf;
                return hasSeries = true;
            }
        });
        this.size.INPUT_WIDTH = this.changeWidth ? this._constant.INPUT_WIDTH_CHANGE : this._constant.INPUT_WIDTH;
        this.size.COMBO_WIDTH = this.changeWidth ? this._constant.COMBO_WIDTH_CHANGE : this._constant.COMBO_WIDTH;
        this.fieldButton = BI.createWidget({
            type: "bi.text_button",
            text: this.isSelf ? BI.i18nText("BI-Self") : fieldName,
            title: this.isSelf ? BI.i18nText("BI-Self") : fieldName,
            width: this._constant.FIELD_NAME_BUTTON_WIDTH,
            height: this._constant.BUTTON_HEIGHT,
            textAlign: "left",
            hgap: this._constant.TEXT_BUTTON_H_GAP
        });
        this.fieldButton.on(BI.Controller.EVENT_CHANGE, function () {
            arguments[2] = self;
            self.fireEvent(BI.Controller.EVENT_CHANGE, arguments);
        });
        this.filterWidgetContainer = BI.createWidget({
            type: "bi.left"
        });
        this.filterType = BI.createWidget({
            type: "bi.text_value_down_list_combo",
            width: this.size.COMBO_WIDTH,
            height: this._constant.BUTTON_HEIGHT,
            items: this.isDimension ? BICst.DATA_LABEL_FILTER_STRING_COMBO : BICst.DATA_LABEL_FILTER_NUMBER_COMBO
        });
        this.filterType.setValue(o.filter_type);
        this.filterType.on(BI.TextValueDownListCombo.EVENT_CHANGE, function () {
            self._refreshFilterWidget(self.filterType.getValue()[0]);
        });
        this._refreshFilterWidget(o.filter_type, this.options.filter_value);

        if (this.isSelf && hasSeries) {
            this.filterRange = this._createRange();
        } else {
            this.filterRange = BI.createWidget();
        }
        return [this.fieldButton, this.filterType, this.filterWidgetContainer, this.filterRange];
    },

    _refreshFilterWidget: function (filterType, initData) {
        var addItem;
        if (this.changeWidth) {
            this.filterType.setWidth(this.size.COMBO_WIDTH);
            this.filterRange && this.filterRange.setWidth(this.size.COMBO_WIDTH);
        }
        switch (filterType) {
            case BICst.DIMENSION_FILTER_STRING.BELONG_VALUE:
            case BICst.DIMENSION_FILTER_STRING.NOT_BELONG_VALUE:
                addItem = this._createStringBelongCombo(initData);

                break;
            case BICst.DIMENSION_FILTER_STRING.CONTAIN:
            case BICst.DIMENSION_FILTER_STRING.NOT_CONTAIN:
                addItem = this._createStringInput(initData);
                break;
            case BICst.DIMENSION_FILTER_STRING.IS_NULL:
            case BICst.DIMENSION_FILTER_STRING.NOT_NULL:
                this.filterWidget = BI.createWidget();
                addItem = this.filterWidget;
                break;
            case BICst.DIMENSION_FILTER_STRING.BEGIN_WITH:
            case BICst.DIMENSION_FILTER_STRING.END_WITH:
                addItem = this._createStringInput(initData);
                break;
            case BICst.TARGET_FILTER_NUMBER.EQUAL_TO:
            case BICst.TARGET_FILTER_NUMBER.NOT_EQUAL_TO:
            case BICst.DIMENSION_FILTER_NUMBER.TOP_N:
                addItem = this._createNumberInput(initData);
                break;
            case BICst.DIMENSION_FILTER_NUMBER.BELONG_VALUE:
            case BICst.DIMENSION_FILTER_NUMBER.NOT_BELONG_VALUE:
                addItem = this._createNumberIntervalFilter(initData);
                break;
            case BICst.DIMENSION_FILTER_NUMBER.BELONG_USER:
            case BICst.DIMENSION_FILTER_NUMBER.NOT_BELONG_USER:
                addItem = this._createNumberIntervalFilter(initData);
                break;
            case BICst.TARGET_FILTER_NUMBER.LARGE_OR_EQUAL_CAL_LINE:
            case BICst.TARGET_FILTER_NUMBER.SMALL_THAN_CAL_LINE:
            case BICst.DIMENSION_FILTER_NUMBER.IS_NULL:
            case BICst.DIMENSION_FILTER_NUMBER.NOT_NULL:
                this.filterType.setWidth(this._constant.COMBO_WIDTH);
                this.filterRange && this.filterRange.setWidth(this._constant.COMBO_WIDTH);
                this.filterWidget = BI.createWidget();
                addItem = this.filterWidget;
                break;
        }
        this.filterWidgetContainer.empty();
        this.filterWidgetContainer.addItem(addItem);
    },

    _createStringInput: function (initData) {
        this.filterWidget = BI.createWidget({
            type: "bi.sign_editor",
            cls: "condition-operator-input",
            allowBlank: true,
            height: this._constant.BUTTON_HEIGHT,
            width: this._constant.INPUT_WIDTH
        });
        BI.isNotNull(initData) && this.filterWidget.setValue(initData);
        return this.filterWidget;
    },

    _createStringBelongCombo: function (initData) {
        var o = this.options;
        this.filterWidget = BI.createWidget({
            type: "bi.select_dimension_data_combo",
            dId: o.dId,
            width: this._constant.INPUT_WIDTH,
            height: this._constant.BUTTON_HEIGHT
        });
        BI.isNotNull(initData) && this.filterWidget.setValue(initData);
        return this.filterWidget;
    },

    _createNumberIntervalFilter: function (initData) {
        this.filterWidget = BI.createWidget({
            type: "bi.numerical_interval",
            width: this.size.INPUT_WIDTH,
            height: this._constant.BUTTON_HEIGHT
        });
        BI.isNotNull(initData) && this.filterWidget.setValue(initData);
        return this.filterWidget;
    },

    _createNumberInput: function (initData) {
        var self = this;
        this.filterWidget = BI.createWidget({
            type: "bi.text_editor",
            validationChecker: function () {
                if (!BI.isNumeric(self.filterWidget.getValue())) {
                    return false;
                }
            },
            errorText: BI.i18nText("BI-Numerical_Interval_Input_Data"),
            allowBlank: true,
            height: this._constant.BUTTON_HEIGHT,
            width: this.size.INPUT_WIDTH - this._constant.LABEL_WIDTH
        });
        BI.isNotNull(initData) && this.filterWidget.setValue(initData);
        return BI.createWidget({
            type: "bi.inline",
            items: [{
                type: "bi.label",
                height: this._constant.BUTTON_HEIGHT,
                text: "N = ",
                width: this._constant.LABEL_WIDTH
            }, this.filterWidget]
        });
    },

    _createRange: function () {
        var o = this.options;
        var range = BI.createWidget({
            type: "bi.text_value_down_list_combo",
            width: this.size.COMBO_WIDTH,
            height: this._constant.BUTTON_HEIGHT,
            items: BICst.DATA_LABEL_FILTER_RANGE_COMBO
        });
        o.filter_range ? range.setValue(o.filter_range) : range.setValue(BICst.DATA_LABEL_RANGE.ALL);
        return range;
    },

    _createStyle: function (initData) {
        var o = this.options;
        this.style = BI.createWidget({
            type: "bi.data_label_style_set",
            chartType: o.chartType
        });
        BI.isNotNull(initData) && this.style.setValue(initData);
        return this.style;
    },

    getValue: function () {
        return {
            target_id: this.options.dId,
            filter_type: this.filterType.getValue()[0],
            filter_value: this.filterWidget.getValue(),
            filter_range: this.filterRange ? this.filterRange.getValue()[0] : "",
            style_setting: this.style.getValue()
        }
    }
});
$.shortcut("bi.data_label_number_field_filter_item", BI.DataLabelNumberFieldFilterItem);