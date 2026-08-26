package com.rms.polkole.repository;

import com.rms.polkole.entity.AttendanceEntity;
import com.rms.polkole.entity.AttendanceStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface AttendanceRepository extends JpaRepository<AttendanceEntity, Long> {
    Optional<AttendanceEntity> findByUserIdAndAttendanceDate(Integer userId, LocalDate attendanceDate);

    List<AttendanceEntity> findByAttendanceDate(LocalDate attendanceDate);

    List<AttendanceEntity> findByAttendanceDateBetweenOrderByAttendanceDateDesc(LocalDate startDate, LocalDate endDate);

    List<AttendanceEntity> findByUserIdOrderByAttendanceDateDesc(Integer userId);

    @Query("SELECT a FROM AttendanceEntity a WHERE a.attendanceDate = :date AND a.status IN :statuses")
    List<AttendanceEntity> findByAttendanceDateAndStatusIn(@Param("date") LocalDate date, @Param("statuses") List<AttendanceStatus> statuses);

    @Query("SELECT a FROM AttendanceEntity a WHERE a.attendanceDate = :date AND LOWER(a.user.role.name) = LOWER(:roleName) AND a.status IN :statuses")
    List<AttendanceEntity> findActiveStaffByDateAndRole(@Param("date") LocalDate date, @Param("roleName") String roleName, @Param("statuses") List<AttendanceStatus> statuses);
}
