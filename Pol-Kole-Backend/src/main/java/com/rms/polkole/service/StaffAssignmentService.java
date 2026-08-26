package com.rms.polkole.service;

import com.rms.polkole.dto.CallWaiterRequestDto;
import com.rms.polkole.dto.CallWaiterResponseDto;
import com.rms.polkole.dto.DailyStaffAssignmentDto;
import com.rms.polkole.entity.UserEntity;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface StaffAssignmentService {
    List<DailyStaffAssignmentDto> getDailyAssignments(LocalDate date);
    List<DailyStaffAssignmentDto> getAssignmentsForUser(LocalDate date, Integer userId);
    List<DailyStaffAssignmentDto> autoAssignActiveWaiters(LocalDate date);
    List<DailyStaffAssignmentDto> autoAssignActiveChefs(LocalDate date);
    List<DailyStaffAssignmentDto> saveCustomAssignments(LocalDate date, List<DailyStaffAssignmentDto> dtos);
    Optional<UserEntity> findResponsibleWaiterForTable(LocalDate date, Integer tableId);
    Optional<UserEntity> findResponsibleWaiterForRoom(LocalDate date, Integer roomId);
    Optional<UserEntity> findResponsibleChefForCategory(LocalDate date, Integer categoryId);
    CallWaiterResponseDto handleCallWaiterRequest(CallWaiterRequestDto request);
}
