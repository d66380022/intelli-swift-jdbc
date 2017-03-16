/**
 *
 */
package com.fr.bi.etl.analysis.report.widget.field.filtervalue.number;

import com.finebi.cube.api.ICubeDataLoader;
import com.finebi.cube.api.ICubeTableService;
import com.finebi.cube.conf.table.BusinessTable;
import com.fr.bi.base.annotation.BICoreField;
import com.fr.bi.base.key.BIKey;
import com.fr.bi.common.persistent.xml.BIIgnoreField;
import com.fr.bi.conf.report.widget.field.filtervalue.AbstractFilterValue;
import com.fr.bi.conf.report.widget.field.filtervalue.number.NumberFilterValue;
import com.fr.bi.etl.analysis.report.widget.field.filtervalue.number.index.NumberIndexCreater;
import com.fr.bi.etl.analysis.report.widget.field.filtervalue.number.line.AvgLine;
import com.fr.bi.etl.analysis.report.widget.field.filtervalue.number.line.CalLineGetter;
import com.fr.bi.etl.analysis.report.widget.field.filtervalue.number.line.NumberLine;
import com.fr.bi.stable.engine.cal.ResultDealer;
import com.fr.bi.stable.engine.index.key.IndexKey;
import com.fr.bi.stable.gvi.GroupValueIndex;
import com.fr.bi.stable.report.key.TargetGettingKey;
import com.fr.bi.stable.report.result.BINode;
import com.fr.bi.stable.report.result.DimensionCalculator;
import com.fr.bi.stable.utils.BIServerUtils;
import com.fr.json.JSONArray;
import com.fr.json.JSONException;
import com.fr.json.JSONObject;
import com.fr.stable.xml.XMLPrintWriter;
import com.fr.stable.xml.XMLableReader;


/**
 * @author Daniel
 */
public abstract class NumberCalculateLineFilter extends AbstractFilterValue<Number> implements NumberFilterValue{

	/**
	 *
	 */
	private static final long serialVersionUID = -5289564327012309298L;
    @BICoreField
    private static final int AVGTYPE = 2;
    @BICoreField
    private static final int CLOSE = 1;
    @BICoreField
    protected Operator t;
    /**
     * getter对象属性从@BIIgnoreField改成@BICoreField
     * 详见bug BI-2350
     */
	@BICoreField
	protected CalLineGetter getter = AvgLine.INSTANCE;
	@BICoreField
	private BIKey[] dimension;
	@BICoreField
	private BIKey key;


    NumberCalculateLineFilter(Operator t) {
        this.t = t;
    }

    @Override
    public boolean isAllCalculatorFilter() {
        return true;
    }

    @Override
    public boolean canCreateFilterIndex() {
        return true;
    }

    @Override
    public GroupValueIndex createFilterIndex(DimensionCalculator dimension, BusinessTable target, ICubeDataLoader loader,
                                             long userId) {
        ICubeTableService ti = loader.getTableIndex(target.getTableSource());
        GroupValueIndex gvi = ti.getAllShowIndex();
        NumberIndexCreater creater = new NumberIndexCreater(ti, t, key, getter);
        FilterIndexCalculator dealer = new FilterIndexCalculator(creater);
        ResultDealer dimensionDealer = BIServerUtils.createDimensonDealer(this.dimension, dealer);
        dimensionDealer.dealWith(ti, gvi);
        return dealer.getResult();
    }


    @Override
    public void parseJSON(JSONObject jo, long userId) throws Exception {
        if (jo.has("field_name")) {
            this.key = new IndexKey(jo.getString("field_name"));
        }
        if (jo.has("filter_value")) {
            JSONObject value = jo.getJSONObject("filter_value");
            if (value.has("close")) {
                parsClose(value.getInt("close") == CLOSE);
            }
            if (value.optInt("type", 0) == AVGTYPE) {
                parsAVGJSON(value);
            } else {
                parsAllJSON(value);
            }
        }
    }

    protected abstract void parsClose(boolean isClose);

    protected void parsAllJSON(JSONObject jo) throws JSONException {
        getter = new NumberLine(jo.getDouble("value"));
    }

    protected void parsAVGJSON(JSONObject jo) throws JSONException {
        getter = AvgLine.INSTANCE;
        if (jo.has("group")) {
            JSONArray ja = jo.getJSONArray("group");
            this.dimension = new BIKey[ja.length()];
            for (int i = 0; i < ja.length(); i++) {
                this.dimension[i] = new IndexKey(ja.getString(i));
            }
        }
    }

    @Override
    public JSONObject createJSON() throws Exception {
        return null;
    }

    @Override
    public void readXML(XMLableReader reader) {

    }

    @Override
    public void writeXML(XMLPrintWriter writer) {
    }

    @Override
    public boolean showNode(BINode node, TargetGettingKey targetKey, ICubeDataLoader loader) {
        // TODO Auto-generated method stub
        return false;
    }

    @Override
    public boolean isMatchValue(Number value) {
        return false;
    }


    @Override
    public Object clone() throws CloneNotSupportedException {
        return super.clone();
    }

}