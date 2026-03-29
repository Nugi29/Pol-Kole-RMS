package com.rms.polkole.service;

import com.rms.polkole.dto.LoginDTO;
import com.rms.polkole.dto.LoginResponseDTO;
import com.rms.polkole.dto.FullUserDTO;
import com.rms.polkole.dto.UserDTO;

import java.util.List;


public interface UserService {

    String register(UserDTO dto);
    LoginResponseDTO login(LoginDTO dto);
    UserDTO getCurrentAuthenticatedUser();


    UserDTO getUserById(Integer id);
    List<FullUserDTO> getAllUserDtos();
    UserDTO updateUser(Integer id, UserDTO updateUser);
    void deleteUser(Integer id);
}