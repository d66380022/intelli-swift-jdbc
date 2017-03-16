package com.fr.bi.conf.log;

import com.fr.bi.stable.constant.BILogConstant;
import com.fr.bi.stable.data.db.IPersistentTable;
import com.fr.json.JSONObject;

public class BITableErrorLog extends BITableLog implements ErrorLog {


    public static final String XML_TAG = "error_log";
    /**
     *
     */
    private static final long serialVersionUID = 8303606030073599201L;
    private String error_text;


    public BITableErrorLog(IPersistentTable table, String error_text, long userId) {
        super(table, userId);
        this.error_text = error_text;
    }

    public String getError_text() {
        return error_text;
    }

    @Override
    public JSONObject createJSON() throws Exception {
        JSONObject jo = super.createJSON();
        jo.put("error_text", error_text);
        return jo;
    }

    @Override
    public boolean isRunning() {
        return false;
    }

    @Override
    public long getTotalTime() {
        return 0;
    }
    @Override
    public int getLogType() {
        return BILogConstant.TABLE_LOG_TYPE.ERROR;
    }

}