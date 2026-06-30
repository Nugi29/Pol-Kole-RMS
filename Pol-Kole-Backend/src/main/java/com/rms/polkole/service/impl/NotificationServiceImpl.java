package com.rms.polkole.service.impl;

import com.rms.polkole.entity.NotificationEntity;
import com.rms.polkole.repository.NotificationRepository;
import com.rms.polkole.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import java.time.Instant;

@Service
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;

    @Async
    @Override
    public void sendEmailNotification(String recipient, String subject, String content) {
        System.out.println("----------------------------------------");
        System.out.println("ASYNC NOTIFICATION QUEUE [EMAIL]");
        System.out.println("Recipient : " + recipient);
        System.out.println("Subject   : " + subject);
        System.out.println("Content   :\n" + content);
        System.out.println("----------------------------------------");

        NotificationEntity notification = NotificationEntity.builder()
                .recipient(recipient)
                .subject(subject)
                .content(content)
                .type("EMAIL")
                .status("SENT")
                .sentAt(Instant.now())
                .build();

        notificationRepository.save(notification);
    }
}
