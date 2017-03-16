//放置用户不可配置的常量

//etl pane card names (empty tip, only one tip, pane)
BICst.CONF_ETL_DATA_SET_EMPTY_TIP = "data_set_empty_tip";
BICst.CONF_ETL_DATA_SET_ONLY_ONE_TIP = "data_set_only_one_tip";
BICst.CONF_ETL_DATA_SET_PANE = "data_set_pane";
BICst.CONF_ETL_SET_EMPTY_TIP = "etl_empty_tip";
BICst.CONF_ETL_SET_PANE = "etl_set_pane";

//dashboard toolbar left button group
BICst.DASHBOARD_TOOLBAR_SAVEAS = 1;
BICst.DASHBOARD_TOOLBAR_UNDO = 2;
BICst.DASHBOARD_TOOLBAR_REDO = 3;

//字段选择，业务包/复用
BICst.DETAIL_PACKAGES_FIELD = 1;
BICst.DETAIL_DIMENSION_REUSE = 2;

//类型&数据/样式tab
BICst.DETAIL_TAB_TYPE_DATA = 1;
BICst.DETAIL_TAB_STYLE = 2;


//etl manager
BICst.ETL_MANAGE_TABLE_NONE = -1;
BICst.ETL_MANAGE_TABLE_PREVIEW = 0;
BICst.ETL_MANAGE_TABLE_ADD_FIELD = 1;
BICst.ETL_MANAGE_TABLE_JOIN = 2;
BICst.ETL_MANAGE_TABLE_UNION = 3;
BICst.ETL_MANAGE_TABLE_CONVERT = 4;
BICst.ETL_MANAGE_TABLE_PARTIAL = 5;
BICst.ETL_MANAGE_TABLE_FILTER = 6;
BICst.ETL_MANAGE_TABLE_GROUP = 7;
BICst.ETL_MANAGE_TABLE_CIRCLE = 8;
BICst.ETL_MANAGE_TABLE_NEW_GROUP = 9;
BICst.ETL_MANAGE_TABLE_DELETE = 10;
BICst.ETL_MANAGE_EXCEL_CHANGE = 11;
BICst.ETL_MANAGE_SQL_CHANGE = 12;

//维度下拉选项
BICst.DIMENSION_STRING_COMBO = {
    ASCEND: 100,
    DESCEND: 101,
    SORT_BY_CUSTOM: 102,
    GROUP_BY_VALUE: 103,
    GROUP_BY_CUSTOM: 104,
    FILTER: 105,
    DT_RELATION: 106,
    COPY: 107,
    DELETE: 108,
    INFO: 109,
    ADDRESS: 110,
    LNG_LAT: 111,
    LNG: 112,
    LAT: 113,
    RENAME: 114,
    SHOW_FIELD: 115,
    SERIES_ACCUMULATION_ATTRIBUTE: 116,
    NO_SERIES: 117,
    SERIES_ACCUMULATION: 118
};

BICst.DIMENSION_NUMBER_COMBO = {
    ASCEND: 200,
    DESCEND: 201,
    NOT_SORT: 202,
    SORT_BY_CUSTOM: 203,
    GROUP_BY_VALUE: 204,
    GROUP_SETTING: 205,
    FILTER: 206,
    DT_RELATION: 207,
    COPY: 208,
    DELETE: 209,
    INFO: 210,
    CORDON: 211,
    ADDRESS: 212,
    LNG_LAT: 213,
    LNG: 214,
    LAT: 215,
    RENAME: 216,
    SHOW_FIELD: 217,
    SERIES_ACCUMULATION_ATTRIBUTE: 218,
    NO_SERIES: 219,
    SERIES_ACCUMULATION: 220
};

BICst.DIMENSION_DATE_COMBO = {
    DATE: 300,
    YEAR: 301,
    QUARTER: 302,
    MONTH: 303,
    WEEK: 304,
    ASCEND: 305,
    DESCEND: 306,
    FILTER: 307,
    DT_RELATION: 308,
    COPY: 309,
    DELETE: 310,
    INFO: 31,
    ADDRESS: 32,
    LNG_LAT: 33,
    LNG: 34,
    LAT: 35,
    RENAME: 36,
    SHOW_FIELD: 37,
    SERIES_ACCUMULATION_ATTRIBUTE: 38,
    NO_SERIES: 39,
    SERIES_ACCUMULATION: 40
};

//指标下拉选项
BICst.TARGET_COMBO = {
    SUMMERY_TYPE: 400,
    CHART_TYPE: 401,
    STYLE_SETTING: 402,
    FILTER: 403,
    DISPLAY: 404,
    HIDDEN: 405,
    COPY: 406,
    DELETE: 407,
    INFO: 408,
    DEPEND_TYPE: 409,
    CORDON: 410,
    DATA_LABEL: 411,
    DATA_LABEL_OTHER: 412,
    DATA_IMAGE: 413,
    RENAME: 414,
    SHOW_FIELD: 415,
    STYLE_AND_NUMBER_LEVEL: 416
};

//明细表维度下拉选项
BICst.DETAIL_STRING_COMBO = {
    FILTER: 500,
    HYPERLINK: 501,
    DELETE: 502,
    INFO: 503,
    RENAME: 504,
    SHOW_FIELD: 505
};

BICst.DETAIL_NUMBER_COMBO = {
    FORM_SETTING: 600,
    FILTER: 601,
    HYPERLINK: 602,
    DELETE: 603,
    INFO: 604,
    RENAME: 605,
    SHOW_FIELD: 606
};

BICst.DETAIL_DATE_COMBO = {
    YMD: 700,
    YMD_HMS: 701,
    YEAR: 702,
    SEASON: 703,
    MONTH: 704,
    WEEK: 705,
    FILTER: 706,
    HYPERLINK: 707,
    DELETE: 708,
    INFO: 709,
    RENAME: 710,
    SHOW_FIELD: 711
};

BICst.DETAIL_FORMULA_COMBO = {
    FORM_SETTING: 800,
    UPDATE_FORMULA: 801,
    HYPERLINK: 802,
    DISPLAY: 803,
    HIDDEN: 804,
    RENAME: 805,
    DELETE: 806,
    INFO: 807,
    SHOW_FIELD: 808
};

BICst.CALCULATE_TARGET_COMBO = {
    FORM_SETTING: 900,
    UPDATE_TARGET: 901,
    DISPLAY: 902,
    HIDDEN: 903,
    RENAME: 904,
    COPY: 905,
    DELETE: 906,
    INFO: 907
};


BICst.CONTROL_COMBO = {
    DELETE: 505,
    INFO: 506,
    RENAME: 507,
    SHOW_FIELD: 508
};

//分组统计下拉选项
BICst.STATISTICS_GROUP_DATE_COMBO = {
    DATE: 900,
    YEAR: 901,
    QUARTER: 902,
    MONTH: 903,
    WEEK: 904,
    DELETE: 905,
    No_Repeat_Count: 899,
    DISPLAY: 898,
    HIDDEN: 897,
    RENAME: 896,
    RECORD_COUNT: 895
};

BICst.STATISTICS_GROUP_NUMBER_COMBO = {
    SUM: 906,
    AVG: 907,
    MAX: 908,
    MIN: 909,
    No_Repeat_Count: 910,
    DELETE: 911,
    GROUP_SETTING: 912,
    GROUP_BY_VALUE: 913,
    DISPLAY: 904,
    HIDDEN: 905,
    RENAME: 903,
    RECORD_COUNT: 902
};

BICst.STATISTICS_GROUP_STRING_COMBO = {
    GROUP_BY_VALUE: 913,
    GROUP_BY_CUSTOM: 914,
    No_Repeat_Count: 915,
    DELETE: 916,
    APPEND: 917,
    DISPLAY: 912,
    HIDDEN: 911,
    RENAME: 910,
    RECORD_COUNT: 909
};

BICst.CHART_VIEW_STYLE_BAR = 1;
BICst.CHART_VIEW_STYLE_ACCUMULATED_BAR = 2;
BICst.CHART_VIEW_STYLE_LINE = 3;
BICst.CHART_VIEW_STYLE_SQUARE = 4;

BICst.FILTER_PANE_CLICK_REMOVE = -1;
BICst.FILTER_PANE_CLICK_EXPANDER = 1;
BICst.FILTER_PANE_CLICK_ITEM = 2;