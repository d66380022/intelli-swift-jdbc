package com.fr.swift.cube.io.impl.fineio.output;

import com.fr.swift.cube.io.location.IResourceLocation;
import com.fr.swift.cube.io.output.ByteArrayWriter;
import com.fr.swift.cube.io.output.StringWriter;

/**
 * @author anchore
 */
public class StringFineIoWriter extends BaseFineIoWriter implements StringWriter {
    private ByteArrayWriter baw;

    private StringFineIoWriter(ByteArrayWriter baw) {
        this.baw = baw;
    }

    public static StringWriter build(IResourceLocation location, boolean isOverwrite) {
        return new StringFineIoWriter(ByteArrayFineIoWriter.build(location, isOverwrite));
    }

    @Override
    public void flush() {
        baw.flush();
    }

    @Override
    public void release() {
        baw.release();
    }

    @Override
    public void put(long pos, String val) {
        byte[] bytes = null;
        if (val != null) {
            bytes = val.getBytes(CHARSET);
        }
        baw.put(pos, bytes);
    }
}