package com.rms.polkole.repository;

import com.rms.polkole.entity.MenuCategoryEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface MenuCategoryRepository extends JpaRepository<MenuCategoryEntity, Integer> {
    Optional<MenuCategoryEntity> findByName(String name);
}
