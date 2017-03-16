package com.finebi.cube.data.disk.writer;

import com.finebi.cube.BICubeLongTypePosition;
import com.finebi.cube.data.output.ICubeWriter;
import com.finebi.cube.data.output.primitive.ICubePrimitiveWriter;

import java.util.UUID;

/**
 * This class created on 2016/3/30.
 *
 * @author Connery
 * @since 4.0
 */
public class BICubePrimitiveWriterWrapper<T> implements ICubeWriter<T> {
    private final String handlerKey = UUID.randomUUID().toString();
    private ICubePrimitiveWriter<T> writer;

    public BICubePrimitiveWriterWrapper(ICubePrimitiveWriter<T> writer) {
        this.writer = writer;
        this.writer.getHandlerReleaseHelper().registerHandlerKey(handlerKey);
    }

    @Override
    public void recordSpecificValue(int specificPosition, T value) {
        writer.recordSpecificPositionValue(specificPosition, value);
    }

    @Override
    public void saveStatus() {

    }

    @Override
    public void setPosition(BICubeLongTypePosition position) {

    }

    @Override
    public void clear() {
        writer.releaseHandler(handlerKey);
    }

    @Override
    public void flush() {
        writer.flush();
    }

    @Override
    public void forceRelease() {
        writer.forceRelease();
    }

    @Override
    public boolean isForceReleased() {
        return writer.isForceReleased();
    }
}
