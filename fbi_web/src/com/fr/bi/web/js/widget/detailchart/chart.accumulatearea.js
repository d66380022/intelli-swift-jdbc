/**
 * 图表控件
 * @class BI.AccumulateAreaChart
 * @extends BI.Widget
 */
BI.AccumulateAreaChart = BI.inherit(BI.AbstractChart, {

    _defaultConfig: function () {
        return BI.extend(BI.AccumulateAreaChart.superclass._defaultConfig.apply(this, arguments), {
            baseCls: "bi-accumulate-area-chart"
        })
    },

    _init: function () {
        BI.AccumulateAreaChart.superclass._init.apply(this, arguments);
        var self = this, o = this.options;

        this.xAxis = [{
            type: "category",
            title: {
                style: this.constants.FONT_STYLE
            },
            labelStyle: this.constants.FONT_STYLE
        }];
        this.yAxis = [];

        this.combineChart = BI.createWidget({
            type: "bi.combine_chart",
            xAxis: this.xAxis,
            popupItemsGetter: o.popupItemsGetter,
            formatConfig: BI.bind(this._formatConfig, this),
            element: this.element
        });
        this.combineChart.on(BI.CombineChart.EVENT_CHANGE, function (obj) {
            self.fireEvent(BI.AccumulateAreaChart.EVENT_CHANGE, obj);
        });
        this.combineChart.on(BI.CombineChart.EVENT_ITEM_CLICK, function (obj) {
            self.fireEvent(BI.AbstractChart.EVENT_ITEM_CLICK, obj)
        });
    },

    _formatConfig: function (config, items) {
        var self = this;

        config.colors = this.config.chart_color;
        config.plotOptions.style = formatChartStyle(this.config.chartStyle);
        formatChartLineStyle(this.config.chart_line_type);
        formatCordon(this.config.cordon);
        self.formatChartLegend(config, this.config.chart_legend);
        config.plotOptions.dataLabels.enabled = this.config.show_data_label;
        config.dataSheet.enabled = this.config.show_data_table;
        config.xAxis[0].showLabel = !config.dataSheet.enabled;
        config.plotOptions.connectNulls = this.config.null_continue;
        self.formatZoom(config, this.config.show_zoom);
        config.plotOptions.connectNulls = this.config.null_continue;
        config.legend.style = BI.extend(this.config.chart_legend_setting, {
            fontSize: this.config.chart_legend_setting.fontSize + "px"
        });

        config.yAxis = this.yAxis;
        BI.each(config.yAxis, function (idx, axis) {
            switch (axis.axisIndex) {
                case self.constants.LEFT_AXIS:
                    BI.extend(axis, self.leftAxisSetting(self.config));
                    self.formatNumberLevelInYaxis(config, items, self.config.left_y_axis_number_level, idx, axis.formatter, self.config.num_separators);
                    break;
                case self.constants.RIGHT_AXIS:
                    BI.extend(axis, self.rightAxisSetting(self.config));
                    self.formatNumberLevelInYaxis(config, items, self.config.right_y_axis_number_level, idx, axis.formatter, self.config.right_num_separators);
                    break;
            }
        });

        BI.extend(config.xAxis[0], self.catSetting(this.config));

        config.chartType = "area";

        //为了给数据标签加个%,还要遍历所有的系列
        self.formatDataLabel(config.plotOptions.dataLabels.enabled, items, config, this.config.chart_font);

        //全局样式的图表文字
        self.setFontStyle(this.config.chart_font, config);

        return [items, config];

        function formatChartStyle(v) {
            switch (v) {
                case BICst.CHART_STYLE.STYLE_GRADUAL:
                    return "gradual";
                case BICst.CHART_STYLE.STYLE_NORMAL:
                default:
                    return "normal";
            }
        }

        function formatChartLineStyle(v) {
            switch (v) {
                case BICst.CHART_SHAPE.RIGHT_ANGLE:
                    config.plotOptions.curve = false;
                    config.plotOptions.step = true;
                    break;
                case BICst.CHART_SHAPE.CURVE:
                    config.plotOptions.curve = true;
                    config.plotOptions.step = false;
                    break;
                case BICst.CHART_SHAPE.NORMAL:
                default:
                    config.plotOptions.curve = false;
                    config.plotOptions.step = false;
                    break;
            }
        }

        function formatCordon(cordon) {
            BI.each(cordon, function (idx, cor) {
                if (idx === 0 && self.xAxis.length > 0) {
                    var magnify = self.calcMagnify(self.config.x_axis_number_level);
                    self.xAxis[0].plotLines = BI.map(cor, function (i, t) {
                        return BI.extend(t, {
                            value: t.value.div(magnify),
                            width: 1,
                            label: {
                                "style": self.config.chart_font,
                                "text": t.text,
                                "align": "top"
                            }
                        });
                    });
                }
                if (idx > 0 && self.yAxis.length >= idx) {
                    var magnify = 1;
                    switch (idx - 1) {
                        case self.constants.LEFT_AXIS:
                            magnify = self.calcMagnify(self.config.left_y_axis_number_level);
                            break;
                        case self.constants.RIGHT_AXIS:
                            magnify = self.calcMagnify(self.config.right_y_axis_number_level);
                            break;
                        case self.constants.RIGHT_AXIS_SECOND:
                            magnify = self.calcMagnify(self.config.right_y_axis_second_number_level);
                            break;
                    }
                    self.yAxis[idx - 1].plotLines = BI.map(cor, function (i, t) {
                        return BI.extend(t, {
                            value: t.value.div(magnify),
                            width: 1,
                            label: {
                                "style": self.config.chart_font,
                                "text": t.text,
                                "align": "left"
                            }
                        });
                    });
                }
            })
        }
    },

    _formatItems: function (items) {
        return BI.map(items, function (idx, item) {
            var i = BI.UUID();
            return BI.map(item, function (id, it) {
                return BI.extend({}, it, {stack: i});
            });
        });
    },

    populate: function (items, options) {
        options || (options = {});
        var self = this, c = this.constants;
        this.config = self.getChartConfig(options);
        this.options.items = items;
        this.yAxis = [];
        var types = [];
        BI.each(items, function (idx, axisItems) {
            var type = [];
            BI.each(axisItems, function (id, item) {
                type.push(BICst.WIDGET.AREA);
            });
            types.push(type);
        });
        BI.each(types, function (idx, type) {
            if (BI.isEmptyArray(type)) {
                return;
            }
            var newYAxis = {
                type: "value",
                title: {
                    style: self.constants.FONT_STYLE
                },
                labelStyle: self.constants.FONT_STYLE,
                position: idx > 0 ? "right" : "left",
                lineWidth: 1,
                axisIndex: idx,
                gridLineWidth: 0
            };
            self.yAxis.push(newYAxis);
        });
        this.combineChart.populate(this._formatItems(items), types);
    },

    resize: function () {
        this.combineChart.resize();
    },

    magnify: function () {
        this.combineChart.magnify();
    }
});
BI.AccumulateAreaChart.EVENT_CHANGE = "EVENT_CHANGE";
$.shortcut('bi.accumulate_area_chart', BI.AccumulateAreaChart);
