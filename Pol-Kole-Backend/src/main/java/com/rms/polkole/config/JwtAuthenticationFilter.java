package com.rms.polkole.config;

import com.rms.polkole.util.JwtUtil;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.MalformedJwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getServletPath();
        if (path == null || path.isBlank()) {
            path = request.getRequestURI();
        }
        return path.equals("/api/user/login")
                || path.equals("/api/user/register")
                || (path.startsWith("/api/settings") && "GET".equalsIgnoreCase(request.getMethod()))
                || path.startsWith("/error")
                || path.startsWith("/ws")
                || path.startsWith("/swagger-ui")
                || path.startsWith("/v3/api-docs");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        final String authorizationHeader = request.getHeader("Authorization");
        String email = null;
        String jwt = null;

        if (authorizationHeader != null && authorizationHeader.startsWith("Bearer ")) {
            jwt = authorizationHeader.substring(7).trim();
            if (!jwt.isEmpty() && !"null".equalsIgnoreCase(jwt) && !"undefined".equalsIgnoreCase(jwt)) {
                try {
                    email = jwtUtil.extractEmail(jwt);
                } catch (ExpiredJwtException e) {
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                    response.getWriter().write("{\"status\": 401, \"error\": \"Unauthorized\", \"message\": \"JWT Token expired\"}");
                    return;
                } catch (MalformedJwtException e) {
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                    response.getWriter().write("{\"status\": 401, \"error\": \"Unauthorized\", \"message\": \"Invalid JWT Token\"}");
                    return;
                } catch (Exception e) {
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                    response.getWriter().write("{\"status\": 401, \"error\": \"Unauthorized\", \"message\": \"Invalid or unparseable JWT Token: " + e.getMessage() + "\"}");
                    return;
                }
            }
        }

        if (email != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            // Validate token
            if (jwtUtil.validateToken(jwt, email)) {
                String role = jwtUtil.extractRole(jwt);
                List<SimpleGrantedAuthority> authorities = new ArrayList<>();
                if (role != null && !role.isBlank()) {
                    String formattedRole = role.trim().toUpperCase();
                    if (!formattedRole.startsWith("ROLE_")) {
                        formattedRole = "ROLE_" + formattedRole;
                    }
                    authorities.add(new SimpleGrantedAuthority(formattedRole));
                }
                UsernamePasswordAuthenticationToken authToken =
                        new UsernamePasswordAuthenticationToken(email, null, authorities);
                authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authToken);
            }
        }

        filterChain.doFilter(request, response);
    }
}
