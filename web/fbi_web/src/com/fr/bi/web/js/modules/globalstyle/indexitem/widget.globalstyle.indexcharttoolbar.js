/**
 * Created by zcf on 2016/8/29.
 */
BI.GlobalStyleIndexChartToolBar = BI.inherit(BI.Widget, {
    _defaultConfig: function () {
        return BI.extend(BI.GlobalStyleIndexChartToolBar.superclass._defaultConfig.apply(this, arguments), {
            baseCls: "bi-global-style-title-toolbar"
        })
    },

    _init: function () {
        BI.GlobalStyleIndexChartToolBar.superclass._init.apply(this, arguments);
        var self = this;
        this.bold = BI.createWidget({
            type: "bi.icon_button",
            title: BI.i18nText("BI-Bold"),
            height: 20,
            width: 20,
            cls: "text-toolbar-button bi-list-item-active text-bold-font"
        });
        this.bold.on(BI.IconButton.EVENT_CHANGE, function () {
            self.fireEvent(BI.GlobalStyleIndexChartToolBar.EVENT_CHANGE)
        });
        this.italic = BI.createWidget({
            type: "bi.icon_button",
            title: BI.i18nText("BI-Italic"),
            height: 20,
            width: 20,
            cls: "text-toolbar-button bi-list-item-active text-italic-font"
        });
        this.italic.on(BI.IconButton.EVENT_CHANGE, function () {
            self.fireEvent(BI.GlobalStyleIndexChartToolBar.EVENT_CHANGE)
        });
        this.colorchooser = BI.createWidget({
            type: "bi.color_chooser",
            el: {
                type: "bi.text_toolbar_color_chooser_trigger",
                title: BI.i18nText("BI-Font_Colour"),
                cls: "text-toolbar-button"
            }
        });
        this.colorchooser.on(BI.ColorChooser.EVENT_CHANGE, function () {
            self.fireEvent(BI.GlobalStyleIndexChartToolBar.EVENT_CHANGE)
        });
        BI.createWidget({
            type: "bi.left",
            element: this.element,
            items: [this.bold, this.italic, this.colorchooser],
            hgap: 3,
            vgap: 3
        })
    },

    getValue: function () {
        return {
            "fontWeight": this.bold.isSelected() ? "bold" : "normal",
            "fontStyle": this.italic.isSelected() ? "italic" : "normal",
            "color": this.colorchooser.getValue()
        }
    },

    setValue: function (v) {
        v || (v = {});
        this.bold.setSelected(v["fontWeight"] === "bold");
        this.italic.setSelected(v["fontStyle"] === "italic");
        this.colorchooser.setValue(v["color"] || "");
    }
});
BI.GlobalStyleIndexChartToolBar.EVENT_CHANGE = "EVENT_CHANGE";
$.shortcut("bi.global_style_index_chart_tool_bar", BI.GlobalStyleIndexChartToolBar);