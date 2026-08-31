package com.rms.polkole.reporting.ai;

import com.rms.polkole.dto.reporting.*;
import com.rms.polkole.service.ReportService;
import com.rms.polkole.util.DateRangeResolver;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiReportingServiceImpl implements AiReportingService {

    private final ChatClient.Builder chatClientBuilder;
    private final ReportTools reportTools;
    private final ReportService reportService;

    @Value("${GROQ_API_KEY:${spring.ai.openai.api-key:}}")
    private String apiKey;

    // Simple in-memory conversation history store
    private final Map<String, List<Message>> conversationStore = new ConcurrentHashMap<>();

    private static final String SYSTEM_PROMPT = """
            You are the POL-KOLE RMS Intelligent Executive & Operational Assistant.
            You serve restaurant managers, cashiers, and hotel administrators of POL-KOLE Resort & Restaurant.
            
            CORE CAPABILITIES & TONE:
            1. Day-to-Day Friendly Conversation:
               - You can engage naturally in day-to-day conversation, greetings ('Hi', 'Hello', 'Good morning', 'How are you?'), and pleasantries.
               - Be warm, professional, respectful, concise, and executive in tone.
               - If asked about who you are or what you can do, introduce yourself as the POL-KOLE AI Assistant and explain that you can query live sales, item rankings, table/room analytics, and provide hospitality insights.
            
            2. Restaurant & Hospitality Knowledge:
               - You can answer general day-to-day questions about restaurant operations, food waste reduction, table turnover enhancement, menu engineering strategies, upselling techniques, and guest satisfaction tips.
            
            3. Live RMS Data Queries:
               - Whenever the user asks about specific business numbers, revenue, least/top selling menu items, table performance, hotel rooms, orders, or date periods, YOU MUST USE the available reporting tools to fetch real-time data from the database.
               - NEVER invent, hallucinate, or guess financial, order, or inventory numbers.
               - If a tool returns no data, inform the user clearly that no records exist for that period.
               - Format all currency figures in Sri Lankan Rupees (e.g. 'Rs. 4,850,000.00' or 'Rs. 1,200.00').
            
            4. Executive Reporting & PDF:
               - When the user asks to generate, export, or download an enterprise or sales report PDF, provide a clear executive summary and inform them that their JasperReports PDF report is ready for download.
            """;

    @Override
    public AiChatResponse chat(AiChatRequest request) {
        String userQuery = request != null && request.getMessage() != null ? request.getMessage().trim() : "";
        String convId = request != null && request.getConversationId() != null && !request.getConversationId().isBlank()
                ? request.getConversationId() : UUID.randomUUID().toString();

        if (userQuery.isEmpty()) {
            return AiChatResponse.builder()
                    .message("Hello! How can I assist you today? You can ask me day-to-day restaurant questions or query live POL-KOLE business reports.")
                    .type("ANSWER")
                    .conversationId(convId)
                    .build();
        }

        String q = userQuery.toLowerCase().trim();

        // 1. Instant response for quick day-to-day greetings (instant without waiting)
        if (q.matches("^(hi|hello|hey|good morning|good afternoon|good evening|howdy)[!?. ]*$")) {
            return AiChatResponse.builder()
                    .message("Hello! Hope you are having a productive day at POL-KOLE. I am here to help with daily operations, sales analytics, menu item trends, or table occupancy. What would you like to check today?")
                    .type("ANSWER")
                    .conversationId(convId)
                    .build();
        }

        // 2. Check if API key is unconfigured or a dummy placeholder
        if (apiKey == null || apiKey.isBlank() || apiKey.contains("placeholder") || apiKey.contains("demo-key")) {
            log.info("Groq API key not configured or placeholder detected. Utilizing enhanced conversational fallback.");
            return handleFallbackAnswer(userQuery, convId);
        }

        try {
            List<Message> history = conversationStore.computeIfAbsent(convId, k -> new ArrayList<>());

            // Keep conversation history bounded to last 10 messages
            if (history.size() > 10) {
                history = new ArrayList<>(history.subList(history.size() - 10, history.size()));
                conversationStore.put(convId, history);
            }

            ChatClient chatClient = chatClientBuilder
                    .defaultSystem(SYSTEM_PROMPT)
                    .build();

            // Execute chat client with tool calling enabled
            String aiAnswer = chatClient.prompt()
                    .messages(history)
                    .user(userQuery)
                    .tools(reportTools)
                    .call()
                    .content();

            if (aiAnswer == null || aiAnswer.isBlank()) {
                aiAnswer = "I processed your inquiry, but could not generate specific text. How else may I assist you?";
            }

            // Update conversation history
            history.add(new UserMessage(userQuery));
            history.add(new AssistantMessage(aiAnswer));

            // Check if user requested a report PDF or if query/answer is data-driven
            boolean requestedReport = isReportGenerationRequest(userQuery);
            boolean isData = isDataQuery(userQuery, aiAnswer);
            String responseType = (requestedReport || isData) ? "REPORT" : "ANSWER";

            DateRangeResolver.DateRange dr = DateRangeResolver.resolve(userQuery);
            String reportUrl = "/api/ai/reports/pdf?startDate=" + dr.getStartDate() + "&endDate=" + dr.getEndDate();
            Map<String, Object> metadata = new HashMap<>();
            metadata.put("startDate", dr.getStartDate().toString());
            metadata.put("endDate", dr.getEndDate().toString());
            metadata.put("periodLabel", dr.getLabel());

            return AiChatResponse.builder()
                    .message(aiAnswer)
                    .type(responseType)
                    .reportUrl(reportUrl)
                    .conversationId(convId)
                    .metadata(metadata)
                    .build();

        } catch (Exception e) {
            log.error("Error invoking Spring AI ChatClient: {}", e.getMessage(), e);
            return handleFallbackAnswer(userQuery, convId);
        }
    }

    @Override
    public byte[] generateAiReportPdf(LocalDate startDate, LocalDate endDate) {
        if (startDate == null) startDate = LocalDate.now().minusDays(30);
        if (endDate == null) endDate = LocalDate.now();

        SalesReportDto sales = reportService.getSalesReport(startDate, endDate);
        String topItem = (sales.getTopSellingItems() != null && !sales.getTopSellingItems().isEmpty())
                ? sales.getTopSellingItems().get(0).getItemName() : "N/A";
        String leastItem = (sales.getLeastSellingItems() != null && !sales.getLeastSellingItems().isEmpty())
                ? sales.getLeastSellingItems().get(0).getItemName() : "N/A";

        AiReportAnalysisDto analysis = AiReportAnalysisDto.builder()
                .summary("Overall Net Revenue reached Rs. " + String.format("%,.2f", sales.getNetRevenue()) + " across " + sales.getTotalOrders() + " total orders for period " + sales.getPeriod() + ".")
                .periodComparison("Dine-In contributed Rs. " + String.format("%,.2f", sales.getDineInRevenue()) + ", while Takeaway generated Rs. " + String.format("%,.2f", sales.getTakeawayRevenue()) + ".")
                .topSellingItem(topItem)
                .leastSellingItem(leastItem)
                .revenueChangePercent(0.0)
                .recommendation("Promote low-velocity items such as " + leastItem + " with combo pairings or lunch promotions.")
                .build();

        return reportService.generateAiReportPdf("ai-sales", startDate, endDate, analysis);
    }

    private boolean isReportGenerationRequest(String query) {
        String q = query.toLowerCase();
        return (q.contains("generate") || q.contains("download") || q.contains("export"))
                && (q.contains("report") || q.contains("pdf"));
    }

    private boolean isDataQuery(String query, String answer) {
        String q = query.toLowerCase();
        String a = answer != null ? answer.toLowerCase() : "";
        return a.contains("|") || a.contains("rs.") || a.contains("revenue") || a.contains("sales") 
                || q.contains("month") || q.contains("today") || q.contains("yesterday") 
                || q.contains("week") || q.contains("year") || q.contains("sales") 
                || q.contains("revenue") || q.contains("item") || q.contains("kottu") 
                || q.contains("table") || q.contains("order") || q.contains("beverage");
    }

    private AiChatResponse handleFallbackAnswer(String query, String convId) {
        String q = query.toLowerCase().trim();

        // 1. Day-to-day greetings
        if (q.matches("^(hi|hello|hey|greetings|good morning|good afternoon|good evening|howdy).*")) {
            return AiChatResponse.builder()
                    .message("Hello! Hope you are having a productive day at POL-KOLE. I am here to answer your daily questions, assist with restaurant operations, or analyze sales, menu performance, and occupancy figures. How can I help you right now?")
                    .type("ANSWER")
                    .conversationId(convId)
                    .build();
        }

        // 2. How are you / Status check
        if (q.contains("how are you") || q.contains("how r u") || q.contains("how do you do")) {
            return AiChatResponse.builder()
                    .message("I am doing great and ready to assist! All POL-KOLE RMS reporting modules and operational tracking are active. What would you like to review or discuss today?")
                    .type("ANSWER")
                    .conversationId(convId)
                    .build();
        }

        // 3. Identity and Capabilities
        if (q.contains("who are you") || q.contains("what can you do") || q.contains("what are your capabilities") || q.contains("help")) {
            return AiChatResponse.builder()
                    .message("I am the **POL-KOLE RMS AI Assistant**! Here is what I can do for you:\n\n" +
                            "• **Day-to-Day Inquiries:** Answer general questions about restaurant operations, food waste reduction, and table turnover strategies.\n" +
                            "• **Sales & Revenue:** Provide real-time daily, weekly, or monthly revenues with Dine-In vs. Takeaway breakdowns.\n" +
                            "• **Menu Item Analytics:** Identify top-selling and least-selling dishes or beverages.\n" +
                            "• **Table & Room Performance:** Report on dining table revenue and hotel room yield.\n" +
                            "• **JasperReports PDF:** Automatically compile enterprise PDF reports with AI managerial insights.\n\n" +
                            "Try asking me: *'What is our least selling drink this month?'* or *'How can we increase takeaway sales?'*")
                    .type("ANSWER")
                    .conversationId(convId)
                    .build();
        }

        // 4. Gratitude
        if (q.contains("thank you") || q.contains("thanks") || q.contains("great job") || q.contains("awesome")) {
            return AiChatResponse.builder()
                    .message("You're very welcome! Always glad to assist our POL-KOLE team. Let me know if you need any more insights or daily operational assistance.")
                    .type("ANSWER")
                    .conversationId(convId)
                    .build();
        }

        // 5. Day-to-day hospitality operational advice
        if (q.contains("increase") && (q.contains("sales") || q.contains("revenue") || q.contains("takeaway"))) {
            return AiChatResponse.builder()
                    .message("Here are 3 actionable tactics to increase POL-KOLE sales today:\n\n" +
                            "1. **Combo Pairings:** Pair high-margin Ceylon teas or fresh fruit juices with quick rice & curry boxes during lunch rush.\n" +
                            "2. **Table Turnover:** Ensure quick bill settlement during peak dining hours so waiting guests can be seated faster.\n" +
                            "3. **Takeaway Loyalty:** Introduce promotional loyalty points for takeaway orders during off-peak dinner hours.\n\n" +
                            "Would you like me to check which menu items have the lowest sales so you can target them?")
                    .type("ANSWER")
                    .conversationId(convId)
                    .build();
        }

        if (q.contains("waste") || q.contains("food waste") || q.contains("spoilage")) {
            return AiChatResponse.builder()
                    .message("Best practices for minimizing kitchen waste at POL-KOLE:\n\n" +
                            "• **First-In, First-Out (FIFO):** Regularly rotate fresh dairy, seafood, and produce in the central cold room.\n" +
                            "• **Batch Cooking Calibration:** Check daily guest forecasts and prepare perishable sauces in smaller controlled batches.\n" +
                            "• **Menu Repurposing:** Utilize remaining fresh ingredients in daily soup or chef special promotions.")
                    .type("ANSWER")
                    .conversationId(convId)
                    .build();
        }

        // 6. Data-driven RMS queries
        DateRangeResolver.DateRange dr = DateRangeResolver.resolve(query);

        if (q.contains("least") && (q.contains("beverage") || q.contains("drink"))) {
            List<ItemSalesDto> items = reportService.getItemSalesReport("Ceylon Tea & Beverages", dr.getStartDate(), dr.getEndDate(), SortDirection.ASC, 1);
            if (!items.isEmpty()) {
                ItemSalesDto it = items.get(0);
                return AiChatResponse.builder()
                        .message(it.getItemName() + " is the least-selling beverage (" + dr.getLabel() + ") with " + it.getQuantitySold() + " units sold.")
                        .type("ANSWER")
                        .conversationId(convId)
                        .build();
            }
        } else if (q.contains("top") || q.contains("most")) {
            List<ItemSalesDto> items = reportService.getItemSalesReport(null, dr.getStartDate(), dr.getEndDate(), SortDirection.DESC, 1);
            if (!items.isEmpty()) {
                ItemSalesDto it = items.get(0);
                return AiChatResponse.builder()
                        .message(it.getItemName() + " sold the most (" + dr.getLabel() + ") with " + it.getQuantitySold() + " units sold (Total: Rs. " + String.format("%,.2f", it.getTotalRevenue()) + ").")
                        .type("ANSWER")
                        .conversationId(convId)
                        .build();
            }
        } else if (q.contains("revenue") || q.contains("sales") || q.contains("income")) {
            SalesReportDto sales = reportService.getSalesReport(dr.getStartDate(), dr.getEndDate());
            return AiChatResponse.builder()
                    .message("Total Net Revenue for " + dr.getLabel() + " is Rs. " + String.format("%,.2f", sales.getNetRevenue()) + " across " + sales.getTotalOrders() + " orders.")
                    .type(isReportGenerationRequest(query) ? "REPORT" : "ANSWER")
                    .reportUrl("/api/ai/reports/pdf?startDate=" + dr.getStartDate() + "&endDate=" + dr.getEndDate())
                    .conversationId(convId)
                    .build();
        }

        SalesReportDto sales = reportService.getSalesReport(dr.getStartDate(), dr.getEndDate());
        return AiChatResponse.builder()
                .message("Summary for " + dr.getLabel() + ": Net Revenue is Rs. " + String.format("%,.2f", sales.getNetRevenue()) + ", Total Orders: " + sales.getTotalOrders() + ", Dine-in: Rs. " + String.format("%,.2f", sales.getDineInRevenue()) + ", Takeaway: Rs. " + String.format("%,.2f", sales.getTakeawayRevenue()) + ".")
                .type("ANSWER")
                .conversationId(convId)
                .build();
    }
}
