package com.rms.polkole.dto.reporting;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiReportAnalysisDto {
    private String summary;
    private String topSellingItem;
    private String leastSellingItem;
    private Double revenueChangePercent;
    private String recommendation;
    private String periodComparison;
}
