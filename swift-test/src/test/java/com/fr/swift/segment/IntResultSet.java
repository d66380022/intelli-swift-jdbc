package com.fr.swift.segment;

import com.fr.swift.config.conf.bean.MetaDataColumnBean;
import com.fr.swift.config.conf.bean.SwiftMetaDataBean;
import com.fr.swift.source.ListBasedRow;
import com.fr.swift.source.SwiftMetaData;

import java.sql.Types;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * @author yee
 * @date 2018/1/9
 */
public class IntResultSet extends SingleColumnResultSet {

    int count;

    @Override
    public SwiftMetaData getMetaData() {
        return new SwiftMetaDataBean("INT_TABLE",
                Arrays.asList(new MetaDataColumnBean("int", Types.INTEGER)));
    }


    @Override
    protected void initData() {
        count = (int) (Math.random() * 1000000);
        for (int i = 0; i < count; i++) {
            List data = new ArrayList<Long>();
            data.add((long) i);
            datas.add(new ListBasedRow(data));
        }
        List data = new ArrayList<Long>();
        data.add(null);
        datas.add(new ListBasedRow(data));
    }
}
