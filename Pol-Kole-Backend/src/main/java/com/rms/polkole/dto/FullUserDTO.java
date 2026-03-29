package com.rms.polkole.dto;


import com.rms.polkole.entity.Userrole;
import com.rms.polkole.entity.Userstatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class FullUserDTO {
    private Integer id;
    private String name;
    private String email;
    private String phone;
    private LookupDTO status;
    private LookupDTO role;
}