package io.tbill.backendapi.domain.user.service;

import io.tbill.backendapi.domain.user.dto.UserDto;

public interface UserService {


    UserDto.UserInfo signUp(UserDto.SignUpCommand command);

    UserDto.UserInfo getUserById(Long userId);
}
