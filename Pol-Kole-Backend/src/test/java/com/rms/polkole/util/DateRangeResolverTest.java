package com.rms.polkole.util;

import org.junit.jupiter.api.Test;
import java.time.LocalDate;
import java.time.Month;

import static org.junit.jupiter.api.Assertions.*;

public class DateRangeResolverTest {

    @Test
    void testToday() {
        DateRangeResolver.DateRange dr = DateRangeResolver.resolve("today");
        assertNotNull(dr);
        assertEquals(LocalDate.now(DateRangeResolver.ZONE), dr.getStartDate());
        assertEquals(LocalDate.now(DateRangeResolver.ZONE), dr.getEndDate());
    }

    @Test
    void testYesterday() {
        DateRangeResolver.DateRange dr = DateRangeResolver.resolve("yesterday");
        assertNotNull(dr);
        assertEquals(LocalDate.now(DateRangeResolver.ZONE).minusDays(1), dr.getStartDate());
        assertEquals(LocalDate.now(DateRangeResolver.ZONE).minusDays(1), dr.getEndDate());
    }

    @Test
    void testLast7Days() {
        DateRangeResolver.DateRange dr = DateRangeResolver.resolve("last 7 days");
        assertNotNull(dr);
        assertEquals(LocalDate.now(DateRangeResolver.ZONE).minusDays(6), dr.getStartDate());
        assertEquals(LocalDate.now(DateRangeResolver.ZONE), dr.getEndDate());
    }

    @Test
    void testThisMonth() {
        DateRangeResolver.DateRange dr = DateRangeResolver.resolve("this month");
        assertNotNull(dr);
        LocalDate today = LocalDate.now(DateRangeResolver.ZONE);
        assertEquals(1, dr.getStartDate().getDayOfMonth());
        assertEquals(today.getMonth(), dr.getStartDate().getMonth());
    }

    @Test
    void testLastMonth() {
        DateRangeResolver.DateRange dr = DateRangeResolver.resolve("last month");
        assertNotNull(dr);
        LocalDate today = LocalDate.now(DateRangeResolver.ZONE);
        LocalDate expected = today.minusMonths(1);
        assertEquals(expected.getMonth(), dr.getStartDate().getMonth());
        assertEquals(1, dr.getStartDate().getDayOfMonth());
    }

    @Test
    void testSpecificMonthAugust() {
        DateRangeResolver.DateRange dr = DateRangeResolver.resolve("August 2026");
        assertNotNull(dr);
        assertEquals(LocalDate.of(2026, Month.AUGUST, 1), dr.getStartDate());
        assertEquals(LocalDate.of(2026, Month.AUGUST, 31), dr.getEndDate());
    }

    @Test
    void testDefaultFallback() {
        DateRangeResolver.DateRange dr = DateRangeResolver.resolve(null);
        assertNotNull(dr);
        assertEquals(1, dr.getStartDate().getDayOfMonth());
    }
}
