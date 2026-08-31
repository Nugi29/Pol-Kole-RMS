package com.rms.polkole.dto.reporting;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiChatResponse {
    private String message;
    private String type; // ANSWER, REPORT, PDF, ERROR
    private String reportUrl;
    private String conversationId;
    private Map<String, Object> metadata;
}
