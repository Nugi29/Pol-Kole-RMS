package com.rms.polkole.service;

import com.rms.polkole.dto.LoginDTO;
import com.rms.polkole.dto.LoginResponseDTO;
import com.rms.polkole.dto.UserDTO;


public interface UserService {

    String register(UserDTO dto);

    LoginResponseDTO login(LoginDTO dto);

    UserDTO getCurrentAuthenticatedUser();
}