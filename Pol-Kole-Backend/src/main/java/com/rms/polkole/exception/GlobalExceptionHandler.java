package com.rms.polkole.exception;

import com.rms.polkole.dto.ApiResponse;
import org.apache.catalina.connector.ClientAbortException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotWritableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.async.AsyncRequestNotUsableException;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler({ClientAbortException.class, AsyncRequestNotUsableException.class})
    public void handleClientAbort(Exception ex) {
        // Client aborted / closed the connection before the response finished transferring.
        // The socket is already closed; do not attempt to write to it.
    }

    @ExceptionHandler(HttpMessageNotWritableException.class)
    public ResponseEntity<ApiResponse<Object>> handleHttpMessageNotWritableException(HttpMessageNotWritableException ex) {
        Throwable cause = ex.getCause();
        while (cause != null) {
            if (cause instanceof ClientAbortException
                    || cause instanceof AsyncRequestNotUsableException
                    || (cause.getMessage() != null && cause.getMessage().contains("aborted by the software in your host machine"))) {
                // Client aborted the connection while writing JSON output
                return null;
            }
            cause = cause.getCause();
        }
        ex.printStackTrace();
        ApiResponse<Object> response = ApiResponse.error("Failed to write JSON response: " + ex.getMessage());
        return new ResponseEntity<>(response, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ApiResponse<Object>> handleResponseStatusException(ResponseStatusException ex) {
        ApiResponse<Object> response = ApiResponse.error(ex.getReason());
        return new ResponseEntity<>(response, ex.getStatusCode());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Map<String, String>>> handleValidationExceptions(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach((error) -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            errors.put(fieldName, errorMessage);
        });
        ApiResponse<Map<String, String>> response = ApiResponse.<Map<String, String>>builder()
                .success(false)
                .message("Validation failed")
                .data(errors)
                .timestamp(java.time.Instant.now())
                .build();
        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Object>> handleGenericException(Exception ex) {
        Throwable cause = ex;
        while (cause != null) {
            if (cause instanceof ClientAbortException
                    || cause instanceof AsyncRequestNotUsableException
                    || (cause.getMessage() != null && cause.getMessage().contains("aborted by the software in your host machine"))) {
                // Client closed connection, do not print stack trace or try to write response
                return null;
            }
            cause = cause.getCause();
        }

        ex.printStackTrace();
        ApiResponse<Object> response = ApiResponse.error(ex.getMessage() != null ? ex.getMessage() : "An unexpected error occurred");
        return new ResponseEntity<>(response, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
