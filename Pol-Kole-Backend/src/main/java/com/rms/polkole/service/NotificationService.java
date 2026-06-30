package com.rms.polkole.service;

public interface NotificationService {
    void sendEmailNotification(String recipient, String subject, String content);
}
