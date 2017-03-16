package com.finebi.cube.data.disk.reader;

import com.finebi.cube.data.input.ICubeReader;
import com.finebi.cube.data.input.primitive.ICubePrimitiveReader;

import java.util.UUID;

/**
 * This class created on 2016/3/30.
 *
 * @author Connery
 * @since 4.0
 */
public class BICubePrimitiveReaderWrapper implements ICubeReader {
    private final String handlerKey = UUID.randomUUID().toString();
    protected ICubePrimitiveReader reader;

    public BICubePrimitiveReaderWrapper(ICubePrimitiveReader reader) {
        this.reader = reader;
        this.reader.getHandlerReleaseHelper().registerHandlerKey(handlerKey);
    }


    @Override
    public long getLastPosition(long rowCount) {
        return 0;
    }

    @Override
    public void clear() {
        reader.releaseHandler(handlerKey);
    }

    @Override
    public void forceRelease() {
        reader.forceRelease();
    }

    @Override
    public boolean canRead() {
        return reader.canReader();
    }

    @Override
    public boolean isForceReleased() {
        return reader.isForceReleased();
    }
}
