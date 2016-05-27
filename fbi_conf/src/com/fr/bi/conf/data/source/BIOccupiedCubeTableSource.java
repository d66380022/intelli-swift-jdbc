package com.fr.bi.conf.data.source;

import com.finebi.cube.api.ICubeDataLoader;
import com.fr.base.TableData;
import com.fr.bi.base.BIBasicCore;
import com.fr.bi.base.BICore;
import com.fr.bi.common.inter.Traversal;
import com.fr.bi.stable.data.db.BICubeFieldSource;
import com.fr.bi.stable.data.db.BIDataValue;
import com.fr.bi.stable.data.db.CubeFieldSource;
import com.fr.bi.stable.data.db.IPersistentTable;
import com.fr.bi.stable.data.source.CubeTableSource;
import com.fr.bi.stable.data.source.SourceFile;
import com.fr.json.JSONObject;
import com.fr.stable.xml.XMLPrintWriter;
import com.fr.stable.xml.XMLableReader;

import java.util.*;

/**
 * 作用是占据一个TableSource位置。
 * 当ETL自身同时有两个或者以上的操作的时候，会有多个TableSource
 * 每个TableSource都与ETL自身是不同的ID，此时ETL自身就会在
 * 生成cube中丢失。
 * 例如ETL_A,是A表做了新增公式列add1和新增公式列add2
 * 此时ETL_A被分成了add1和add2两个操作分别生成cube，ETL_A自身不需生成，过程没有任何问题
 * 但是由于ETL_A，add1和add2三个有着不同的ID，所以根据ETL_A的ID就不会找到任何CUBE信息了
 * 这里做的就是给ETL_A生成一个空壳对象，仅仅标示ETL_A的ID
 * This class created on 2016/5/16.
 *
 * @author Connery
 * @since 4.0
 */
public class BIOccupiedCubeTableSource implements CubeTableSource {
    private String ID;

    public BIOccupiedCubeTableSource(String id) {
        this.ID = id;
    }

    @Override
    public IPersistentTable getPersistentTable() {
        return null;
    }

    @Override
    public String getSourceID() {
        return ID;
    }

    @Override
    public String getTableName() {
        return null;
    }

    @Override
    public BICubeFieldSource[] getFieldsArray(Set<CubeTableSource> sources) {
        return new BICubeFieldSource[0];
    }


    @Override
    public Map<Integer, Set<CubeTableSource>> createGenerateTablesMap() {
        return null;
    }

    @Override
    public List<Set<CubeTableSource>> createGenerateTablesList() {
        return new ArrayList<Set<CubeTableSource>>();
    }

    @Override
    public int getLevel() {
        return 0;
    }

    @Override
    public int getType() {
        return 0;
    }

    @Override
    public long read(Traversal<BIDataValue> travel, CubeFieldSource[] field, ICubeDataLoader loader) {
        return -1;
    }

    @Override
    public long read4Part(Traversal<BIDataValue> travel, CubeFieldSource[] field, ICubeDataLoader loader, int start, int end) {
        return -1;
    }

    @Override
    public Set getFieldDistinctNewestValues(String fieldName, ICubeDataLoader loader, long userId) {
        return new HashSet();
    }

    @Override
    public Set getFieldDistinctValuesFromCube(String fieldName, ICubeDataLoader loader, long userId) {
        return new HashSet();
    }

    @Override
    public JSONObject createPreviewJSON(ArrayList<String> fields, ICubeDataLoader loader, long userId) throws Exception {
        return null;
    }

    @Override
    public TableData createTableData(List<String> fields, ICubeDataLoader loader, long userId) throws Exception {
        return null;
    }

    @Override
    public JSONObject createPreviewJSONFromCube(ArrayList<String> fields, ICubeDataLoader loader) throws Exception {
        return null;
    }


    @Override
    public boolean needGenerateIndex() {
        return false;
    }

    @Override
    public Map<BICore, CubeTableSource> createSourceMap() {
        return null;
    }

    @Override
    public SourceFile getSourceFile() {
        return null;
    }

    @Override
    public Set<String> getUsedFields(CubeTableSource source) {
        return new HashSet<String>();
    }

    @Override
    public void refresh() {

    }

    @Override
    public boolean isIndependent() {
        return false;
    }

    @Override
    public BICore fetchObjectCore() {
        return BIBasicCore.generateValueCore(ID);
    }

    @Override
    public JSONObject createJSON() throws Exception {
        return null;
    }

    @Override
    public void readXML(XMLableReader xmLableReader) {

    }

    @Override
    public void writeXML(XMLPrintWriter xmlPrintWriter) {

    }

    @Override
    public Object clone() throws CloneNotSupportedException {
        return super.clone();
    }

    @Override
    public Set<CubeFieldSource> getParentFields(Set<CubeTableSource> sources) {
        return null;
    }

    @Override
    public Set<CubeFieldSource> getFacetFields(Set<CubeTableSource> sources) {
        return null;
    }

    @Override
    public Set<CubeFieldSource> getSelfFields(Set<CubeTableSource> sources) {
        return null;
    }

}
