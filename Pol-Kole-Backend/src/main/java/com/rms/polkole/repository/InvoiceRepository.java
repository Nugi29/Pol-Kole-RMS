package com.rms.polkole.repository;

import com.rms.polkole.entity.InvoiceEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface InvoiceRepository extends JpaRepository<InvoiceEntity, Integer> {
    Optional<InvoiceEntity> findByInvoiceNumber(String invoiceNumber);
    Optional<InvoiceEntity> findByOrderId(Integer orderId);
    Optional<InvoiceEntity> findByHotelReservationId(Integer hotelReservationId);
    Optional<InvoiceEntity> findByTableReservationId(Integer tableReservationId);

    @Query("SELECT MAX(i.invoiceNumber) FROM InvoiceEntity i WHERE i.invoiceNumber LIKE :prefix")
    String findMaxInvoiceNumberByPrefix(@Param("prefix") String prefix);
}
