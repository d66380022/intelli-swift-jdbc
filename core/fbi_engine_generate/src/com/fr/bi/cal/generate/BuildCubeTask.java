package com.fr.bi.cal.generate;

import com.finebi.cube.ICubeConfiguration;
import com.finebi.cube.common.log.BILoggerFactory;
import com.finebi.cube.conf.BICubeConfiguration;
import com.finebi.cube.conf.BICubeConfigureCenter;
import com.finebi.cube.conf.CubeBuildStuff;
import com.finebi.cube.conf.table.BusinessTable;
import com.finebi.cube.conf.utils.BILogHelper;
import com.finebi.cube.data.ICubeResourceDiscovery;
import com.finebi.cube.data.disk.BICubeDiskPrimitiveDiscovery;
import com.finebi.cube.exception.BIDeliverFailureException;
import com.finebi.cube.gen.arrange.BICubeBuildTopicManager;
import com.finebi.cube.gen.arrange.BICubeOperationManager;
import com.finebi.cube.gen.mes.BICubeBuildTopicTag;
import com.finebi.cube.gen.oper.BuildLogHelper;
import com.finebi.cube.gen.oper.observer.BICubeFinishObserver;
import com.finebi.cube.impl.message.BIMessage;
import com.finebi.cube.impl.message.BIMessageTopic;
import com.finebi.cube.tools.operate.BIOperationID;
import com.finebi.cube.impl.pubsub.BIProcessorThreadManager;
import com.finebi.cube.location.BICubeResourceRetrieval;
import com.finebi.cube.location.ICubeResourceRetrievalService;
import com.finebi.cube.message.IMessage;
import com.finebi.cube.message.IMessageTopic;
import com.finebi.cube.relation.BICubeGenerateRelation;
import com.finebi.cube.relation.BICubeGenerateRelationPath;
import com.finebi.cube.relation.BITableSourceRelation;
import com.finebi.cube.relation.BITableSourceRelationPath;
import com.finebi.cube.router.IRouter;
import com.finebi.cube.structure.BICube;
import com.finebi.cube.utils.CubeUpdateUtils;
import com.fr.bi.base.BIUser;
import com.fr.bi.cal.stable.loader.CubeReadingTableIndexLoader;
import com.fr.bi.cluster.utils.ClusterEnv;
import com.fr.bi.cluster.zookeeper.ZooKeeperManager;
import com.fr.bi.cluster.zookeeper.watcher.BICubeStatusWatcher;
import com.fr.bi.common.factory.BIFactoryHelper;
import com.fr.bi.conf.manager.update.source.UpdateSettingSource;
import com.fr.bi.conf.provider.BIConfigureManagerCenter;
import com.fr.bi.conf.utils.BIModuleUtils;
import com.fr.bi.manager.PerformancePlugManager;
import com.fr.bi.stable.constant.BILogConstant;
import com.fr.bi.stable.constant.DBConstant;
import com.fr.bi.stable.data.db.PersistentTable;
import com.fr.bi.stable.data.source.CubeTableSource;
import com.fr.bi.stable.engine.CubeTask;
import com.fr.bi.stable.engine.CubeTaskType;
import com.fr.bi.stable.utils.program.BINonValueUtils;
import com.fr.bi.stable.utils.program.BIStringUtils;
import com.fr.bi.stable.utils.time.BIDateUtils;
import com.fr.fs.control.UserControl;
import com.fr.general.DateUtils;
import com.fr.json.JSONObject;
import org.slf4j.Logger;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Future;

/**
 * This class created on 2016/4/19.
 *
 * @author Connery
 * @since 4.0
 * <p/>
 * edit by kary
 */
public class BuildCubeTask implements CubeTask {
    private static final long serialVersionUID = 1960384670748165510L;
    private static final Logger logger = BILoggerFactory.getLogger(BuildCubeTask.class);
    private CubeBuildStuff cubeBuildStuff;
    protected BIUser biUser;
    protected ICubeResourceRetrievalService retrievalService;
    protected ICubeConfiguration cubeConfiguration;
    protected BICube cube;
    protected BICube integrityCube;
    protected BICubeFinishObserver<Future<String>> finishObserver;
    private int retryNTimes;



    public BuildCubeTask(BIUser biUser, CubeBuildStuff cubeBuildStuff) {
        this.cubeBuildStuff = cubeBuildStuff;
        this.biUser = biUser;
        cubeConfiguration = cubeBuildStuff.getCubeConfiguration();
        retrievalService = new BICubeResourceRetrieval(cubeConfiguration);
        ICubeConfiguration IntegrityCubeConfiguration = BICubeConfiguration.getConf(Long.toString(biUser.getUserId()));
        this.cube = new BICube(retrievalService, BIFactoryHelper.getObject(ICubeResourceDiscovery.class));
        this.integrityCube = new BICube(new BICubeResourceRetrieval(IntegrityCubeConfiguration), BIFactoryHelper.getObject(ICubeResourceDiscovery.class));
        retryNTimes = 100;
    }

    @Override
    public String getTaskId() {
        return cubeBuildStuff.getCubeTaskId();
    }

    @Override
    public CubeTaskType getTaskType() {
        return cubeBuildStuff.getTaskType();
    }

    @Override
    public void start() {
        BIConfigureManagerCenter.getLogManager().logStart(biUser.getUserId());
        BILoggerFactory.clearLoggerCacheValue(BILogConstant.LOG_CACHE_TAG.CUBE_GENERATE_EXCEPTION_INFO);
        BILoggerFactory.clearLoggerCacheValue(BILogConstant.LOG_CACHE_TAG.CUBE_GENERATE_INFO);
        BILoggerFactory.cacheLoggerInfo(BILogConstant.LOG_CACHE_TAG.CUBE_GENERATE_INFO, BILogConstant.LOG_CACHE_SUB_TAG.CUBE_GENERATE_START, System.currentTimeMillis());
        BILoggerFactory.cacheLoggerInfo(BILogConstant.LOG_CACHE_TAG.CUBE_GENERATE_INFO, BILogConstant.LOG_CACHE_SUB_TAG.READ_ONLY_BUSINESS_TABLES_OF_TABLE_SOURCE_MAP, BILogHelper.getReadOnlyBusinessTablesOfTableSourceMap());
        PerformancePlugManager.getInstance().printSystemParameters();
        logCubeTaskType();
        logBusinessTable();
        logTable(cubeBuildStuff.getSingleSourceLayers(), cubeBuildStuff.getUpdateSettingSources());
        logRelation(cubeBuildStuff.getTableSourceRelationSet());
        logPath(filterPath(cubeBuildStuff.getTableSourceRelationPathSet()));
        copyFilesFromOldCubs();
    }

    protected Set<BITableSourceRelation> getGeneratedRelation() {
        Set<BITableSourceRelation> relations = new HashSet<BITableSourceRelation>();
        for (BICubeGenerateRelation relation : cubeBuildStuff.getCubeGenerateRelationSet()) {
            relations.add(relation.getRelation());
        }
        return relations;
    }

    @Override
    public void end() {
        Future<String> result = finishObserver.getOperationResult();
        try {
            String message = result.get();
            BILoggerFactory.getLogger().info(message);
            boolean cubeBuildSucceed = finishObserver.success();
            if (!cubeBuildSucceed) {
                checkTaskFinish();
            }
            if (cubeBuildSucceed) {
                cube.addVersion(System.currentTimeMillis());
                long start = System.currentTimeMillis();
                boolean replaceSuccess = replaceOldCubes();
                if (replaceSuccess) {
                    BICubeConfigureCenter.getTableRelationManager().finishGenerateCubes(biUser.getUserId(), CubeUpdateUtils.getCubeAbsentRelations(biUser.getUserId()));
                    BICubeConfigureCenter.getTableRelationManager().persistData(biUser.getUserId());
                    BICubeConfigureCenter.getPackageManager().finishGenerateCubes(biUser.getUserId(), CubeUpdateUtils.getCubeAbsentTables(biUser.getUserId()));
                    BICubeConfigureCenter.getPackageManager().persistData(biUser.getUserId());
                    BICubeConfigureCenter.getDataSourceManager().persistData(biUser.getUserId());
                    BIModuleUtils.clearAnalysisETLCache(biUser.getUserId());
                    BILoggerFactory.getLogger().info("Replace successful! Cost :" + DateUtils.timeCostFrom(start));
                } else {
                    message = "Cube replace failed ,the Cube files will not be replaced ";
                    BILoggerFactory.getLogger().error(message);
                }
                BILoggerFactory.cacheLoggerInfo(BILogConstant.LOG_CACHE_TAG.CUBE_GENERATE_INFO, BILogConstant.LOG_CACHE_SUB_TAG.CUBE_GENERATE_END, System.currentTimeMillis());
            } else {
                try {
                    BICubeDiskPrimitiveDiscovery.getInstance().forceRelease();
                    message = "Cube build failed ,the Cube files will not be replaced ";
                    BIConfigureManagerCenter.getLogManager().errorTable(new PersistentTable("", "", ""), message, biUser.getUserId());
                    BILoggerFactory.getLogger().error(message);
                } catch (Exception e) {
                    BILoggerFactory.getLogger().error(e.getMessage(), e);
                } finally {
                    BICubeDiskPrimitiveDiscovery.getInstance().finishRelease();
                }
            }
        } catch (Exception e) {
            BILoggerFactory.getLogger().error(e.getMessage(), e);
        } finally {
        }
    }

    protected void checkTaskFinish() {
        /**
         * Cube生成任务失败。但是Cube的局部可能还在继续生成。
         */
        while (!Thread.currentThread().isInterrupted()) {
            if (BIProcessorThreadManager.getInstance().isLeisure()) {
                return;
            } else {
                try {
                    Thread.sleep(5000);
                    BILoggerFactory.getLogger().info("Cube thread is busy currently.Monitor will check it again after 5s ");
                } catch (InterruptedException e) {
                    BILoggerFactory.getLogger().error(e.getMessage(), e);
                }
            }

        }
    }

    private boolean replaceOldCubes() {
        try {
            logger.info("Start Replacing Old Cubes, Stop All Analysis");
            boolean replaceSuccess = false;
            for (int i = 0; i < retryNTimes; i++) {
                if (Thread.currentThread().isInterrupted()) {
                    break;
                }
//                集群模式通过zookeeper通知slaver释放资源
                if (ClusterEnv.isCluster()) {
                    try {
                        ZooKeeperManager.getInstance().getZooKeeper().setData(BICubeStatusWatcher.CUBE_STATUS, "finish".getBytes(), -1);
                    } catch (Exception e) {
                        BILoggerFactory.getLogger().error("notify cube build finish message failed! retry again ", e);
                        continue;
                    }
//                等待所有机器释放nio资源
                    Thread.sleep(100);
                }
                BICubeDiskPrimitiveDiscovery.getInstance().forceRelease();
                replaceSuccess = cubeBuildStuff.replaceOldCubes();
                for (String location : BICubeDiskPrimitiveDiscovery.getInstance().getUnReleasedLocation()) {
                    BILoggerFactory.getLogger().error("error: the filePath is : " + location);
                }
                CubeReadingTableIndexLoader.envChanged();
                if (!replaceSuccess) {
                    logger.error("cube replace failed after " + i + " times try!It will try again in 5s");
                    Thread.sleep(5000);
                } else {
                    break;
                }
            }
            return replaceSuccess;
        } catch (Exception e) {
            String message = " cube build failed ! caused by \n" + e.getMessage();
            logger.error(message, e);
            try {
                BIConfigureManagerCenter.getLogManager().errorTable(new PersistentTable("", "", ""), message, biUser.getUserId());
            } catch (Exception e1) {
                logger.error(e1.getMessage(), e1);
            }
            return false;
        } finally {
            BICubeDiskPrimitiveDiscovery.getInstance().finishRelease();
            CubeReadingTableIndexLoader.envChanged();
        }
    }

    @Override
    public void run() {
        BICubeBuildTopicManager manager = new BICubeBuildTopicManager();
        BICubeOperationManager operationManager = new BICubeOperationManager(cube, integrityCube, cubeBuildStuff.getSystemTableSources());
        operationManager.initialWatcher();
        operationManager.subscribeStartMessage();
        operationManager.setUpdateSettingSourceMap(cubeBuildStuff.getUpdateSettingSources());
        manager.registerDataSource(cubeBuildStuff.getSingleSourceLayers());
        manager.registerRelation(cubeBuildStuff.getTableSourceRelationSet());
        Set<BITableSourceRelationPath> relationPathSet = filterPath(cubeBuildStuff.getTableSourceRelationPathSet());
        manager.registerTableRelationPath(relationPathSet);
        logPath(relationPathSet);
        finishObserver = new BICubeFinishObserver<Future<String>>(new BIOperationID("FINEBI_E"));
        Map<String, CubeTableSource> tablesNeed2GenerateMap = new ConcurrentHashMap<String, CubeTableSource>();
        for (CubeTableSource tableSource : cubeBuildStuff.getSingleSourceLayers()) {
            tablesNeed2GenerateMap.put(tableSource.getSourceID(), tableSource);
        }
        operationManager.setVersionMap(cubeBuildStuff.getVersions());
        operationManager.generateDataSource(cubeBuildStuff.getDependTableResource(),tablesNeed2GenerateMap);
        logTableDepend(cubeBuildStuff.getDependTableResource());
        operationManager.generateRelationBuilder(cubeBuildStuff.getCubeGenerateRelationSet(), tablesNeed2GenerateMap);
        logRelationDepend(cubeBuildStuff.getCubeGenerateRelationSet());
        operationManager.generateTableRelationPath(cubeBuildStuff.getCubeGenerateRelationPathSet(), tablesNeed2GenerateMap);
        logPathDepend(cubeBuildStuff.getCubeGenerateRelationPathSet());
        IRouter router = BIFactoryHelper.getObject(IRouter.class);
        try {
            BIConfigureManagerCenter.getLogManager().relationPathSet(cubeBuildStuff.getTableSourceRelationPathSet(), biUser.getUserId());
            BIConfigureManagerCenter.getLogManager().cubeTableSourceSet(cubeBuildStuff.getSingleSourceLayers(), biUser.getUserId());
            router.deliverMessage(generateMessageDataSourceStart());
        } catch (BIDeliverFailureException e) {
            throw BINonValueUtils.beyondControl(e);
        }
    }

    private void logCubeTaskType() {
        StringBuffer msg = new StringBuffer();
        msg.append(" Cube update start. Update type: " + getTaskType().name());
        logger.info(BIDateUtils.getCurrentDateTime() + msg);
    }

    private void logBusinessTable() {
        Integer businessTableCount = 0;
        logger.info("***************Business Table*****************");
        try {
            long userID = UserControl.getInstance().getSuperManagerID();
            for (BusinessTable table : BICubeConfigureCenter.getPackageManager().getAllTables(userID)) {
                logger.info(BIStringUtils.append(
                        "\n" + "       Business Table: " + (businessTableCount++),
                        "\n" + "       Business Table Alias Name:", BICubeConfigureCenter.getAliasManager().getAliasName(table.getID().getIdentityValue(), userID),
                        "\n" + "       Business Table ID:", table.getID().getIdentity(),
                        "\n" + "       Corresponding  Table Source name:", table.getTableSource().getTableName(),
                        "\n" + "       Corresponding  Table Source ID:", table.getTableSource().getSourceID()
                ));
            }
        } catch (Exception e) {
            logger.error(e.getMessage(), e);
        }
        logger.info("***************Business Table*****************");

    }

    private void logTable(Set<CubeTableSource> tableSourceSet, Map<CubeTableSource, UpdateSettingSource> updateSettingSources) {
        Map<Integer, String> updateTypeMap = new HashMap();
        updateTypeMap.put(DBConstant.SINGLE_TABLE_UPDATE_TYPE.ALL, "All");
        updateTypeMap.put(DBConstant.SINGLE_TABLE_UPDATE_TYPE.PART, "Part");
        updateTypeMap.put(DBConstant.SINGLE_TABLE_UPDATE_TYPE.NEVER, "Never");
        logger.info("***************Table*****************");
        Integer tableCount = 0;
        if (tableSourceSet != null) {
            for (CubeTableSource tableSource : tableSourceSet) {
                int updateType = null == updateSettingSources.get(tableSource) ? DBConstant.SINGLE_TABLE_UPDATE_TYPE.ALL : updateSettingSources.get(tableSource).getUpdateType();
                logger.info(BIStringUtils.append(
                        "\n" + "       table: " + (tableCount++),
                        BuildLogHelper.tableLogContent("", tableSource),
                        "\n" + "       update type:", updateTypeMap.get(updateType)
                ));
            }
        }
        logger.info("***************Table end*****************\n");

    }

    private void logRelation(Set<BITableSourceRelation> relationSet) {
        logger.info("***************Relation*****************");
        Integer countRelation = 0;
        if (relationSet != null) {
            for (BITableSourceRelation relation : relationSet) {
                countRelation++;
                logger.info("\nRelation " + countRelation + ":" + BuildLogHelper.relationLogContent("", relation));
            }
        }
        logger.info("***************Relation end*****************\n");

    }


    private void logPath(Set<BITableSourceRelationPath> relationPathSet) {
        logger.info("***************Path*****************");

        if (relationPathSet != null) {
            Integer countPath = 0;
            for (BITableSourceRelationPath path : relationPathSet) {
                countPath++;
                logger.info("\nPath" + countPath + ":\n" + BuildLogHelper.pathLogContent(path));

            }
        }
        logger.info("***************Path end*****************\n");
    }

    private void logPathDepend(Set<BICubeGenerateRelationPath> relationPathSet) {
        logger.info("***************Path depend*****************");

        if (relationPathSet != null) {
            Integer countPath = 0;
            for (BICubeGenerateRelationPath path : relationPathSet) {
                countPath++;
                StringBuffer sb = new StringBuffer();
                Iterator<BITableSourceRelationPath> it = path.getDependRelationPathSet().iterator();
                sb.append("\nPath Depend:" + countPath + ":\nTarget:\n" + BuildLogHelper.pathLogContent(path.getBiTableSourceRelationPath()))
                        .append("\n").append("Depend Content:\n");
                int countDepend = 0;
                while (it.hasNext()) {
                    BITableSourceRelationPath dependPath = it.next();
                    sb.append("\n").append("Path ").append(countDepend).append("\n").append(BuildLogHelper.pathLogContent(dependPath));
                }
                logger.info(sb.toString() + "\n");
            }
        }
        logger.info("***************Path depend end*****************\n");
    }

    private void logTableDepend(Set<List<Set<CubeTableSource>>> tableSourceSet) {
        logger.info("***************Table depend*****************");

        int countSource = 0;
        for (List<Set<CubeTableSource>> tableSource : tableSourceSet) {
            countSource++;
            StringBuffer sb = new StringBuffer("\nTable Depend " + countSource + " \n");
            int layerCount = 0;
            for (Set<CubeTableSource> oneLayer : tableSource) {
                layerCount++;
                sb.append("---------------Layer " + layerCount).append("----------------\n");
                int cellCount = 0;
                for (CubeTableSource oneCell : oneLayer) {
                    sb.append("Layer " + layerCount + ", Cell " + cellCount);
                    sb.append(BuildLogHelper.tableLogContent("", oneCell));
                    sb.append("\n");
                    cellCount++;
                }
                sb.append("-------------Layer " + layerCount).append(" end--------------\n\n");
            }
            logger.info(sb.toString());
        }
        logger.info("***************Table depend end*****************");

    }

    private void logRelationDepend(Set<BICubeGenerateRelation> relationDependSet) {
        logger.info("***************Relation depend*****************");
        Integer countRelation = 0;
        if (relationDependSet != null) {
            for (BICubeGenerateRelation relationDepend : relationDependSet) {
                countRelation++;
                StringBuffer sb = new StringBuffer();
                sb.append("\nRelation depend" + countRelation + "\n Target:\n" + BuildLogHelper.relationLogContent("", relationDepend.getRelation()))
                        .append("\n").append("Depend:\n");
                int countDepend = 0;
                Iterator<CubeTableSource> it = relationDepend.getDependTableSourceSet().iterator();
                while (it.hasNext()) {
                    CubeTableSource dependTable = it.next();
                    sb.append("\n").append("table ").append(countDepend).append("\n").append(BuildLogHelper.tableLogContent(dependTable));
                }
                logger.info(sb.toString());
            }
        }
        logger.info("***************Relation depend end*****************\n");

    }

    private Set<BITableSourceRelationPath> filterPath(Set<BITableSourceRelationPath> paths) {
        Iterator<BITableSourceRelationPath> iterator = paths.iterator();
        Set<BITableSourceRelationPath> result = new HashSet<BITableSourceRelationPath>();
        while (iterator.hasNext()) {
            BITableSourceRelationPath path = iterator.next();
            if (path.getAllRelations().size() > 1) {
                result.add(path);
            }
        }
        return result;
    }

    private void copyFilesFromOldCubs() {
        BILoggerFactory.getLogger().info("start copy some files");
        Long t = System.currentTimeMillis();
        if (System.getProperty("os.name").toUpperCase().contains("HP-UX")) {
            BILoggerFactory.getLogger().warn("current system is hp-unix. Handlers must be released before copying Files");
            BICubeDiskPrimitiveDiscovery.getInstance().forceRelease();
            cubeBuildStuff.copyFileFromOldCubes();
            BICubeDiskPrimitiveDiscovery.getInstance().finishRelease();
        } else {
            cubeBuildStuff.copyFileFromOldCubes();
        }
        logger.info("copy files cost time: " + DateUtils.timeCostFrom(t));
    }

    public static IMessage generateMessageDataSourceStart() {
        return buildTopic(new BIMessageTopic(BICubeBuildTopicTag.START_BUILD_CUBE));
    }

    private static IMessage buildTopic(IMessageTopic topic) {
        return new BIMessage(topic, null, null, null);
    }

    @Override
    public long getUserId() {
        return UserControl.getInstance().getSuperManagerID();
    }

    @Override
    public JSONObject createJSON() throws Exception {
        return null;
    }
}
