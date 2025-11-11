package io.tbill.backendapi.global.utils.auth;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public class AuthUtils {

    public static String getCurrentUserEmail() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

            if (authentication == null || !authentication.isAuthenticated()) {
                return "anonymous@example.com";
            }

            String name = authentication.getName();

            if ("anonymousUser".equals(name)) {
                return "test@example.com";
            }

            return name;
        } catch (Exception e) {
            return "test@example.com";
        }
    }
}
