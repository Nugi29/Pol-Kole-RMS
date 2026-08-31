package com.rms.polkole.reporting.ai;

import com.rms.polkole.dto.ApiResponse;
import com.rms.polkole.dto.reporting.AiChatRequest;
import com.rms.polkole.dto.reporting.AiChatResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/ai/reports")
@RequiredArgsConstructor
@CrossOrigin
public class AiReportController {

    private final AiReportingService aiReportingService;

    @PostMapping("/chat")
    public ResponseEntity<ApiResponse<AiChatResponse>> chat(@RequestBody AiChatRequest request) {
        AiChatResponse response = aiReportingService.chat(request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/pdf")
    public ResponseEntity<byte[]> downloadAiReportPdf(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {

        byte[] pdfBytes = aiReportingService.generateAiReportPdf(startDate, endDate);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        String filename = "PolKole_AI_Executive_Report_" + LocalDate.now() + ".pdf";
        headers.setContentDispositionFormData("attachment", filename);

        return ResponseEntity.ok().headers(headers).body(pdfBytes);
    }
}
