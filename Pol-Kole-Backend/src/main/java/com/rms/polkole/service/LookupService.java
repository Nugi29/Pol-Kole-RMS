package com.rms.polkole.service;

import com.rms.polkole.dto.*;

import java.util.List;


public interface LookupService {

    List<Lookup> getAllUserRoles();
    List<Lookup> getAllUserStatuses();
    List<Lookup> getAllMenuCategories();
}
