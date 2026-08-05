package com.rms.polkole.repository;

import com.rms.polkole.entity.InvoiceEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface InvoiceRepository extends JpaRepository<InvoiceEntity, Integer> {
    Optional<InvoiceEntity> findByInvoiceNumber(String invoiceNumber);
    Optional<InvoiceEntity> findByOrderId(Integer orderId);
    Optional<InvoiceEntity> findByHotelReservationId(Integer hotelReservationId);
    Optional<InvoiceEntity> findByTableReservationId(Integer tableReservationId);
}
