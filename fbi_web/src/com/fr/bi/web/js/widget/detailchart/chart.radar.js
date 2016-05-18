/**
 * 图表控件
 * @class BI.RadarChart
 * @extends BI.Widget
 */
BI.RadarChart = BI.inherit(BI.Widget, {

    _defaultConfig: function () {
        return BI.extend(BI.RadarChart.superclass._defaultConfig.apply(this, arguments), {
            baseCls: "bi-radar-chart"
        })
    },

    _init: function () {
        BI.RadarChart.superclass._init.apply(this, arguments);
        var self = this, o = this.options;
        this.RadarChart = BI.createWidget({
            type: "bi.chart",
            element: this.element
        });
        self.RadarChart.setChartType(BICst.WIDGET.RADAR);
        this.RadarChart.on(BI.Chart.EVENT_CHANGE, function (obj) {
            self.fireEvent(BI.RadarChart.EVENT_CHANGE, obj);
        });
    },

    populate: function (items) {
        this.RadarChart.resize();
        this.RadarChart.populate(BI.RadarChart.formatItems(items));
    },

    resize: function () {
        this.RadarChart.resize();
    }
});
BI.extend(BI.RadarChart, {
    formatItems: function (items) {
        var name = BI.keys(items)[0];
        return {
            "data": items[name],
            "name": name
        }
    }
});
BI.RadarChart.EVENT_CHANGE = "EVENT_CHANGE";
$.shortcut('bi.radar_chart', BI.RadarChart);