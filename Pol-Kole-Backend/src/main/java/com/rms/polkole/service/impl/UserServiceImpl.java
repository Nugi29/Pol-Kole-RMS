package com.rms.polkole.service.impl;

import com.rms.polkole.dto.FullUser;
import com.rms.polkole.dto.Login;
import com.rms.polkole.dto.LoginResponse;
import com.rms.polkole.dto.Lookup;
import com.rms.polkole.dto.User;
import com.rms.polkole.entity.UserEntity;
import com.rms.polkole.repository.UserRepository;
import com.rms.polkole.repository.UserroleRepository;
import com.rms.polkole.repository.UserstatusRepository;
import com.rms.polkole.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import com.rms.polkole.service.UserService;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService{

    private final UserRepository userRepository;
    private final UserroleRepository roleRepository;
    private final UserstatusRepository statusRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    @Override
    @Transactional
    public String register(User dto) {
        if (userRepository.findByEmail(dto.getEmail()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "User already exists with email: " + dto.getEmail());
        }

        UserEntity user = UserEntity.builder()
                .name(dto.getName())
                .email(dto.getEmail())
                .phone(normalizePhone(dto.getPhone()))
                .password(passwordEncoder.encode(dto.getPassword()))
                .build();

        if (dto.getRole() != null && !dto.getRole().isBlank()) {
            user.setRole(roleRepository.findByNameIgnoreCase(dto.getRole())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid role: " + dto.getRole())));
        }
        if (dto.getStatus() != null && !dto.getStatus().isBlank()) {
            user.setStatus(statusRepository.findByNameIgnoreCase(dto.getStatus())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid status: " + dto.getStatus())));
        }

        userRepository.saveAndFlush(user);
        return "User registered successfully";
    }

    @Override
    @Transactional(readOnly = true)
    public LoginResponse login(Login dto) {
        UserEntity user = userRepository.findByEmail(dto.getEmail())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password"));

        if (!passwordEncoder.matches(dto.getPassword(), user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }

        String token = jwtUtil.generateToken(user.getEmail());

        return LoginResponse.builder()
                .token(token)
                .userId(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole() != null ? user.getRole().getName() : null)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public User getCurrentAuthenticatedUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "No authenticated user found");
        }

        String email = authentication.getName();
        UserEntity user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found with email: " + email));

        return User.builder()
                .name(user.getName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .password(null)
                .role(user.getRole() != null ? user.getRole().getName() : null)
                .status(user.getStatus() != null ? user.getStatus().getName() : null)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public User getUserById(Integer id) {
        UserEntity user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found with id: " + id));

        return User.builder()
                .name(user.getName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .password(null)
                .role(user.getRole() != null ? user.getRole().getName() : null)
                .status(user.getStatus() != null ? user.getStatus().getName() : null)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<FullUser> getAllUserDtos() {
        return userRepository.findAll().stream()
                .map(this::toFullUser)
                .toList();
    }

    @Override
    @Transactional
    public User updateUser(Integer id, User updateUser) {
        UserEntity user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found with id: " + id));

        if (updateUser.getName() != null && !updateUser.getName().isBlank()) {
            user.setName(updateUser.getName());
        }

        if (updateUser.getEmail() != null && !updateUser.getEmail().isBlank()) {
            userRepository.findByEmail(updateUser.getEmail())
                    .filter(existingUser -> !existingUser.getId().equals(id))
                    .ifPresent(existingUser -> {
                        throw new ResponseStatusException(HttpStatus.CONFLICT, "User already exists with email: " + updateUser.getEmail());
                    });
            user.setEmail(updateUser.getEmail());
        }

        if (updateUser.getPassword() != null && !updateUser.getPassword().isBlank()) {
            user.setPassword(passwordEncoder.encode(updateUser.getPassword()));
        }

        if (updateUser.getPhone() != null) {
            user.setPhone(normalizePhone(updateUser.getPhone()));
        }

        if (updateUser.getRole() != null && !updateUser.getRole().isBlank()) {
            user.setRole(roleRepository.findByNameIgnoreCase(updateUser.getRole())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid role: " + updateUser.getRole())));
        }

        if (updateUser.getStatus() != null && !updateUser.getStatus().isBlank()) {
            user.setStatus(statusRepository.findByNameIgnoreCase(updateUser.getStatus())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid status: " + updateUser.getStatus())));
        }

        userRepository.saveAndFlush(user);

        return User.builder()
                .name(user.getName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .password(null)
                .role(user.getRole() != null ? user.getRole().getName() : null)
                .status(user.getStatus() != null ? user.getStatus().getName() : null)
                .build();
    }

    @Override
    @Transactional
    public void deleteUser(Integer id) {
        if (!userRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found with id: " + id);
        }
        userRepository.deleteById(id);
    }

    private FullUser toFullUser(UserEntity user) {
        return FullUser.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .createdOn(user.getCreatedAt())
                .updatedOn(user.getUpdatedAt())
                .role(user.getRole() != null ? toLookup(user.getRole()) : null)
                .status(user.getStatus() != null ? toLookup(user.getStatus()) : null)
                .build();
    }

    private Lookup toLookup(com.rms.polkole.entity.UserroleEntity role) {
        return new Lookup(role.getId(), role.getName());
    }

    private Lookup toLookup(com.rms.polkole.entity.UserstatusEntity status) {
        return new Lookup(status.getId(), status.getName());
    }

    private String normalizePhone(String phone) {
        if (phone == null) {
            return null;
        }

        String trimmed = phone.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}

