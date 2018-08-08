package com.fr.swift.service;

import com.fr.swift.context.SwiftContext;
import com.fr.swift.db.Where;
import com.fr.swift.db.impl.SwiftDatabase;
import com.fr.swift.exception.SwiftServiceException;
import com.fr.swift.log.SwiftLoggers;
import com.fr.swift.netty.rpc.server.RpcServer;
import com.fr.swift.query.info.bean.query.QueryInfoBean;
import com.fr.swift.query.query.QueryBeanFactory;
import com.fr.swift.query.session.factory.SessionFactory;
import com.fr.swift.segment.Segment;
import com.fr.swift.segment.SegmentKey;
import com.fr.swift.segment.SwiftSegmentManager;
import com.fr.swift.segment.operator.delete.WhereDeleter;
import com.fr.swift.segment.recover.SegmentRecovery;
import com.fr.swift.source.SourceKey;
import com.fr.swift.source.SwiftResultSet;
import com.fr.swift.task.service.ServiceTaskExecutor;
import com.fr.swift.task.service.ServiceTaskType;
import com.fr.swift.task.service.SwiftServiceCallable;
import com.fr.swift.util.concurrent.CommonExecutor;
import com.fr.third.springframework.beans.factory.annotation.Autowired;
import com.fr.third.springframework.beans.factory.annotation.Qualifier;
import com.fr.third.springframework.stereotype.Service;

import java.io.Serializable;
import java.sql.SQLException;
import java.util.List;
import java.util.concurrent.Callable;

/**
 * @author pony
 * @date 2017/10/10
 */
@Service("realtime")
public class SwiftRealtimeService extends AbstractSwiftService implements RealtimeService, Serializable {
    @Autowired
    private transient RpcServer server;

    @Autowired
    @Qualifier("localSegmentProvider")
    private transient SwiftSegmentManager segmentManager;

    @Autowired
    private transient ServiceTaskExecutor taskExecutor;

    @Autowired(required = false)
    private transient QueryBeanFactory queryBeanFactory;

    private SwiftRealtimeService() {
    }

    @Override
    public void insert(final SourceKey tableKey, final SwiftResultSet resultSet) throws Exception {
        taskExecutor.submit(new SwiftServiceCallable(tableKey, ServiceTaskType.INSERT) {
            @Override
            public void doJob() throws Exception {
                SwiftDatabase.getInstance().getTable(tableKey).insert(resultSet);
            }
        });
    }

//    @Override
//    @RpcMethod(methodName = "merge")
//    public void merge(List<SegmentKey> tableKeys) {
//        SwiftLoggers.getLogger().info("merge");
//        rpcSegmentLocation(PushSegLocationRpcEvent.fromSegmentKey(getServiceType(), tableKeys));
//    }

    private static void recover0() {
        CommonExecutor.get().submit(new Callable<Boolean>() {
            @Override
            public Boolean call() {
                try {
                    // 恢复所有realtime块
                    SegmentRecovery segmentRecovery = (SegmentRecovery) SwiftContext.get().getBean("segmentRecovery");
                    segmentRecovery.recoverAll();
                    return true;
                } catch (Exception e) {
                    SwiftLoggers.getLogger().error(e);
                    return false;
                }
            }
        });
    }

    @Override
    public void recover(List<SegmentKey> tableKeys) {
        SwiftLoggers.getLogger().info("recover");
    }

    @Override
    public boolean delete(final SourceKey sourceKey, final Where where) throws Exception {
        taskExecutor.submit(new SwiftServiceCallable(sourceKey, ServiceTaskType.DELETE) {
            @Override
            public void doJob() throws Exception {
                List<Segment> segments = segmentManager.getSegment(sourceKey);
                for (Segment segment : segments) {
                    WhereDeleter whereDeleter = (WhereDeleter) SwiftContext.get().getBean("decrementer", sourceKey, segment);
                    whereDeleter.delete(where);
                }
            }
        });
        return true;
    }

    @Override
    public boolean start() throws SwiftServiceException {
        super.start();

        recover0();

        return true;
    }

    @Override
    public SwiftResultSet query(final String queryDescription) throws SQLException {
        try {
            final QueryInfoBean bean = queryBeanFactory.create(queryDescription);
            SessionFactory sessionFactory = SwiftContext.get().getBean(SessionFactory.class);
            return sessionFactory.openSession(bean.getQueryId()).executeQuery(bean);
        } catch (Exception e) {
            throw new SQLException(e);
        }
    }

    @Override
    public ServiceType getServiceType() {
        return ServiceType.REAL_TIME;
    }

    private static final long serialVersionUID = 4719723736240190155L;

    public SwiftRealtimeService(String id) {
        super(id);
    }
}