package com.rms.polkole.service.impl;

import com.rms.polkole.dto.LoginDTO;
import com.rms.polkole.dto.LoginResponseDTO;
import com.rms.polkole.dto.UserDTO;
import com.rms.polkole.entity.User;
import com.rms.polkole.entity.Userrole;
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
    public String register(UserDTO dto) {
        if (userRepository.findByEmail(dto.getEmail()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "User already exists with email: " + dto.getEmail());
        }

        String requestedRole = dto.getRole() == null ? "USER" : dto.getRole().trim();
        Userrole role = roleRepository.findByNameIgnoreCase(requestedRole)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid role: " + requestedRole));

        User user = User.builder()
                .name(dto.getName())
                .email(dto.getEmail())
                .password(passwordEncoder.encode(dto.getPassword()))
                .role(role)
                .build();

        userRepository.save(user);
        return "User registered successfully";
    }

    @Override
    public LoginResponseDTO login(LoginDTO dto) {
        User user = userRepository.findByEmail(dto.getEmail())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password"));

        if (!passwordEncoder.matches(dto.getPassword(), user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }

        String token = jwtUtil.generateToken(user.getEmail());

        return LoginResponseDTO.builder()
                .token(token)
                .userId(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole() != null ? user.getRole().getName() : null)
                .build();
    }

    @Override
    public UserDTO getCurrentAuthenticatedUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "No authenticated user found");
        }

        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found with email: " + email));

        return UserDTO.builder()
                .name(user.getName())
                .email(user.getEmail())
                .password(null)
                .role(user.getRole() != null ? user.getRole().getName() : null)
                .build();
    }

    @Override
    public UserDTO getUserById(Integer id) {
        return null;
    }

    @Override
    public List<UserDTO> getAllUserDtos() {
        List<User> users = userRepository.findAll();

        return users.stream()
                .map(user -> {
                    UserDTO dto = modelMapper.map(user, UserDTO.class);
                    // Handle manual overrides if names don't match exactly
                    dto.setPassword(null);
                    if (user.getRole() != null) {
                        dto.setRole(user.getRole().getName());
                    }
                    return dto;
                })
                .toList();}
    @Override
    public UserDTO updateUser(Integer id, UserDTO updateUser) {
        return null;
    }

    @Override
    public void deleteUser(Integer id) {

    }
}