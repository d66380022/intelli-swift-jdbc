package com.fr.swift.config.dao.impl;

import com.fr.swift.config.SwiftConfigConstants;
import com.fr.swift.config.bean.SwiftMetaDataBean;
import com.fr.swift.config.dao.BasicDao;
import com.fr.swift.config.dao.SwiftMetaDataDao;
import com.fr.swift.config.oper.ConfigSession;
import com.fr.swift.config.oper.FindList;
import com.fr.swift.config.oper.impl.RestrictionFactoryImpl;

import java.sql.SQLException;


/**
 * @author yee
 * @date 2018/5/24
 */
public class SwiftMetaDataDaoImpl extends BasicDao<SwiftMetaDataBean> implements SwiftMetaDataDao {

    public SwiftMetaDataDaoImpl() {
        super(SwiftMetaDataBean.TYPE, RestrictionFactoryImpl.INSTANCE);
    }

    @Override
    public SwiftMetaDataBean findBySourceKey(ConfigSession session, String sourceKey) throws SQLException {
        return select(session, sourceKey);
    }

    @Override
    public SwiftMetaDataBean findByTableName(ConfigSession session, String tableName) {
        FindList<SwiftMetaDataBean> list = find(session, factory.eq(SwiftConfigConstants.MetaDataConfig.COLUMN_TABLE_NAME, tableName));
        if (null == list || list.isEmpty()) {
            throw new RuntimeException(String.format("Find meta data error! Table named '%s' not exists!", tableName));
        }
        if (list.size() != 1) {
            throw new RuntimeException(String.format("Find meta data error! Table named '%s' is duplicate!", tableName));
        }
        return list.get(0);
    }

    @Override
    public boolean addOrUpdateSwiftMetaData(ConfigSession session, SwiftMetaDataBean metaDataBean) throws SQLException {
        return saveOrUpdate(session, metaDataBean);
    }

    @Override
    public boolean deleteSwiftMetaDataBean(ConfigSession session, String sourceKey) throws SQLException {
        return deleteById(session, sourceKey);
    }

    @Override
    public FindList<SwiftMetaDataBean> findAll(ConfigSession session) {
        return find(session);
    }
}
