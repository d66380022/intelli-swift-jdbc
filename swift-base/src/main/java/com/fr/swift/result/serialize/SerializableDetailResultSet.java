package com.fr.swift.result.serialize;

import com.fr.swift.query.query.QueryRunnerProvider;
import com.fr.swift.result.DetailResultSet;
import com.fr.swift.result.SwiftRowIteratorImpl;
import com.fr.swift.source.Row;
import com.fr.swift.source.SwiftMetaData;
import com.fr.swift.util.Crasher;

import java.sql.SQLException;
import java.util.Iterator;
import java.util.List;

/**
 * @author yee
 * @date 2018/6/11
 */
public class SerializableDetailResultSet implements DetailResultSet, SerializableResultSet {
    private static final long serialVersionUID = -2306723089258907631L;

    private String jsonString;
    private SwiftMetaData metaData;
    private List<Row> rows;
    private int rowCount;
    private boolean hasNextPage = true;
    private boolean originHasNextPage;
    private transient Iterator<Row> rowIterator;

    public SerializableDetailResultSet(String jsonString, SwiftMetaData metaData, List<Row> rows,
                                       boolean originHasNextPage, int rowCount) {
        this.jsonString = jsonString;
        this.metaData = metaData;
        this.rows = rows;
        this.originHasNextPage = originHasNextPage;
        this.rowCount = rowCount;
    }

    @Override
    public int getFetchSize() {
        return 0;
    }

    @Override
    public List<Row> getPage() {
        hasNextPage = false;
        List<Row> ret = rows;
        if (originHasNextPage) {
            try {
                SerializableDetailResultSet resultSet = (SerializableDetailResultSet) QueryRunnerProvider.getInstance().executeRemoteQuery(jsonString, null);
                hasNextPage = true;
                this.rows = resultSet.rows;
                this.originHasNextPage = resultSet.originHasNextPage;
            } catch (SQLException e) {
                Crasher.crash(e);
            }
        }
        return ret;
    }

    @Override
    public boolean hasNextPage() {
        return hasNextPage || originHasNextPage;
    }

    @Override
    public int getRowCount() {
        return rowCount;
    }

    @Override
    public void setMetaData(SwiftMetaData metaData) {
    }

    @Override
    public SwiftMetaData getMetaData() throws SQLException {
        return metaData;
    }

    @Override
    public boolean hasNext() throws SQLException {
        if (rowIterator == null) {
            rowIterator = new SwiftRowIteratorImpl(this);
        }
        return rowIterator.hasNext();
    }

    @Override
    public Row getNextRow() throws SQLException {
        return rowIterator.next();
    }

    @Override
    public void close() throws SQLException {

    }
}
