package com.rms.polkole.controller;

import com.rms.polkole.dto.Lookup;
import com.rms.polkole.service.LookupService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@CrossOrigin
@RequiredArgsConstructor
@RequestMapping("api/list")
public class LookupController {

    private final LookupService service;

    @GetMapping("/menu-categories")
    public List<Lookup> getAllMenuCategories(){
        return service.getAllMenuCategories();
    }
    @GetMapping("/user-roles")
    public List<Lookup> getAllUserRoles(){
        return service.getAllUserRoles();
    }
    @GetMapping("/user-statuses")
    public List<Lookup> getAllUserstatuses(){
        return service.getAllUserStatuses();
    }


}

