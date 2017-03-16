package com.fr.bi.cal.generate.index;

import com.finebi.cube.api.BICubeManager;
import com.finebi.cube.conf.CubeGenerationManager;
import com.fr.bi.cal.stable.index.AbstractIndexGenerator;
import com.fr.bi.cal.stable.index.SimpleIndexIncreaseGenerator;
import com.fr.bi.conf.provider.BIConfigureManagerCenter;
import com.fr.bi.stable.data.source.CubeTableSource;

/**
 * Created by 小灰灰 on 2015/10/15.
 */
public class IncreaseIndexGenerator extends IndexGenerator {
    private static final long serialVersionUID = 1698139566789702950L;

    public IncreaseIndexGenerator(CubeTableSource source, long userId, int version) {
        super(source, userId, version);
    }

    @Override
    protected AbstractIndexGenerator createSimpleIndexGenerator() {
        return new SimpleIndexIncreaseGenerator(cube, source, CubeGenerationManager.getCubeManager().getGeneratingObject(biUser.getUserId()).getSystemTableSources(), version, BIConfigureManagerCenter.getLogManager().getBILog(biUser.getUserId()), BICubeManager.getInstance().fetchCubeLoader(biUser.getUserId()));
    }
}