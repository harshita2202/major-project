package com.proctoring.proctoring_backend.service;

import com.proctoring.proctoring_backend.entity.Exam;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeFormatterBuilder;
import java.util.Locale;

@Service
public class ExamAvailabilityService {

    public enum WindowStatus {
        DRAFT,
        UPCOMING,
        OPEN,
        CLOSED
    }

    public WindowStatus getWindowStatus(Exam exam) {
        if (exam == null) return WindowStatus.CLOSED;
        if ("draft".equalsIgnoreCase(exam.getStatus())) {
            return WindowStatus.DRAFT;
        }
        if ("completed".equalsIgnoreCase(exam.getStatus())) {
            return WindowStatus.CLOSED;
        }

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime windowStart = parseWindowStart(exam);
        LocalDateTime windowEnd = parseWindowEnd(exam);

        if (windowStart != null && now.isBefore(windowStart)) {
            return WindowStatus.UPCOMING;
        }
        if (windowEnd != null && now.isAfter(windowEnd)) {
            return WindowStatus.CLOSED;
        }

        return WindowStatus.OPEN;
    }

    public boolean canStartExam(Exam exam) {
        WindowStatus status = getWindowStatus(exam);
        return status == WindowStatus.OPEN;
    }

    public LocalDateTime parseWindowStart(Exam exam) {
        if (exam == null) return null;
        try {
            LocalDate startDate = parseDate(exam.getWindowStartDate() != null && !exam.getWindowStartDate().isEmpty()
                    ? exam.getWindowStartDate() : exam.getDate());
            LocalTime startTime = parseTime(exam.getStartTime() != null && !exam.getStartTime().isEmpty()
                    ? exam.getStartTime() : exam.getTime());

            if (startDate != null && startTime != null) {
                return LocalDateTime.of(startDate, startTime);
            } else if (startDate != null) {
                return startDate.atStartOfDay();
            }
        } catch (Exception ignored) {}
        return null;
    }

    public LocalDateTime parseWindowEnd(Exam exam) {
        if (exam == null) return null;
        try {
            LocalDate endDate = parseDate(exam.getWindowEndDate() != null && !exam.getWindowEndDate().isEmpty()
                    ? exam.getWindowEndDate()
                    : (exam.getWindowStartDate() != null ? exam.getWindowStartDate() : exam.getDate()));

            String endTimeStr = exam.getEndTime();
            LocalTime endTime = parseTime(endTimeStr);

            if (endDate != null && endTime != null) {
                return LocalDateTime.of(endDate, endTime);
            } else if (endDate != null) {
                // Default to end of day if no specific end time
                return endDate.atTime(23, 59, 59);
            }
        } catch (Exception ignored) {}
        return null;
    }

    public LocalDate parseDate(String dateStr) {
        if (dateStr == null || dateStr.trim().isEmpty()) return LocalDate.now();
        dateStr = dateStr.trim().toLowerCase();
        if (dateStr.equals("today")) return LocalDate.now();
        if (dateStr.equals("tomorrow")) return LocalDate.now().plusDays(1);
        if (dateStr.equals("yesterday")) return LocalDate.now().minusDays(1);
        if (dateStr.equals("upcoming")) return LocalDate.now();

        try {
            return LocalDate.parse(dateStr, DateTimeFormatter.ISO_LOCAL_DATE);
        } catch (Exception ignored) {}

        try {
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("d MMMM yyyy", Locale.ENGLISH);
            return LocalDate.parse(dateStr, formatter);
        } catch (Exception ignored) {}

        try {
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("d MMM yyyy", Locale.ENGLISH);
            return LocalDate.parse(dateStr, formatter);
        } catch (Exception ignored) {}

        return LocalDate.now();
    }

    public LocalTime parseTime(String timeStr) {
        if (timeStr == null || timeStr.trim().isEmpty()) return LocalTime.of(0, 0);
        timeStr = timeStr.trim().toUpperCase();

        // If time is e.g. "10:00 AM - 12:00 PM", take first part
        if (timeStr.contains("-")) {
            timeStr = timeStr.split("-")[0].trim();
        }

        try {
            DateTimeFormatter dtf = new DateTimeFormatterBuilder()
                    .parseCaseInsensitive()
                    .appendPattern("h:mm a")
                    .toFormatter(Locale.ENGLISH);
            return LocalTime.parse(timeStr, dtf);
        } catch (Exception ignored) {}

        try {
            DateTimeFormatter dtf = new DateTimeFormatterBuilder()
                    .parseCaseInsensitive()
                    .appendPattern("hh:mm a")
                    .toFormatter(Locale.ENGLISH);
            return LocalTime.parse(timeStr, dtf);
        } catch (Exception ignored) {}

        try {
            return LocalTime.parse(timeStr, DateTimeFormatter.ofPattern("HH:mm"));
        } catch (Exception ignored) {}

        try {
            return LocalTime.parse(timeStr, DateTimeFormatter.ofPattern("H:mm"));
        } catch (Exception ignored) {}

        return LocalTime.of(0, 0);
    }
}
