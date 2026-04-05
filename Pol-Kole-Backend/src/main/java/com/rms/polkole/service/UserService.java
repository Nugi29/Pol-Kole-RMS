package com.rms.polkole.service;

import com.rms.polkole.dto.Login;
import com.rms.polkole.dto.LoginResponse;
import com.rms.polkole.dto.FullUser;
import com.rms.polkole.dto.User;

import java.util.List;


public interface UserService {

    String register(User dto);
    LoginResponse login(Login dto);
    User getCurrentAuthenticatedUser();


    User getUserById(Integer id);
    List<FullUser> getAllUserDtos();
    User updateUser(Integer id, User updateUser);
    void deleteUser(Integer id);
}

