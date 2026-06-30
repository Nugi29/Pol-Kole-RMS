package com.rms.polkole.repository;

import com.rms.polkole.entity.CustomerEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface CustomerRepository extends JpaRepository<CustomerEntity, Integer> {
    Optional<CustomerEntity> findByNicPassport(String nicPassport);
    Optional<CustomerEntity> findByEmail(String email);

    @Query("SELECT c FROM CustomerEntity c WHERE c.isDeleted = false " +
           "AND (:search IS NULL OR LOWER(c.name) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR LOWER(c.nicPassport) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR c.phone LIKE CONCAT('%', :search, '%'))")
    Page<CustomerEntity> searchCustomers(@Param("search") String search, Pageable pageable);
}
