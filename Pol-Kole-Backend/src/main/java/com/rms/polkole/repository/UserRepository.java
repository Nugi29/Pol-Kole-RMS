package com.rms.polkole.repository;

import com.rms.polkole.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<UserEntity, Integer> {
    Optional<UserEntity> findByEmail(String email);

    @Query("SELECT u FROM UserEntity u WHERE LOWER(u.role.name) = LOWER(:roleName)")
    List<UserEntity> findByRoleNameIgnoreCase(@Param("roleName") String roleName);

    @Query("SELECT u FROM UserEntity u WHERE LOWER(u.role.name) IN :roleNames")
    List<UserEntity> findByRoleNameInIgnoreCase(@Param("roleNames") List<String> roleNames);
}
