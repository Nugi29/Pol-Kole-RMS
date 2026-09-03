package com.rms.polkole.service.impl;

import com.rms.polkole.dto.Login;
import com.rms.polkole.dto.LoginResponse;
import com.rms.polkole.dto.FullUser;
import com.rms.polkole.dto.Lookup;
import com.rms.polkole.dto.User;
import com.rms.polkole.entity.UserEntity;
import com.rms.polkole.entity.UserroleEntity;
import com.rms.polkole.entity.UserstatusEntity;
import com.rms.polkole.repository.UserRepository;
import com.rms.polkole.repository.UserroleRepository;
import com.rms.polkole.repository.UserstatusRepository;
import com.rms.polkole.service.UserService;
import com.rms.polkole.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.modelmapper.ModelMapper;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final UserroleRepository roleRepository;
    private final UserstatusRepository statusRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final ModelMapper modelMapper;

    @Override
    @Transactional
    public String register(User request) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already in use");
        }

        UserroleEntity role = roleRepository.findByNameIgnoreCase(request.getRole())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Role not found: " + request.getRole()));

        UserstatusEntity status = statusRepository.findByNameIgnoreCase(request.getStatus())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Status not found: " + request.getStatus()));

        UserEntity user = UserEntity.builder()
                .name(request.getName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .phone(request.getPhone())
                .role(role)
                .status(status)
                .onlineStatus("OFFLINE")
                .build();

        userRepository.save(user);
        return "User registered successfully";
    }

    @Override
    @Transactional
    public LoginResponse login(Login request) {
        UserEntity user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            if (!request.getPassword().equals(user.getPassword())) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
            }
        }

        user.setOnlineStatus("ONLINE");
        user.setLastSeen(Instant.now());
        userRepository.save(user);

        String roleName = user.getRole() != null ? user.getRole().getName() : "Staff";
        String token = jwtUtil.generateToken(user.getEmail(), roleName);

        return LoginResponse.builder()
                .token(token)
                .userId(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(roleName)
                .onlineStatus(user.getOnlineStatus())
                .lastSeen(user.getLastSeen())
                .build();
    }

    @Override
    public User getCurrentAuthenticatedUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "No authenticated user");
        }

        UserEntity user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Authenticated user not found"));

        return modelMapper.map(user, User.class);
    }

    @Override
    public User getUserById(Integer id) {
        UserEntity user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found with ID: " + id));
        return modelMapper.map(user, User.class);
    }

    @Override
    public List<FullUser> getAllUserDtos() {
        return userRepository.findAll().stream()
                .map(u -> FullUser.builder()
                        .id(u.getId())
                        .name(u.getName())
                        .email(u.getEmail())
                        .phone(u.getPhone())
                        .createdOn(u.getCreatedAt())
                        .updatedOn(u.getUpdatedAt())
                        .role(u.getRole() != null ? new Lookup(u.getRole().getId(), u.getRole().getName()) : null)
                        .status(u.getStatus() != null ? new Lookup(u.getStatus().getId(), u.getStatus().getName()) : null)
                        .onlineStatus(u.getOnlineStatus() != null ? u.getOnlineStatus() : "OFFLINE")
                        .lastSeen(u.getLastSeen())
                        .build())
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public User updateUser(Integer id, User request) {
        UserEntity user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found: " + id));

        user.setName(request.getName());
        user.setPhone(request.getPhone());
        user.setEmail(request.getEmail());

        if (request.getRole() != null) {
            UserroleEntity role = roleRepository.findByNameIgnoreCase(request.getRole())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Role not found: " + request.getRole()));
            user.setRole(role);
        }

        if (request.getStatus() != null) {
            UserstatusEntity status = statusRepository.findByNameIgnoreCase(request.getStatus())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Status not found: " + request.getStatus()));
            user.setStatus(status);
        }

        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            user.setPassword(passwordEncoder.encode(request.getPassword()));
        }

        userRepository.save(user);
        return modelMapper.map(user, User.class);
    }

    @Override
    @Transactional
    public void deleteUser(Integer id) {
        userRepository.deleteById(id);
    }
}
