package com.rms.polkole.service.impl;

import com.rms.polkole.dto.CustomerDto;
import com.rms.polkole.entity.CustomerEntity;
import com.rms.polkole.repository.CustomerRepository;
import com.rms.polkole.service.CustomerService;
import lombok.RequiredArgsConstructor;
import org.modelmapper.ModelMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class CustomerServiceImpl implements CustomerService {

    private final CustomerRepository customerRepository;
    private final ModelMapper mapper;

    @Override
    @Transactional
    public CustomerDto createCustomer(CustomerDto dto) {
        if (customerRepository.findByNicPassport(dto.getNicPassport()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Passport/NIC number already registered: " + dto.getNicPassport());
        }

        CustomerEntity customer = CustomerEntity.builder()
                .name(dto.getName())
                .nicPassport(dto.getNicPassport())
                .email(dto.getEmail())
                .phone(dto.getPhone())
                .address(dto.getAddress())
                .nationality(dto.getNationality())
                .loyaltyPoints(0)
                .build();

        customer = customerRepository.save(customer);
        return mapper.map(customer, CustomerDto.class);
    }

    @Override
    @Transactional
    public CustomerDto updateCustomer(Integer id, CustomerDto dto) {
        CustomerEntity customer = customerRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Customer not found with ID: " + id));

        customerRepository.findByNicPassport(dto.getNicPassport())
                .filter(existing -> !existing.getId().equals(id))
                .ifPresent(existing -> {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "Passport/NIC number already registered: " + dto.getNicPassport());
                });

        customer.setName(dto.getName());
        customer.setNicPassport(dto.getNicPassport());
        customer.setEmail(dto.getEmail());
        customer.setPhone(dto.getPhone());
        customer.setAddress(dto.getAddress());
        customer.setNationality(dto.getNationality());

        customer = customerRepository.save(customer);
        return mapper.map(customer, CustomerDto.class);
    }

    @Override
    @Transactional
    public void deleteCustomer(Integer id) {
        CustomerEntity customer = customerRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Customer not found with ID: " + id));
        customerRepository.delete(customer);
    }

    @Override
    @Transactional(readOnly = true)
    public CustomerDto getCustomerById(Integer id) {
        CustomerEntity customer = customerRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Customer not found with ID: " + id));
        return mapper.map(customer, CustomerDto.class);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<CustomerDto> searchCustomers(String search, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("name").ascending());
        Page<CustomerEntity> customers = customerRepository.searchCustomers(search, pageable);
        return customers.map(c -> mapper.map(c, CustomerDto.class));
    }

    @Override
    @Transactional(readOnly = true)
    public CustomerEntity getCustomerEntityById(Integer id) {
        return customerRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Customer not found with ID: " + id));
    }
}
