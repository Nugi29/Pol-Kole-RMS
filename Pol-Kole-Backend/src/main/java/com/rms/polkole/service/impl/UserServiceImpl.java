package com.rms.polkole.service.impl;

import com.rms.polkole.dto.FullUser;
import com.rms.polkole.dto.Login;
import com.rms.polkole.dto.LoginResponse;
import com.rms.polkole.dto.User;
import com.rms.polkole.entity.UserEntity;
import com.rms.polkole.entity.UserroleEntity;
import com.rms.polkole.repository.UserRepository;
import com.rms.polkole.repository.UserroleRepository;
import com.rms.polkole.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.modelmapper.ModelMapper;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import com.rms.polkole.service.UserService;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService{

    private final UserRepository userRepository;
    private final UserroleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final ModelMapper modelMapper;

    @Override
    public String register(User dto) {
        if (userRepository.findByEmail(dto.getEmail()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "User already exists with email: " + dto.getEmail());
        }

        String requestedRole = dto.getRole() == null ? "USER" : dto.getRole().trim();
        UserroleEntity role = roleRepository.findByNameIgnoreCase(requestedRole)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid role: " + requestedRole));

        UserEntity user = UserEntity.builder()
                .name(dto.getName())
                .email(dto.getEmail())
                .password(passwordEncoder.encode(dto.getPassword()))
                .role(role)
                .build();

        userRepository.save(user);
        return "User registered successfully";
    }

    @Override
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
                .password(null)
                .role(user.getRole() != null ? user.getRole().getName() : null)
                .build();
    }

    @Override
    public User getUserById(Integer id) {
        return null;
    }

    @Override
    public List<FullUser> getAllUserDtos() {
        List<UserEntity> users = userRepository.findAll();

        return users.stream()
                .map(user -> {
                    FullUser dto = modelMapper.map(user, FullUser.class);
//                    dto.setRole(user.getRole() != null ? user.getRole().getName() : null);
//                    dto.setStatus(user.getStatus() != null ? user.getStatus().getName() : null);
                    return dto;
                })
                .toList();
    }
    @Override
    public User updateUser(Integer id, User updateUser) {
        return null;
    }

    @Override
    public void deleteUser(Integer id) {

    }
}

