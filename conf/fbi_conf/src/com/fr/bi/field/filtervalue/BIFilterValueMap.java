package com.fr.bi.field.filtervalue;

import com.fr.bi.field.filtervalue.date.evenfilter.*;
import com.fr.bi.field.filtervalue.date.nonefilter.DateNotNullFilterValue;
import com.fr.bi.field.filtervalue.date.nonefilter.DateNullFilterValue;
import com.fr.bi.field.filtervalue.date.onevaluefilter.YMDEndWithFilterValue;
import com.fr.bi.field.filtervalue.date.onevaluefilter.YMDLikeFilterValue;
import com.fr.bi.field.filtervalue.date.onevaluefilter.YMDNotLikeFilterValue;
import com.fr.bi.field.filtervalue.date.onevaluefilter.YMDStartWithFilterValue;
import com.fr.bi.field.filtervalue.date.rangefilter.DateInRangeFilterValue;
import com.fr.bi.field.filtervalue.date.rangefilter.DateLessThanFilterValue;
import com.fr.bi.field.filtervalue.date.rangefilter.DateMoreThanFilterValue;
import com.fr.bi.field.filtervalue.date.rangefilter.DateNotInRangeFilterValue;
import com.fr.bi.field.filtervalue.number.containsfilter.NumberContainsFilterValue;
import com.fr.bi.field.filtervalue.number.containsfilter.NumberInUserFilterValue;
import com.fr.bi.field.filtervalue.number.containsfilter.NumberNotContainsFilterValue;
import com.fr.bi.field.filtervalue.number.containsfilter.NumberNotInUserFilterValue;
import com.fr.bi.field.filtervalue.number.evenfilter.NumberEqualFilterValue;
import com.fr.bi.field.filtervalue.number.evenfilter.NumberNotEqualFilterValue;
import com.fr.bi.field.filtervalue.number.nfilter.NumberBottomNFilterValue;
import com.fr.bi.field.filtervalue.number.nfilter.NumberTopNFilterValue;
import com.fr.bi.field.filtervalue.number.nonefilter.NumberLargeThanOREqualsAvgFilterValue;
import com.fr.bi.field.filtervalue.number.nonefilter.NumberNotNullFilterValue;
import com.fr.bi.field.filtervalue.number.nonefilter.NumberNullFilterValue;
import com.fr.bi.field.filtervalue.number.nonefilter.NumberSmallThanAvgFilterValue;
import com.fr.bi.field.filtervalue.number.rangefilter.NumberInRangeFilterValue;
import com.fr.bi.field.filtervalue.number.rangefilter.NumberNotInRangeFilterValue;
import com.fr.bi.field.filtervalue.string.nfilter.StringBOTTOMNFilterValue;
import com.fr.bi.field.filtervalue.string.nfilter.StringTOPNFilterValue;
import com.fr.bi.field.filtervalue.string.nonevaluefilter.StringNotNullFilterValue;
import com.fr.bi.field.filtervalue.string.nonevaluefilter.StringNullFilterValue;
import com.fr.bi.field.filtervalue.string.onevaluefilter.*;
import com.fr.bi.field.filtervalue.string.rangefilter.StringINFilterValue;
import com.fr.bi.field.filtervalue.string.rangefilter.StringINUserFilterValue;
import com.fr.bi.field.filtervalue.string.rangefilter.StringNotINFilterValue;
import com.fr.bi.field.filtervalue.string.rangefilter.StringNotInUserFilterValue;
import com.fr.bi.stable.constant.BIReportConstant;

import java.util.HashMap;
import java.util.Map;

/**
 * Created by Young's on 2015/11/11.
 */
public class BIFilterValueMap {
    public static final Map<Integer, Class> ALL_VALUES = new HashMap<Integer, Class>(){{
        put(BIReportConstant.DIMENSION_FILTER_STRING.BELONG_VALUE, StringINFilterValue.class);
        put(BIReportConstant.DIMENSION_FILTER_STRING.BELONG_USER, StringINUserFilterValue.class);
        put(BIReportConstant.DIMENSION_FILTER_STRING.NOT_BELONG_VALUE, StringNotINFilterValue.class);
        put(BIReportConstant.DIMENSION_FILTER_STRING.NOT_BELONG_USER, StringNotInUserFilterValue.class);
        put(BIReportConstant.DIMENSION_FILTER_STRING.CONTAIN, StringLikeFilterValue.class);
        put(BIReportConstant.DIMENSION_FILTER_STRING.NOT_CONTAIN, StringNotLikeFilterValue.class);
        put(BIReportConstant.DIMENSION_FILTER_STRING.NOT_VAGUE_CONTAIN, StringNotVagueLikeFilterValue.class);
        put(BIReportConstant.DIMENSION_FILTER_STRING.VAGUE_CONTAIN, StringVagueLikeFilterValue.class);
        put(BIReportConstant.DIMENSION_FILTER_STRING.BEGIN_WITH, StringStartWithFilterValue.class);
        put(BIReportConstant.DIMENSION_FILTER_STRING.NOT_BEGIN_WITH, StringNotStartWithFilterValue.class);
        put(BIReportConstant.DIMENSION_FILTER_STRING.END_WITH, StringEndWithFilterValue.class);
        put(BIReportConstant.DIMENSION_FILTER_STRING.NOT_END_WITH, StringNotEndWithFilterValue.class);
        put(BIReportConstant.DIMENSION_FILTER_STRING.IS_NULL, StringNullFilterValue.class);
        put(BIReportConstant.DIMENSION_FILTER_STRING.NOT_NULL, StringNotNullFilterValue.class);
        put(BIReportConstant.DIMENSION_FILTER_STRING.TOP_N, StringTOPNFilterValue.class);
        put(BIReportConstant.DIMENSION_FILTER_STRING.BOTTOM_N, StringBOTTOMNFilterValue.class);
        put(BIReportConstant.DIMENSION_FILTER_NUMBER.BELONG_VALUE, NumberInRangeFilterValue.class);
        put(BIReportConstant.DIMENSION_FILTER_NUMBER.BELONG_USER, NumberEqualFilterValue.class);
        put(BIReportConstant.DIMENSION_FILTER_NUMBER.NOT_BELONG_VALUE, NumberNotInRangeFilterValue.class);
        put(BIReportConstant.DIMENSION_FILTER_NUMBER.NOT_BELONG_USER, NumberNotEqualFilterValue.class);
        put(BIReportConstant.DIMENSION_FILTER_NUMBER.MORE_THAN_AVG, NumberLargeThanOREqualsAvgFilterValue.class);
        put(BIReportConstant.DIMENSION_FILTER_NUMBER.LESS_THAN_AVG, NumberSmallThanAvgFilterValue.class);
        put(BIReportConstant.DIMENSION_FILTER_NUMBER.IS_NULL, NumberNullFilterValue.class);
        put(BIReportConstant.DIMENSION_FILTER_NUMBER.NOT_NULL, NumberNotNullFilterValue.class);
        put(BIReportConstant.DIMENSION_FILTER_NUMBER.TOP_N, NumberTopNFilterValue.class);
        put(BIReportConstant.DIMENSION_FILTER_NUMBER.BOTTOM_N, NumberBottomNFilterValue.class);
        put(BIReportConstant.DIMENSION_FILTER_DATE.BELONG_VALUE, StringINFilterValue.class);
        put(BIReportConstant.DIMENSION_FILTER_DATE.NOT_BELONG_VALUE, StringNotINFilterValue.class);
        put(BIReportConstant.DIMENSION_FILTER_DATE.CONTAIN, YMDLikeFilterValue.class);
        put(BIReportConstant.DIMENSION_FILTER_DATE.NOT_CONTAIN, YMDNotLikeFilterValue.class);
        put(BIReportConstant.DIMENSION_FILTER_DATE.BEGIN_WITH, YMDStartWithFilterValue.class);
        put(BIReportConstant.DIMENSION_FILTER_DATE.END_WITH, YMDEndWithFilterValue.class);
        put(BIReportConstant.DIMENSION_FILTER_DATE.IS_NULL, StringNullFilterValue.class);
        put(BIReportConstant.DIMENSION_FILTER_DATE.NOT_NULL, StringNotNullFilterValue.class);
        put(BIReportConstant.DIMENSION_FILTER_DATE.TOP_N, StringTOPNFilterValue.class);
        put(BIReportConstant.DIMENSION_FILTER_DATE.BOTTOM_N, StringBOTTOMNFilterValue.class);
        put(BIReportConstant.TARGET_FILTER_STRING.BELONG_VALUE, StringINFilterValue.class);
        put(BIReportConstant.TARGET_FILTER_STRING.BELONG_USER, StringINUserFilterValue.class);
        put(BIReportConstant.TARGET_FILTER_STRING.NOT_BELONG_VALUE, StringNotINFilterValue.class);
        put(BIReportConstant.TARGET_FILTER_STRING.NOT_BELONG_USER, StringNotInUserFilterValue.class);
        put(BIReportConstant.TARGET_FILTER_STRING.CONTAIN, StringLikeFilterValue.class);
        put(BIReportConstant.TARGET_FILTER_STRING.NOT_CONTAIN, StringNotLikeFilterValue.class);
        put(BIReportConstant.TARGET_FILTER_STRING.NOT_VAGUE_CONTAIN, StringNotVagueLikeFilterValue.class);
        put(BIReportConstant.TARGET_FILTER_STRING.VAGUE_CONTAIN, StringVagueLikeFilterValue.class);
        put(BIReportConstant.TARGET_FILTER_STRING.BEGIN_WITH, StringStartWithFilterValue.class);
        put(BIReportConstant.TARGET_FILTER_STRING.NOT_BEGIN_WITH, StringNotStartWithFilterValue.class);
        put(BIReportConstant.TARGET_FILTER_STRING.END_WITH, StringEndWithFilterValue.class);
        put(BIReportConstant.TARGET_FILTER_STRING.NOT_END_WITH, StringNotEndWithFilterValue.class);
        put(BIReportConstant.TARGET_FILTER_STRING.IS_NULL, StringNullFilterValue.class);
        put(BIReportConstant.TARGET_FILTER_STRING.NOT_NULL, StringNotNullFilterValue.class);
        put(BIReportConstant.TARGET_FILTER_NUMBER.BELONG_VALUE, NumberInRangeFilterValue.class);
        put(BIReportConstant.TARGET_FILTER_NUMBER.BELONG_USER, NumberInUserFilterValue.class);
        put(BIReportConstant.TARGET_FILTER_NUMBER.NOT_BELONG_VALUE, NumberNotInRangeFilterValue.class);
        put(BIReportConstant.TARGET_FILTER_NUMBER.NOT_BELONG_USER, NumberNotInUserFilterValue.class);
        put(BIReportConstant.TARGET_FILTER_NUMBER.EQUAL_TO, NumberEqualFilterValue.class);
        put(BIReportConstant.TARGET_FILTER_NUMBER.NOT_EQUAL_TO, NumberNotEqualFilterValue.class);
        put(BIReportConstant.TARGET_FILTER_NUMBER.IS_NULL, NumberNullFilterValue.class);
        put(BIReportConstant.TARGET_FILTER_NUMBER.CONTAINS, NumberContainsFilterValue.class);
        put(BIReportConstant.TARGET_FILTER_NUMBER.NOT_CONTAINS, NumberNotContainsFilterValue.class);
        put(BIReportConstant.TARGET_FILTER_NUMBER.NOT_NULL, NumberNotNullFilterValue.class);
        put(BIReportConstant.FILTER_DATE.BELONG_DATE_RANGE, DateInRangeFilterValue.class);
        put(BIReportConstant.FILTER_DATE.EARLY_THAN, DateInRangeFilterValue.class);
        put(BIReportConstant.FILTER_DATE.LATER_THAN, DateInRangeFilterValue.class);
        put(BIReportConstant.FILTER_DATE.NOT_BELONG_DATE_RANGE, DateNotInRangeFilterValue.class);
        put(BIReportConstant.FILTER_DATE.BELONG_WIDGET_VALUE, DateInRangeFilterValue.class);
        put(BIReportConstant.FILTER_DATE.NOT_BELONG_WIDGET_VALUE, DateNotInRangeFilterValue.class);
        put(BIReportConstant.FILTER_DATE.EQUAL_TO, DateKeyTargetFilterValue.class);
        put(BIReportConstant.FILTER_DATE.DAY_EQUAL_TO, DateDayTargetFilterValue.class);
        put(BIReportConstant.FILTER_DATE.DAY_NOT_EQUAL_TO, DateDayNotEqualsTargetFilterValue.class);
        put(BIReportConstant.FILTER_DATE.CONTAINS, DateKeyTargetFilterValue.class);
        put(BIReportConstant.FILTER_DATE.CONTAINS_DAY, DateDayContainsTargetFilterValue.class);
        put(BIReportConstant.FILTER_DATE.NOT_EQUAL_TO, DateNotEqualsTargetFilterValue.class);
        put(BIReportConstant.FILTER_DATE.IS_NULL, DateNullFilterValue.class);
        put(BIReportConstant.FILTER_DATE.NOT_NULL, DateNotNullFilterValue.class);
        put(BIReportConstant.FILTER_DATE.MORE_THAN, DateMoreThanFilterValue.class);
        put(BIReportConstant.FILTER_DATE.LESS_THAN, DateLessThanFilterValue.class);
    }};
}