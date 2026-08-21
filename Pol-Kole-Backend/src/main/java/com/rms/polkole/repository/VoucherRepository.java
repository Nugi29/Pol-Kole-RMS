package com.rms.polkole.repository;

import com.rms.polkole.entity.VoucherEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface VoucherRepository extends JpaRepository<VoucherEntity, Integer> {
    Optional<VoucherEntity> findByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCase(String code);

    @Query("SELECT v FROM VoucherEntity v WHERE " +
           "(:search IS NULL OR :search = '' OR LOWER(v.code) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(v.description) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<VoucherEntity> searchVouchers(@Param("search") String search, Pageable pageable);

    @Query("SELECT v FROM VoucherEntity v WHERE v.isActive = true AND :today BETWEEN v.activeFrom AND v.activeTo")
    List<VoucherEntity> findActiveValidVouchers(@Param("today") LocalDate today);
}
