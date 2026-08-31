package com.rms.polkole.repository;

import com.rms.polkole.entity.RestaurantSettingsEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RestaurantSettingsRepository extends JpaRepository<RestaurantSettingsEntity, Integer> {
    Optional<RestaurantSettingsEntity> findFirstByOrderByIdAsc();
}