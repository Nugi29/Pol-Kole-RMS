package com.rms.polkole.controller;

import com.rms.polkole.dto.LoginDTO;
import com.rms.polkole.dto.LoginResponseDTO;
import com.rms.polkole.dto.FullUserDTO;
import com.rms.polkole.dto.UserDTO;
import com.rms.polkole.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
//@CrossOrigin(origins = "http://localhost:4200")
@CrossOrigin()
public class UserController {

    private final UserService userService;

    @GetMapping("/test")
    public String test() {
        return "Hello from secured endpoint Pol-Kole!";
    }

    @PostMapping("/register")
    public ResponseEntity<String> register(@RequestBody UserDTO request) {
        return ResponseEntity.ok(userService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponseDTO> login(@RequestBody LoginDTO request) {
        return ResponseEntity.ok(userService.login(request));
    }

    @GetMapping("/profile")
    public ResponseEntity<UserDTO> getProfile() {
        return ResponseEntity.ok(userService.getCurrentAuthenticatedUser());
    }

    @GetMapping("/get-all")
    public ResponseEntity<List<FullUserDTO>> getAllUsers() {
        return ResponseEntity.ok( userService.getAllUserDtos());
    }

}
