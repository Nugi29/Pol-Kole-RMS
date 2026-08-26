package com.rms.polkole.service.impl;

import com.rms.polkole.dto.*;
import com.rms.polkole.entity.*;
import com.rms.polkole.repository.*;
import com.rms.polkole.service.AttendanceService;
import com.rms.polkole.service.StaffAssignmentService;
import com.rms.polkole.service.StaffNotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class StaffAssignmentServiceImpl implements StaffAssignmentService {

    private final DailyStaffAssignmentRepository assignmentRepository;
    private final RestaurantTableRepository tableRepository;
    private final RoomRepository roomRepository;
    private final UserRepository userRepository;
    private final AttendanceService attendanceService;
    private final StaffNotificationService notificationService;

    @Override
    @Transactional(readOnly = true)
    public List<DailyStaffAssignmentDto> getDailyAssignments(LocalDate date) {
        LocalDate queryDate = date != null ? date : LocalDate.now();
        return assignmentRepository.findByAssignmentDateAndIsActiveTrue(queryDate).stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<DailyStaffAssignmentDto> getAssignmentsForUser(LocalDate date, Integer userId) {
        LocalDate queryDate = date != null ? date : LocalDate.now();
        return assignmentRepository.findByAssignmentDateAndUserIdAndIsActiveTrue(queryDate, userId).stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public List<DailyStaffAssignmentDto> autoAssignActiveWaiters(LocalDate date) {
        LocalDate assignmentDate = date != null ? date : LocalDate.now();

        // 1. Get today's active waiters (PRESENT or LATE)
        ActiveStaffSummaryDto summary = attendanceService.getActiveStaffSummary(assignmentDate);
        List<AttendanceDto> activeWaiters = summary.getActiveWaiters();

        if (activeWaiters.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No active waiters found for " + assignmentDate + ". Please mark attendance first.");
        }

        // 2. Fetch all tables and rooms
        List<RestaurantTableEntity> tables = tableRepository.findAll();
        List<RoomEntity> rooms = roomRepository.findAll();

        // 3. Clear existing waiter assignments for this date to perform clean balanced distribution
        List<DailyStaffAssignmentEntity> existing = assignmentRepository.findByAssignmentDateAndRoleTypeIgnoreCaseAndIsActiveTrue(assignmentDate, "WAITER");
        assignmentRepository.deleteAll(existing);

        List<DailyStaffAssignmentEntity> newAssignments = new ArrayList<>();
        int waiterCount = activeWaiters.size();

        // Distribute tables round-robin
        for (int i = 0; i < tables.size(); i++) {
            RestaurantTableEntity table = tables.get(i);
            AttendanceDto assignedWaiter = activeWaiters.get(i % waiterCount);
            UserEntity user = userRepository.findById(assignedWaiter.getUserId()).orElse(null);

            if (user != null) {
                newAssignments.add(DailyStaffAssignmentEntity.builder()
                        .assignmentDate(assignmentDate)
                        .user(user)
                        .roleType("WAITER")
                        .assignmentType("TABLE")
                        .table(table)
                        .zoneOrStation("Dining Floor")
                        .isActive(true)
                        .build());
            }
        }

        // Distribute rooms round-robin (offsetting by 1 to balance load if multiple staff)
        for (int i = 0; i < rooms.size(); i++) {
            RoomEntity room = rooms.get(i);
            AttendanceDto assignedWaiter = activeWaiters.get((i + 1) % waiterCount);
            UserEntity user = userRepository.findById(assignedWaiter.getUserId()).orElse(null);

            if (user != null) {
                newAssignments.add(DailyStaffAssignmentEntity.builder()
                        .assignmentDate(assignmentDate)
                        .user(user)
                        .roleType("WAITER")
                        .assignmentType("ROOM")
                        .room(room)
                        .zoneOrStation("Guest Rooms")
                        .isActive(true)
                        .build());
            }
        }

        // Assign takeaway zone
        AttendanceDto primaryTakeaway = activeWaiters.get(0);
        UserEntity takeawayStaff = userRepository.findById(primaryTakeaway.getUserId()).orElse(null);
        if (takeawayStaff != null) {
            newAssignments.add(DailyStaffAssignmentEntity.builder()
                    .assignmentDate(assignmentDate)
                    .user(takeawayStaff)
                    .roleType("WAITER")
                    .assignmentType("TAKEAWAY_ZONE")
                    .zoneOrStation("Takeaway & Delivery Counter")
                    .isActive(true)
                    .build());
        }

        newAssignments = assignmentRepository.saveAll(newAssignments);
        log.info("Auto-assigned {} tables and rooms among {} active waiters for date {}", tables.size() + rooms.size(), waiterCount, assignmentDate);

        return newAssignments.stream().map(this::mapToDto).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public List<DailyStaffAssignmentDto> autoAssignActiveChefs(LocalDate date) {
        LocalDate assignmentDate = date != null ? date : LocalDate.now();

        ActiveStaffSummaryDto summary = attendanceService.getActiveStaffSummary(assignmentDate);
        List<AttendanceDto> activeChefs = summary.getActiveChefs();

        if (activeChefs.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No active chefs found for " + assignmentDate + ". Please mark attendance first.");
        }

        List<DailyStaffAssignmentEntity> existing = assignmentRepository.findByAssignmentDateAndRoleTypeIgnoreCaseAndIsActiveTrue(assignmentDate, "CHEF");
        assignmentRepository.deleteAll(existing);

        List<String> stations = List.of("Main Hot Kitchen & Curry", "Grill & Kottu Station", "Seafood & Appitizers", "Beverage & Dessert Station");
        List<DailyStaffAssignmentEntity> newAssignments = new ArrayList<>();
        int chefCount = activeChefs.size();

        for (int i = 0; i < stations.size(); i++) {
            String station = stations.get(i);
            AttendanceDto assignedChef = activeChefs.get(i % chefCount);
            UserEntity user = userRepository.findById(assignedChef.getUserId()).orElse(null);

            if (user != null) {
                newAssignments.add(DailyStaffAssignmentEntity.builder()
                        .assignmentDate(assignmentDate)
                        .user(user)
                        .roleType("CHEF")
                        .assignmentType("KITCHEN_STATION")
                        .zoneOrStation(station)
                        .isActive(true)
                        .build());
            }
        }

        newAssignments = assignmentRepository.saveAll(newAssignments);
        log.info("Auto-assigned {} kitchen stations among {} active chefs for date {}", stations.size(), chefCount, assignmentDate);

        return newAssignments.stream().map(this::mapToDto).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public List<DailyStaffAssignmentDto> saveCustomAssignments(LocalDate date, List<DailyStaffAssignmentDto> dtos) {
        LocalDate assignmentDate = date != null ? date : LocalDate.now();

        List<DailyStaffAssignmentEntity> entities = new ArrayList<>();
        for (DailyStaffAssignmentDto dto : dtos) {
            UserEntity user = userRepository.findById(dto.getUserId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found with ID: " + dto.getUserId()));

            RestaurantTableEntity table = null;
            if (dto.getTableId() != null) {
                table = tableRepository.findById(dto.getTableId()).orElse(null);
            }

            RoomEntity room = null;
            if (dto.getRoomId() != null) {
                room = roomRepository.findById(dto.getRoomId()).orElse(null);
            }

            DailyStaffAssignmentEntity entity = DailyStaffAssignmentEntity.builder()
                    .assignmentDate(assignmentDate)
                    .user(user)
                    .roleType(dto.getRoleType() != null ? dto.getRoleType() : "WAITER")
                    .assignmentType(dto.getAssignmentType() != null ? dto.getAssignmentType() : "TABLE")
                    .table(table)
                    .room(room)
                    .zoneOrStation(dto.getZoneOrStation())
                    .isActive(true)
                    .notes(dto.getNotes())
                    .build();

            entities.add(entity);
        }

        // Clean existing for this date
        assignmentRepository.deleteByAssignmentDate(assignmentDate);
        entities = assignmentRepository.saveAll(entities);
        return entities.stream().map(this::mapToDto).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<UserEntity> findResponsibleWaiterForTable(LocalDate date, Integer tableId) {
        LocalDate queryDate = date != null ? date : LocalDate.now();
        return assignmentRepository.findByAssignmentDateAndTableIdAndIsActiveTrue(queryDate, tableId)
                .map(DailyStaffAssignmentEntity::getUser);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<UserEntity> findResponsibleWaiterForRoom(LocalDate date, Integer roomId) {
        LocalDate queryDate = date != null ? date : LocalDate.now();
        return assignmentRepository.findByAssignmentDateAndRoomIdAndIsActiveTrue(queryDate, roomId)
                .map(DailyStaffAssignmentEntity::getUser);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<UserEntity> findResponsibleChefForCategory(LocalDate date, Integer categoryId) {
        LocalDate queryDate = date != null ? date : LocalDate.now();
        List<DailyStaffAssignmentEntity> chefs = assignmentRepository.findByAssignmentDateAndRoleTypeIgnoreCaseAndIsActiveTrue(queryDate, "CHEF");
        if (chefs.isEmpty()) return Optional.empty();
        // Return first active chef or round-robin
        return Optional.of(chefs.get(0).getUser());
    }

    @Override
    @Transactional
    public CallWaiterResponseDto handleCallWaiterRequest(CallWaiterRequestDto req) {
        LocalDate today = LocalDate.now();
        UserEntity assignedStaff = null;
        String locationLabel = req.getLocationNumber() != null ? req.getLocationNumber() : "General Area";

        // 1. Look up today's assignment for Table or Room
        if ("TABLE".equalsIgnoreCase(req.getLocationType()) && req.getLocationId() != null) {
            assignedStaff = findResponsibleWaiterForTable(today, req.getLocationId()).orElse(null);
            if (assignedStaff == null && req.getLocationNumber() != null) {
                // Try table lookup by number
                tableRepository.findByTableNumber(req.getLocationNumber())
                        .flatMap(t -> findResponsibleWaiterForTable(today, t.getId()))
                        .ifPresent(u -> {});
            }
        } else if ("ROOM".equalsIgnoreCase(req.getLocationType()) && req.getLocationId() != null) {
            assignedStaff = findResponsibleWaiterForRoom(today, req.getLocationId()).orElse(null);
        }

        // If no explicit table/room assignment was found today, pick an active waiter
        if (assignedStaff == null) {
            ActiveStaffSummaryDto summary = attendanceService.getActiveStaffSummary(today);
            if (!summary.getActiveWaiters().isEmpty()) {
                Integer activeId = summary.getActiveWaiters().get(0).getUserId();
                assignedStaff = userRepository.findById(activeId).orElse(null);
            }
        }

        boolean isFallback = false;
        String fallbackReason = null;
        UserEntity targetRecipient = assignedStaff;

        // 2. Check online presence of the assigned staff
        if (assignedStaff != null) {
            boolean isOnline = "ONLINE".equalsIgnoreCase(assignedStaff.getOnlineStatus());
            if (!isOnline) {
                // CONTROLLED FALLBACK:
                // Staff is PRESENT in attendance but OFFLINE in web app.
                // Do NOT mark absent. Notify manager/partner as fallback.
                isFallback = true;
                fallbackReason = "Assigned waiter " + assignedStaff.getName() + " is currently offline. Alert routed to Manager team.";

                // Still record notification for the assigned waiter so they see it upon reconnect
                StaffNotificationDto waiterNotif = StaffNotificationDto.builder()
                        .recipientId(assignedStaff.getId())
                        .type("CALL_WAITER")
                        .title("Guest Assistance Request - " + locationLabel)
                        .message(req.getMessage() != null ? req.getMessage() : "Customer called waiter at " + locationLabel)
                        .targetType(req.getLocationType())
                        .targetId(req.getLocationId())
                        .targetLabel(locationLabel)
                        .priority("HIGH")
                        .build();
                notificationService.sendTargetedNotification(waiterNotif);

                // Notify Managers via broadcast
                StaffNotificationDto managerAlert = StaffNotificationDto.builder()
                        .type("WAITER_OFFLINE")
                        .title("⚠️ Waiter Offline Alert - " + locationLabel)
                        .message("Customer at " + locationLabel + " called " + assignedStaff.getName() + ", who is currently OFFLINE. Please attend to this table.")
                        .targetType(req.getLocationType())
                        .targetId(req.getLocationId())
                        .targetLabel(locationLabel)
                        .priority("URGENT")
                        .isFallback(true)
                        .fallbackNote(fallbackReason)
                        .build();
                notificationService.broadcastToRole("Manager", managerAlert);
                notificationService.broadcastToRole("Admin", managerAlert);

                return CallWaiterResponseDto.builder()
                        .success(true)
                        .message("Assistance requested for " + locationLabel + ". Staff is attending shortly.")
                        .assignedStaffId(assignedStaff.getId())
                        .assignedStaffName(assignedStaff.getName())
                        .assignedStaffRole("Waiter (Offline - Manager Alerted)")
                        .isFallback(true)
                        .fallbackReason(fallbackReason)
                        .build();
            }
        }

        // If online or general routing:
        if (targetRecipient != null) {
            StaffNotificationDto notif = StaffNotificationDto.builder()
                    .recipientId(targetRecipient.getId())
                    .type("CALL_WAITER")
                    .title("Guest Assistance Request - " + locationLabel)
                    .message(req.getMessage() != null ? req.getMessage() : "Customer called waiter at " + locationLabel)
                    .targetType(req.getLocationType())
                    .targetId(req.getLocationId())
                    .targetLabel(locationLabel)
                    .priority("HIGH")
                    .build();

            StaffNotificationDto saved = notificationService.sendTargetedNotification(notif);

            return CallWaiterResponseDto.builder()
                    .success(true)
                    .message("Waiter " + targetRecipient.getName() + " has been notified and is coming to " + locationLabel)
                    .assignedStaffId(targetRecipient.getId())
                    .assignedStaffName(targetRecipient.getName())
                    .assignedStaffRole("Waiter")
                    .isFallback(false)
                    .notificationId(saved.getId())
                    .build();
        } else {
            // No staff available at all -> notify manager
            StaffNotificationDto alert = StaffNotificationDto.builder()
                    .type("NO_AVAILABLE_WAITER")
                    .title("⚠️ Unassigned Request - " + locationLabel)
                    .message("Customer requested assistance at " + locationLabel + " but no active waiter is available today.")
                    .targetType(req.getLocationType())
                    .targetId(req.getLocationId())
                    .targetLabel(locationLabel)
                    .priority("URGENT")
                    .isFallback(true)
                    .fallbackNote("No active staff available")
                    .build();
            notificationService.broadcastToRole("Manager", alert);

            return CallWaiterResponseDto.builder()
                    .success(true)
                    .message("Request received for " + locationLabel + ". A team member is on the way.")
                    .isFallback(true)
                    .fallbackReason("No active waiter assigned")
                    .build();
        }
    }

    private DailyStaffAssignmentDto mapToDto(DailyStaffAssignmentEntity entity) {
        UserEntity u = entity.getUser();
        RestaurantTableEntity t = entity.getTable();
        RoomEntity r = entity.getRoom();

        return DailyStaffAssignmentDto.builder()
                .id(entity.getId())
                .assignmentDate(entity.getAssignmentDate())
                .userId(u != null ? u.getId() : null)
                .userName(u != null ? u.getName() : null)
                .userEmail(u != null ? u.getEmail() : null)
                .roleType(entity.getRoleType())
                .assignmentType(entity.getAssignmentType())
                .tableId(t != null ? t.getId() : null)
                .tableNumber(t != null ? t.getTableNumber() : null)
                .tableLocation(t != null && t.getLocation() != null ? t.getLocation().getName() : null)
                .roomId(r != null ? r.getId() : null)
                .roomNumber(r != null ? r.getRoomNumber() : null)
                .roomType(r != null && r.getRoomType() != null ? r.getRoomType().getName() : null)
                .zoneOrStation(entity.getZoneOrStation())
                .isActive(entity.isActive())
                .notes(entity.getNotes())
                .onlineStatus(u != null && u.getOnlineStatus() != null ? u.getOnlineStatus() : "OFFLINE")
                .lastSeen(u != null ? u.getLastSeen() : null)
                .build();
    }
}
