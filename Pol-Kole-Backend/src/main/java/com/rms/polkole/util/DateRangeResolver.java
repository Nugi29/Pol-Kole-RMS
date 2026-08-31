package com.rms.polkole.util;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.*;
import java.time.temporal.TemporalAdjusters;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class DateRangeResolver {

    public static final ZoneId ZONE = ZoneId.of("Asia/Colombo");

    @Getter
    @AllArgsConstructor
    public static class DateRange {
        private final LocalDate startDate;
        private final LocalDate endDate;
        private final String label;
    }

    public static DateRange resolve(String expression) {
        LocalDate today = LocalDate.now(ZONE);
        if (expression == null || expression.trim().isEmpty()) {
            return resolveThisMonth(today);
        }

        String exp = expression.trim().toLowerCase(Locale.ENGLISH);

        if (exp.contains("today")) {
            return new DateRange(today, today, "Today");
        }
        if (exp.contains("yesterday")) {
            LocalDate y = today.minusDays(1);
            return new DateRange(y, y, "Yesterday");
        }
        if (exp.contains("this week")) {
            LocalDate start = today.with(DayOfWeek.MONDAY);
            LocalDate end = today.with(DayOfWeek.SUNDAY);
            return new DateRange(start, end, "This Week");
        }
        if (exp.contains("last week")) {
            LocalDate start = today.minusWeeks(1).with(DayOfWeek.MONDAY);
            LocalDate end = today.minusWeeks(1).with(DayOfWeek.SUNDAY);
            return new DateRange(start, end, "Last Week");
        }
        if (exp.contains("last 7 days") || exp.contains("past 7 days")) {
            return new DateRange(today.minusDays(6), today, "Last 7 Days");
        }
        if (exp.contains("last 30 days") || exp.contains("past 30 days")) {
            return new DateRange(today.minusDays(29), today, "Last 30 Days");
        }
        if (exp.contains("this month")) {
            return resolveThisMonth(today);
        }
        if (exp.contains("last month")) {
            LocalDate lastMonthDay = today.minusMonths(1);
            LocalDate start = lastMonthDay.with(TemporalAdjusters.firstDayOfMonth());
            LocalDate end = lastMonthDay.with(TemporalAdjusters.lastDayOfMonth());
            return new DateRange(start, end, "Last Month (" + lastMonthDay.getMonth().name() + ")");
        }
        if (exp.contains("this year")) {
            LocalDate start = today.with(TemporalAdjusters.firstDayOfYear());
            LocalDate end = today.with(TemporalAdjusters.lastDayOfYear());
            return new DateRange(start, end, "This Year (" + today.getYear() + ")");
        }
        if (exp.contains("last year")) {
            LocalDate start = today.minusYears(1).with(TemporalAdjusters.firstDayOfYear());
            LocalDate end = today.minusYears(1).with(TemporalAdjusters.lastDayOfYear());
            return new DateRange(start, end, "Last Year (" + (today.getYear() - 1) + ")");
        }

        // Check for specific month names (e.g. "August", "August 2026")
        for (Month month : Month.values()) {
            String mName = month.name().toLowerCase(Locale.ENGLISH);
            if (exp.contains(mName)) {
                int year = today.getYear();
                Pattern yearPattern = Pattern.compile("\\b(20\\d{2})\\b");
                Matcher m = yearPattern.matcher(exp);
                if (m.find()) {
                    year = Integer.parseInt(m.group(1));
                }
                LocalDate start = LocalDate.of(year, month, 1);
                LocalDate end = start.with(TemporalAdjusters.lastDayOfMonth());
                return new DateRange(start, end, month.name() + " " + year);
            }
        }

        return resolveThisMonth(today);
    }

    private static DateRange resolveThisMonth(LocalDate today) {
        LocalDate start = today.with(TemporalAdjusters.firstDayOfMonth());
        LocalDate end = today.with(TemporalAdjusters.lastDayOfMonth());
        return new DateRange(start, end, "This Month (" + today.getMonth().name() + " " + today.getYear() + ")");
    }
}
