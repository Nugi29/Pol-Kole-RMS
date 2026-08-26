package com.rms.polkole.repository;

import com.rms.polkole.entity.DailyStaffAssignmentEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface DailyStaffAssignmentRepository extends JpaRepository<DailyStaffAssignmentEntity, Long> {
    List<DailyStaffAssignmentEntity> findByAssignmentDateAndIsActiveTrue(LocalDate assignmentDate);

    List<DailyStaffAssignmentEntity> findByAssignmentDateAndUserIdAndIsActiveTrue(LocalDate assignmentDate, Integer userId);

    List<DailyStaffAssignmentEntity> findByAssignmentDateAndRoleTypeIgnoreCaseAndIsActiveTrue(LocalDate assignmentDate, String roleType);

    Optional<DailyStaffAssignmentEntity> findByAssignmentDateAndTableIdAndIsActiveTrue(LocalDate assignmentDate, Integer tableId);

    Optional<DailyStaffAssignmentEntity> findByAssignmentDateAndRoomIdAndIsActiveTrue(LocalDate assignmentDate, Integer roomId);

    @Query("SELECT d FROM DailyStaffAssignmentEntity d WHERE d.assignmentDate = :date AND d.assignmentType = 'TAKEAWAY_ZONE' AND d.isActive = true")
    List<DailyStaffAssignmentEntity> findTakeawayAssignmentsByDate(@Param("date") LocalDate date);

    void deleteByAssignmentDate(LocalDate assignmentDate);
}
