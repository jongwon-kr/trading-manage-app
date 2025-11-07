package io.tbill.backendapi.presentation.user.controller;

import io.tbill.backendapi.domain.user.dto.UserDto;
import io.tbill.backendapi.domain.user.service.UserService;
import io.tbill.backendapi.presentation.user.dto.UserApiDto;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService; // domain.service 주입

    /**
     * 회원 가입 API
     * [POST] /api/users/sign-up
     */
    @PostMapping("/sign-up") // (경로 수정: /sign-up)
    public ResponseEntity<UserApiDto.UserResponse> signUp(
            @RequestBody UserApiDto.SignUpRequest request // 1. Presentation DTO로 받음
    ) {
        // 2. Presentation DTO -> Domain DTO(Command)로 변환
        UserDto.SignUpCommand command = request.toCommand();

        // 3. Domain Service 호출
        UserDto.UserInfo userInfo = userService.signUp(command);

        // 4. Domain DTO(Info) -> Presentation DTO(Response)로 변환
        UserApiDto.UserResponse response = new UserApiDto.UserResponse(userInfo);

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * 사용자 정보 조회 API (인증 필요)
     * [GET] /api/users/me
     * (예시: 인증된 사용자 본인 정보 조회)
     */
    // @GetMapping("/me")
    // @PreAuthorize("isAuthenticated()") // (예시) 인증된 사용자만
    // public ResponseEntity<UserApiDto.UserResponse> getMyInfo(
    //         @AuthenticationPrincipal CustomUserDetails userDetails
    // ) {
    //     UserDto.UserInfo userInfo = userService.getUserById(userDetails.getUser().getId());
    //     return ResponseEntity.ok(new UserApiDto.UserResponse(userInfo));
    // }
}