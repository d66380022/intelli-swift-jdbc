package com.fr.bi.cal.analyze.cal.result;

/**
 * Created by 小灰灰 on 2014/4/1.
 */
public class NodeAllExpander extends NodeExpander {
    private boolean allLevel;
    private int level;
    private int baseLevel;

    public NodeAllExpander() {
        allLevel = true;
    }

    public NodeAllExpander(int level) {
        this.level = level;
        this.baseLevel = level;
        allLevel = false;
    }

    protected NodeAllExpander(int level, int baseLevel) {
        this.level = level;
        this.baseLevel = baseLevel;
        allLevel = false;
    }

    @Override
    public NodeExpander getParent() {
        if (allLevel) {
            return this;
        }
        return parent;
    }

    @Override
    public boolean isChildExpand(String name) {
        return true;
    }

    @Override
    public NodeExpander getChildExpander(String name) {
        if (allLevel) {
            return this;
        } else if (level < 1) {
            return null;
        } else {
            NodeAllExpander expander = new NodeAllExpander(level - 1, baseLevel);
            expander.setParent(this);
            return expander;
        }
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (o == null || getClass() != o.getClass()) {
            return false;
        }
        if (!super.equals(o)) {
            return false;
        }

        NodeAllExpander that = (NodeAllExpander) o;

        if (allLevel != that.allLevel) {
            return false;
        }
        if (level != that.level) {
            return false;
        }
        return baseLevel == that.baseLevel;

    }

    @Override
    public int hashCode() {
        int result = super.hashCode();
        result = 31 * result + (allLevel ? 1 : 0);
        result = 31 * result + level;
        result = 31 * result + baseLevel;
        return result;
    }
}