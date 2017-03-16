package com.fr.bi.cal.stable.index;

import com.finebi.cube.api.ICubeDataLoader;
import com.fr.bi.cal.stable.cube.file.TableCubeFile;
import com.fr.bi.common.inter.Traversal;
import com.fr.bi.conf.log.BIRecord;
import com.fr.bi.stable.constant.CubeConstant;
import com.fr.bi.stable.data.db.BIDataValue;
import com.fr.bi.stable.data.db.IPersistentTable;
import com.fr.bi.stable.data.source.CubeTableSource;
import com.finebi.cube.common.log.BILoggerFactory;
import com.fr.bi.stable.utils.code.BIPrintUtils;

import java.util.Set;

/**
 * Created by GUY on 2015/3/10.
 */
public class SimpleIndexGenerator extends AbstractIndexGenerator {

    protected int version;
    protected ICubeDataLoader loader;

    public SimpleIndexGenerator(TableCubeFile cube, CubeTableSource dataSource, Set<CubeTableSource> derivedDataSources, int version, BIRecord log, ICubeDataLoader loader) {
        super(cube, dataSource, derivedDataSources, log);
        this.version = version;
        this.loader = loader;
    }

    @Override
    public void generateCube() {
        BILoggerFactory.getLogger().info("table: " + this.dataSource.toString() + "loading data：");

        try {
            cube.createDetailDataWriter();
            cube.writeLastTime();
            long rowCount = writeSimpleIndex();
            cube.writeRowCount(rowCount);
            cube.writeTableGenerateVersion(version);
            BILoggerFactory.getLogger().info("table: " + this.dataSource.toString() + "loading data completed : 100%");
        } catch (Throwable e) {
            throw new RuntimeException(e);
        } finally {
            cube.releaseDetailDataWriter();
        }
    }

    protected long writeSimpleIndex() {
        final long start = System.currentTimeMillis();
        final IPersistentTable table = this.dataSource.getPersistentTable();
        return this.dataSource.read(new Traversal<BIDataValue>() {
            @Override
            public void actionPerformed(BIDataValue v) {
                cube.addDataValue(v);
                if (((v.getRow() + 1) & CubeConstant.LOG_ROW_COUNT) == 0) {// 每执行65536行print一下
                    BIPrintUtils.writeIndexLog("table: " + toString() + CubeConstant.READ_FROM_DB, v.getRow(), start);
                    log.readingInfoTable(table, System.currentTimeMillis() - start);
                }
            }
        }, cube.getBIField(), loader);
    }

}