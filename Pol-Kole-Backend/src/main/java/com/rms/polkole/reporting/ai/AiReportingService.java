package com.rms.polkole.reporting.ai;

import com.rms.polkole.dto.reporting.AiChatRequest;
import com.rms.polkole.dto.reporting.AiChatResponse;

import java.time.LocalDate;

public interface AiReportingService {
    AiChatResponse chat(AiChatRequest request);
    byte[] generateAiReportPdf(LocalDate startDate, LocalDate endDate);
}
