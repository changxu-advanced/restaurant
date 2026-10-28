package com.advn.restaurantops.shared;

import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiExceptionHandler {
    public record ApiError(String code, String message, Map<String, String> fieldErrors, String recoveryAction, String traceId) {}

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ApiError> validation(MethodArgumentNotValidException exception, HttpServletRequest request) {
        var errors = exception.getBindingResult().getFieldErrors().stream().collect(
                java.util.stream.Collectors.toMap(e -> e.getField(), e -> e.getDefaultMessage() == null ? "invalid" : e.getDefaultMessage(), (a, b) -> a));
        return ResponseEntity.badRequest().body(new ApiError("VALIDATION_FAILED", "入力内容を確認してください。", errors, "該当項目を修正して再度保存してください。", traceId(request)));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    ResponseEntity<ApiError> business(IllegalArgumentException exception, HttpServletRequest request) {
        return ResponseEntity.unprocessableEntity().body(new ApiError("BUSINESS_RULE_VIOLATION", exception.getMessage(), Map.of(), "条件を確認してから再試行してください。", traceId(request)));
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ApiError> unexpected(Exception exception, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(new ApiError("UNEXPECTED_ERROR", "処理を完了できませんでした。", Map.of(), "入力内容は保持されています。しばらくして再試行してください。", traceId(request)));
    }

    private String traceId(HttpServletRequest request) {
        return java.util.Optional.ofNullable(request.getHeader("X-Trace-Id")).orElseGet(() -> UUID.randomUUID().toString());
    }
}

