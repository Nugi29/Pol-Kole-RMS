package com.rms.polkole.service;

import com.rms.polkole.dto.*;

import java.util.List;


public interface LookupService {

    List<LookupDTO> getAllUserRoles();
    List<LookupDTO> getAllUserStatuses();
    List<LookupDTO> getAllMenuCategories();
}