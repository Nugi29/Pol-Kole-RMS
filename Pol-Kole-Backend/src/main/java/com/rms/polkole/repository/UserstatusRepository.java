package com.rms.polkole.repository;

import com.rms.polkole.entity.Userrole;
import com.rms.polkole.entity.Userstatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserstatusRepository extends JpaRepository<Userstatus, Integer> {
    Optional<Userstatus> findByNameIgnoreCase(String name);
}
