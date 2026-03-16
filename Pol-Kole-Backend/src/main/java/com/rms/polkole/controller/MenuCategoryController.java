package com.rms.polkole.controller;

import com.rms.polkole.dto.MenuCategoryDTO;
import com.rms.polkole.service.MenuCategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@CrossOrigin
@RequiredArgsConstructor
@RequestMapping("/menu-categories")
public class MenuCategoryController {
    private final MenuCategoryService service;


    @GetMapping()
    public List<MenuCategoryDTO> getAll(){
        return service.getAllMenuCategories();
    }

}
