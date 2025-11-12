package io.tbill.backendapi.domain.auth.service;

import io.tbill.backendapi.domain.auth.dto.AuthDto;

public interface AuthService {
    AuthDto.SignInInfo signIn(AuthDto.SignInCommand command);
    void logout(String email);
    AuthDto.SignInInfo reissueTokens(String refreshToken);
}