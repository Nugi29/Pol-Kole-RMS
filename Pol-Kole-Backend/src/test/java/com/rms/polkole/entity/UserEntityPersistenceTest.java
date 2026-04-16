package com.rms.polkole.entity;

import com.rms.polkole.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:polkole_test;MODE=MySQL;DB_CLOSE_DELAY=-1;DATABASE_TO_UPPER=false",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.datasource.driverClassName=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
@Transactional
class UserEntityPersistenceTest {

    @Autowired
    private UserRepository userRepository;

    @Test
    void saveSetsPhoneAndAuditTimestamps() {
        UserEntity user = UserEntity.builder()
                .name("Test User")
                .email("audit-test@example.com")
                .password("raw-password")
                .phone("0771234567")
                .build();

        UserEntity saved = userRepository.saveAndFlush(user);

        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getPhone()).isEqualTo("0771234567");
        assertThat(saved.getCreatedAt()).isNotNull();
        assertThat(saved.getUpdatedAt()).isNotNull();
    }

    @Test
    void updateRefreshesUpdatedAtAndKeepsCreatedAt() throws InterruptedException {
        UserEntity user = UserEntity.builder()
                .name("Test User")
                .email("audit-update@example.com")
                .password("raw-password")
                .phone("0700000000")
                .build();

        UserEntity saved = userRepository.saveAndFlush(user);
        Instant createdAt = saved.getCreatedAt();
        Instant originalUpdatedAt = saved.getUpdatedAt();

        Thread.sleep(5);

        saved.setPhone("0711111111");
        UserEntity updated = userRepository.saveAndFlush(saved);

        assertThat(updated.getPhone()).isEqualTo("0711111111");
        assertThat(updated.getCreatedAt()).isEqualTo(createdAt);
        assertThat(updated.getUpdatedAt()).isAfter(originalUpdatedAt);
    }
}


