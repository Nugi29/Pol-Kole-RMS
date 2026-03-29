package com.rms.polkole.repository;

import com.rms.polkole.entity.Userrole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserroleRepository extends JpaRepository<Userrole, Integer> {
    Optional<Userrole> findByNameIgnoreCase(String name);
}
