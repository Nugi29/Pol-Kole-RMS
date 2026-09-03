package com.rms.polkole.exception;

import com.rms.polkole.dto.ApiResponse;
import org.apache.catalina.connector.ClientAbortException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.http.converter.HttpMessageNotWritableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.async.AsyncRequestNotUsableException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.Map;
import java.util.NoSuchElementException;

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
        String message = ex.getReason() != null ? ex.getReason() : (ex.getMessage() != null ? ex.getMessage() : "Error occurred");
        ApiResponse<Object> response = ApiResponse.error(message);
        return new ResponseEntity<>(response, ex.getStatusCode());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Map<String, String>>> handleValidationExceptions(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach((error) -> {
            String fieldName = error instanceof FieldError ? ((FieldError) error).getField() : error.getObjectName();
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

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ApiResponse<Object>> handleBadCredentialsException(BadCredentialsException ex) {
        ApiResponse<Object> response = ApiResponse.error("Invalid email or password");
        return new ResponseEntity<>(response, HttpStatus.UNAUTHORIZED);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Object>> handleAccessDeniedException(AccessDeniedException ex) {
        ApiResponse<Object> response = ApiResponse.error("Access denied: You do not have permission to access this resource");
        return new ResponseEntity<>(response, HttpStatus.FORBIDDEN);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiResponse<Object>> handleDataIntegrityViolationException(DataIntegrityViolationException ex) {
        String msg = "Database integrity constraint violation";
        if (ex.getRootCause() != null && ex.getRootCause().getMessage() != null) {
            String rootMsg = ex.getRootCause().getMessage();
            if (rootMsg.contains("Duplicate entry")) {
                msg = "A record with this identifier or unique attribute already exists";
            } else if (rootMsg.contains("foreign key constraint fails") || rootMsg.contains("Cannot delete or update a parent row")) {
                msg = "Cannot modify or delete this record because related data depends on it";
            }
        }
        ApiResponse<Object> response = ApiResponse.error(msg);
        return new ResponseEntity<>(response, HttpStatus.CONFLICT);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse<Object>> handleIllegalArgumentException(IllegalArgumentException ex) {
        ApiResponse<Object> response = ApiResponse.error(ex.getMessage() != null ? ex.getMessage() : "Invalid argument provided");
        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<ApiResponse<Object>> handleNoSuchElementException(NoSuchElementException ex) {
        ApiResponse<Object> response = ApiResponse.error(ex.getMessage() != null ? ex.getMessage() : "Requested resource was not found");
        return new ResponseEntity<>(response, HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiResponse<Object>> handleHttpMessageNotReadableException(HttpMessageNotReadableException ex) {
        ApiResponse<Object> response = ApiResponse.error("Malformed or missing JSON request body");
        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ApiResponse<Object>> handleMaxUploadSizeExceededException(MaxUploadSizeExceededException ex) {
        ApiResponse<Object> response = ApiResponse.error("File size exceeds the maximum allowed upload limit");
        return new ResponseEntity<>(response, HttpStatus.PAYLOAD_TOO_LARGE);
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
