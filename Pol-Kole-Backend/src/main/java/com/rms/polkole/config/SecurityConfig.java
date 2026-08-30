package com.rms.polkole.config;

import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Value("${app.cors.allowed-origins:}")
    private String allowedOrigins;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(AbstractHttpConfigurer::disable)
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint((request, response, authException) -> {
                            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                            response.getWriter().write("{\"status\": 401, \"error\": \"Unauthorized\", \"message\": \""
                                    + (authException.getMessage() != null ? authException.getMessage() : "Full authentication is required to access this resource")
                                    + "\"}");
                        })
                        .accessDeniedHandler((request, response, accessDeniedException) -> {
                            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                            response.getWriter().write("{\"status\": 403, \"error\": \"Forbidden\", \"message\": \"Access denied\"}");
                        })
                )
                .authorizeHttpRequests(auth -> auth
                        // ================= CORS & SYSTEM =================
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/error").permitAll()

                        // ================= PUBLIC AUTHENTICATION =================
                        .requestMatchers(HttpMethod.POST, "/api/user/login").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/user/register").permitAll()

                        // ================= WEBSOCKET & API DOCS =================
                        .requestMatchers("/ws/**", "/ws-stomp/**").permitAll()
                        .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()

                        // ================= ALL PROJECT MODULE URLS (ONE BY ONE) =================
                        // 1. User Management (/api/user)
                        .requestMatchers("/api/user/test").authenticated()
                        .requestMatchers("/api/user/profile").authenticated()
                        .requestMatchers("/api/user/get-all").authenticated()
                        .requestMatchers("/api/user/update/**").authenticated()
                        .requestMatchers("/api/user/delete/**").authenticated()
                        .requestMatchers("/api/user/**").authenticated()

                        // 2. Lookup Lists (/api/list)
                        .requestMatchers("/api/list/user-roles").authenticated()
                        .requestMatchers("/api/list/user-statuses").authenticated()
                        .requestMatchers("/api/list/**").authenticated()

                        // 3. Tables & Table Locations (/api/tables, /api/table-locations)
                        .requestMatchers("/api/tables/**").authenticated()
                        .requestMatchers("/api/table-locations/**").authenticated()

                        // 4. Room Management (/api/rooms)
                        .requestMatchers("/api/rooms/types/**").authenticated()
                        .requestMatchers("/api/rooms/**").authenticated()

                        // 5. Menu Management (/api/menu)
                        .requestMatchers("/api/menu/categories/**").authenticated()
                        .requestMatchers("/api/menu/items/**").authenticated()
                        .requestMatchers("/api/menu/**").authenticated()

                        // 6. Orders Management (/api/orders)
                        .requestMatchers("/api/orders/**").authenticated()

                        // 7. Kitchen Orders (/api/kitchen)
                        .requestMatchers("/api/kitchen/orders/**").authenticated()
                        .requestMatchers("/api/kitchen/**").authenticated()

                        // 8. Reservations Management (/api/reservations, /api/hotel-reservations)
                        .requestMatchers("/api/reservations/**").authenticated()
                        .requestMatchers("/api/hotel-reservations/**").authenticated()

                        // 9. Check-In & Check-Out (/api/check-in-out)
                        .requestMatchers("/api/check-in-out/**").authenticated()

                        // 10. Billing & Payments (/api/invoices, /api/payments)
                        .requestMatchers("/api/invoices/**").authenticated()
                        .requestMatchers("/api/payments/**").authenticated()

                        // 11. Customer Management (/api/customers)
                        .requestMatchers("/api/customers/**").authenticated()

                        // 12. Inventory Management (/api/inventory)
                        .requestMatchers("/api/inventory/**").authenticated()

                        // 13. Discounts & Vouchers (/api/item-discounts, /api/vouchers)
                        .requestMatchers("/api/item-discounts/**").authenticated()
                        .requestMatchers("/api/vouchers/**").authenticated()

                        // 14. Staff Assignments & Notifications (/api/staff-assignments, /api/staff-notifications)
                        .requestMatchers("/api/staff-assignments/**").authenticated()
                        .requestMatchers("/api/staff-notifications/**").authenticated()

                        // 15. Attendance & Presence Tracking (/api/attendance, /api/presence)
                        .requestMatchers("/api/attendance/**").authenticated()
                        .requestMatchers("/api/presence/**").authenticated()

                        // 16. Dashboard & Analytics (/api/dashboard)
                        .requestMatchers("/api/dashboard/**").authenticated()

                        // 17. Audit Logs (/api/audit-logs)
                        .requestMatchers("/api/audit-logs/**").authenticated()

                        // 18. Code Generator (/api/codes)
                        .requestMatchers("/api/codes/**").authenticated()

                        // ================= FALLBACK =================
                        .anyRequest().authenticated()
                )
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(parseAllowedOrigins());
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-Requested-With", "Accept", "Origin", "Access-Control-Request-Method", "Access-Control-Request-Headers"));
        configuration.setExposedHeaders(List.of("Access-Control-Allow-Origin", "Access-Control-Allow-Credentials"));
        configuration.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    private List<String> parseAllowedOrigins() {
        if (allowedOrigins == null || allowedOrigins.isBlank()) {
            return List.of("http://localhost:4200", "http://localhost:3000", "http://127.0.0.1:4200");
        }

        return Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isEmpty())
                .collect(Collectors.toList());
    }
}
