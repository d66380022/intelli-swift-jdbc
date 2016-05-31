/**
 * @class BI.BubbleChartSetting
 * @extends BI.Widget
 * 柱状，堆积柱状，组合图样式
 */
BI.BubbleChartSetting = BI.inherit(BI.Widget, {

    constant: {
        SINGLE_LINE_HEIGHT: 60,
        SIMPLE_H_GAP: 10,
        SIMPLE_L_GAP: 2,
        CHECKBOX_WIDTH: 16,
        EDITOR_WIDTH: 80,
        EDITOR_HEIGHT: 26,
        BUTTON_WIDTH: 40,
        BUTTON_HEIGHT: 30,
        ICON_WIDTH: 24,
        ICON_HEIGHT: 24,
        NUMBER_LEVEL_SEGMENT_WIDTH: 300,
        FORMAT_SEGMENT_WIDTH: 240
    },

    _defaultConfig: function(){
        return BI.extend(BI.BubbleChartSetting.superclass._defaultConfig.apply(this, arguments), {
            baseCls: "bi-charts-setting"
        })
    },

    _init: function(){
        BI.BubbleChartSetting.superclass._init.apply(this, arguments);
        var self = this, o = this.options;

        this.colorSelect = BI.createWidget({
            type: "bi.chart_setting_select_color_combo",
            width: 130
        });
        this.colorSelect.populate(BICst.CHART_COLORS);

        this.colorSelect.on(BI.ChartSettingSelectColorCombo.EVENT_CHANGE, function(){
            self.fireEvent(BI.BubbleChartSetting.EVENT_CHANGE);
        });

        this.chartTypeGroup = BI.createWidget({
            type: "bi.button_group",
            items: BI.createItems(BICst.BUBBLE_CHART_STYLE_GROUP, {
                type: "bi.text_button",
                extraCls: "table-style-font",
                width: this.constant.BUTTON_WIDTH,
                height: this.constant.BUTTON_HEIGHT
            }),
            layouts: [{
                type: "bi.left"
            }]
        });
        this.chartTypeGroup.on(BI.ButtonGroup.EVENT_CHANGE, function(){
            self.fireEvent(BI.GroupTableSetting.EVENT_CHANGE);
        });

        var tableStyle = BI.createWidget({
            type: "bi.horizontal",
            cls: "single-line-settings",
            lgap: this.constant.SIMPLE_H_GAP,
            items: [{
                type: "bi.label",
                text: BI.i18nText("BI-Table_Sheet_Style"),
                cls: "line-title"
            }, {
                type: "bi.left",
                cls: "detail-style",
                items: BI.createItems([{
                    type: "bi.label",
                    text: BI.i18nText("BI-Chart_Color"),
                    cls: "attr-names"
                }, {
                    el: {
                        type: "bi.center_adapt",
                        items: [this.colorSelect]
                    },
                    lgap: this.constant.SIMPLE_H_GAP
                }], {
                    height: this.constant.SINGLE_LINE_HEIGHT
                })
            }]
        });

        //格式和数量级
        this.lYAxisStyle = BI.createWidget({
            type: "bi.segment",
            width: this.constant.FORMAT_SEGMENT_WIDTH,
            height: this.constant.BUTTON_HEIGHT,
            items: BICst.TARGET_STYLE_FORMAT
        });

        this.lYAxisStyle.on(BI.Segment.EVENT_CHANGE, function(){
            self.fireEvent(BI.BubbleChartSetting.EVENT_CHANGE);
        });

        this.numberLevellY = BI.createWidget({
            type: "bi.segment",
            width: this.constant.NUMBER_LEVEL_SEGMENT_WIDTH,
            height: this.constant.BUTTON_HEIGHT,
            items: BICst.TARGET_STYLE_LEVEL
        });

        this.numberLevellY.on(BI.Segment.EVENT_CHANGE, function(){
            self.fireEvent(BI.BubbleChartSetting.EVENT_CHANGE);
        });

        this.XAxisStyle = BI.createWidget({
            type: "bi.segment",
            width: this.constant.FORMAT_SEGMENT_WIDTH,
            height: this.constant.BUTTON_HEIGHT,
            items: BICst.TARGET_STYLE_FORMAT
        });

        this.XAxisStyle.on(BI.Segment.EVENT_CHANGE, function(){
            self.fireEvent(BI.BubbleChartSetting.EVENT_CHANGE);
        });

        this.numberLevelX = BI.createWidget({
            type: "bi.segment",
            width: this.constant.NUMBER_LEVEL_SEGMENT_WIDTH,
            height: this.constant.BUTTON_HEIGHT,
            items: BICst.TARGET_STYLE_LEVEL
        });

        this.numberLevelX.on(BI.Segment.EVENT_CHANGE, function(){
            self.fireEvent(BI.BubbleChartSetting.EVENT_CHANGE);
        });

        //单位
        this.LYUnit = BI.createWidget({
            type: "bi.sign_editor",
            width: this.constant.EDITOR_WIDTH,
            height: this.constant.EDITOR_HEIGHT,
            cls: "unit-input",
            watermark: BI.i18nText("BI-Custom_Input")
        });

        this.LYUnit.on(BI.SignEditor.EVENT_CONFIRM, function(){
            self.fireEvent(BI.BubbleChartSetting.EVENT_CHANGE);
        });

        this.XUnit = BI.createWidget({
            type: "bi.sign_editor",
            width: this.constant.EDITOR_WIDTH,
            height: this.constant.EDITOR_HEIGHT,
            cls: "unit-input",
            watermark: BI.i18nText("BI-Custom_Input")
        });

        this.XUnit.on(BI.SignEditor.EVENT_CONFIRM, function(){
            self.fireEvent(BI.BubbleChartSetting.EVENT_CHANGE);
        });

        //显示标题
        this.isShowTitleLY = BI.createWidget({
            type: "bi.multi_select_item",
            value: BI.i18nText("BI-Show_Title"),
            width: 90
        });

        this.isShowTitleLY.on(BI.Controller.EVENT_CHANGE, function(){
            this.isSelected() ? self.editTitleLY.setVisible(true) : self.editTitleLY.setVisible(false);
            self.fireEvent(BI.BubbleChartSetting.EVENT_CHANGE);
        });

        this.editTitleLY = BI.createWidget({
            type: "bi.sign_editor",
            width: this.constant.EDITOR_WIDTH,
            height: this.constant.EDITOR_HEIGHT,
            cls: "unit-input"
        });
        this.editTitleLY.on(BI.SignEditor.EVENT_CONFIRM, function(){
            self.fireEvent(BI.BubbleChartSetting.EVENT_CHANGE);
        });

        this.isShowTitleX = BI.createWidget({
            type: "bi.multi_select_item",
            value: BI.i18nText("BI-Show_Title"),
            width: 90
        });

        this.isShowTitleX.on(BI.Controller.EVENT_CHANGE, function(){
            this.isSelected() ? self.editTitleX.setVisible(true) : self.editTitleX.setVisible(false);
            self.fireEvent(BI.BubbleChartSetting.EVENT_CHANGE);
        });

        this.editTitleX = BI.createWidget({
            type: "bi.sign_editor",
            width: this.constant.EDITOR_WIDTH,
            height: this.constant.EDITOR_HEIGHT,
            cls: "unit-input"
        });

        this.editTitleX.on(BI.SignEditor.EVENT_CONFIRM, function(){
            self.fireEvent(BI.BubbleChartSetting.EVENT_CHANGE);
        });

        var lYAxis = BI.createWidget({
            type: "bi.horizontal",
            cls: "single-line-settings",
            lgap: this.constant.SIMPLE_H_GAP,
            items: [{
                type: "bi.label",
                height: "100%",
                textHeight: 60,
                text: BI.i18nText("BI-Left_Value_Axis"),
                cls: "line-title"
            }, {
                type: "bi.left",
                cls: "detail-style",
                items: BI.createItems([{
                    type: "bi.label",
                    text: BI.i18nText("BI-Format"),
                    cls: "attr-names"
                }, {
                    type: "bi.center_adapt",
                    items: [this.lYAxisStyle]
                }, {
                    type: "bi.label",
                    text: BI.i18nText("BI-Num_Level"),
                    lgap: this.constant.SIMPLE_H_GAP,
                    cls: "attr-names"
                }, {
                    type: "bi.center_adapt",
                    items: [this.numberLevellY]
                }, {
                    type: "bi.label",
                    text: BI.i18nText("BI-Unit_Normal"),
                    lgap: this.constant.SIMPLE_H_GAP,
                    cls: "attr-names"
                }, {
                    type: "bi.center_adapt",
                    items: [this.LYUnit]
                }, {
                    type: "bi.center_adapt",
                    items: [this.isShowTitleLY, this.editTitleLY]
                }, {
                    type: "bi.center_adapt",
                    items: [this.reversedLY]
                }], {
                    height: this.constant.SINGLE_LINE_HEIGHT
                }),
                lgap: this.constant.SIMPLE_H_GAP
            }]
        });

        var xAxis = BI.createWidget({
            type: "bi.horizontal",
            cls: "single-line-settings",
            lgap: this.constant.SIMPLE_H_GAP,
            items: [{
                type: "bi.label",
                height: "100%",
                textHeight: 60,
                text: BI.i18nText("BI-Right_Value_Axis"),
                cls: "line-title"
            }, {
                type: "bi.left",
                cls: "detail-style",
                items: BI.createItems([{
                    type: "bi.label",
                    text: BI.i18nText("BI-Format"),
                    cls: "attr-names"
                }, {
                    type: "bi.center_adapt",
                    items: [this.XAxisStyle]
                }, {
                    type: "bi.label",
                    text: BI.i18nText("BI-Num_Level"),
                    lgap: this.constant.SIMPLE_H_GAP,
                    cls: "attr-names"
                }, {
                    type: "bi.center_adapt",
                    items: [this.numberLevelX]
                }, {
                    type: "bi.label",
                    text: BI.i18nText("BI-Unit_Normal"),
                    lgap: this.constant.SIMPLE_H_GAP,
                    cls: "attr-names"
                }, {
                    type: "bi.center_adapt",
                    items: [this.XUnit]
                }, {
                    type: "bi.center_adapt",
                    items: [this.isShowTitleX, this.editTitleX]
                }], {
                    height: this.constant.SINGLE_LINE_HEIGHT
                }),
                lgap: this.constant.SIMPLE_H_GAP
            }]
        });

        //联动传递指标过滤条件
        this.transferFilter = BI.createWidget({
            type: "bi.multi_select_item",
            value: BI.i18nText("BI-Bind_Target_Condition"),
            width: 170
        });
        this.transferFilter.on(BI.Controller.EVENT_CHANGE, function(){
            self.fireEvent(BI.GroupTableSetting.EVENT_CHANGE);
        });

        var otherAttr = BI.createWidget({
            type: "bi.left_right_vertical_adapt",
            cls: "single-line-settings",
            items: {
                left: [{
                    type: "bi.label",
                    text: BI.i18nText("BI-Interactive_Attr"),
                    cls: "line-title"
                }, this.transferFilter]
            },
            height: this.constant.SINGLE_LINE_HEIGHT,
            lhgap: this.constant.SIMPLE_H_GAP
        });

        BI.createWidget({
            type: "bi.vertical",
            element: this.element,
            items: [tableStyle, lYAxis, xAxis, otherAttr],
            hgap: 10
        })
    },

    populate: function(){
        var wId = this.options.wId;
        this.transferFilter.setSelected(BI.Utils.getWSTransferFilterByID(wId));
        this.colorSelect.setValue(BI.Utils.getWSChartColorByID(wId));
        this.lYAxisStyle.setValue(BI.Utils.getWSLeftYAxisStyleByID(wId));
        this.XAxisStyle.setValue(BI.Utils.getWSXAxisStyleByID(wId));
        this.numberLevellY.setValue(BI.Utils.getWSLeftYAxisNumLevelByID(wId));
        this.numberLevelX.setValue(BI.Utils.getWSXAxisNumLevelByID(wId));
        this.LYUnit.setValue(BI.Utils.getWSLeftYAxisUnitByID(wId));
        this.XUnit.setValue(BI.Utils.getWSXAxisUnitByID(wId));
        this.isShowTitleLY.setSelected(BI.Utils.getWSShowLeftYAxisTitleByID(wId));
        this.isShowTitleX.setSelected(BI.Utils.getWSShowXAxisTitleByID(wId));
        this.editTitleLY.setValue(BI.Utils.getWSLeftYAxisTitleByID(wId));
        this.editTitleX.setValue(BI.Utils.getWSXAxisTitleByID(wId));

        this.isShowTitleLY.isSelected() ? this.editTitleLY.setVisible(true) : this.editTitleLY.setVisible(false);
        this.isShowTitleX.isSelected() ? this.editTitleX.setVisible(true) : this.editTitleX.setVisible(false);
    },

    getValue: function(){
        return {
            transfer_filter: this.transferFilter.isSelected(),
            chart_color: this.colorSelect.getValue()[0],
            left_y_axis_style: this.lYAxisStyle.getValue()[0],
            x_axis_style: this.XAxisStyle.getValue()[0],
            left_y_axis_number_level: this.numberLevellY.getValue()[0],
            x_axis_number_level: this.numberLevelX.getValue()[0],
            left_y_axis_unit: this.LYUnit.getValue(),
            x_axis_unit: this.XUnit.getValue(),
            show_left_y_axis_title: this.isShowTitleLY.isSelected(),
            show_x_axis_title: this.isShowTitleX.isSelected(),
            left_y_axis_title: this.editTitleLY.getValue(),
            x_axis_title: this.editTitleX.getValue()
        }
    },

    setValue: function(v){
        this.transferFilter.setSelected(v.transfer_filter);
        this.colorSelect.setValue(v.chart_color);
        this.lYAxisStyle.setValue(v.left_y_axis_style);
        this.XAxisStyle.setValue(v.x_axis_style);
        this.numberLevellY.setValue(v.left_y_axis_number_level);
        this.numberLevelX.setValue(v.x_axis_number_level);
        this.LYUnit.setValue(v.left_y_axis_unit);
        this.XUnit.setValue(v.x_axis_unit);
        this.isShowTitleLY.setSelected(v.show_left_y_axis_title);
        this.isShowTitleX.setSelected(v.x_axis_title);
        this.editTitleLY.setValue(v.left_y_axis_title);
        this.editTitleX.setValue(v.x_axis_title);
    }
});
BI.BubbleChartSetting.EVENT_CHANGE = "EVENT_CHANGE";
$.shortcut("bi.bubble_chart_setting", BI.BubbleChartSetting);