package com.rms.polkole.service;

import com.rms.polkole.dto.CustomerDto;
import com.rms.polkole.entity.CustomerEntity;
import org.springframework.data.domain.Page;

public interface CustomerService {
    CustomerDto createCustomer(CustomerDto customerDto);
    CustomerDto updateCustomer(Integer id, CustomerDto customerDto);
    void deleteCustomer(Integer id);
    CustomerDto getCustomerById(Integer id);
    Page<CustomerDto> searchCustomers(String search, int page, int size);
    CustomerEntity getCustomerEntityById(Integer id);
}
