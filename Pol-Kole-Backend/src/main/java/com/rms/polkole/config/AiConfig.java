package com.rms.polkole.config;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.ai.openai.api.OpenAiApi;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class AiConfig {

    @Value("${GROQ_API_KEY:${spring.ai.openai.api-key:gsk_placeholder}}")
    private String apiKey;

    @Value("${GROQ_BASE_URL:${spring.ai.openai.base-url:https://api.groq.com/openai}}")
    private String baseUrl;

    @Value("${GROQ_MODEL:${spring.ai.openai.chat.options.model:openai/gpt-oss-20b}}")
    private String model;

    @Bean
    public OpenAiApi openAiApi() {
        return new OpenAiApi(baseUrl, apiKey);
    }

    @Bean
    public OpenAiChatModel openAiChatModel(OpenAiApi openAiApi) {
        OpenAiChatOptions options = OpenAiChatOptions.builder()
                .model(model)
                .temperature(0.1)
                .build();
        return OpenAiChatModel.builder()
                .openAiApi(openAiApi)
                .defaultOptions(options)
                .build();
    }

    @Bean
    public ChatClient.Builder chatClientBuilder(OpenAiChatModel chatModel) {
        return ChatClient.builder(chatModel);
    }
}
