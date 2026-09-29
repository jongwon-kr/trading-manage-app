package io.tbill.backendapi.domain.user.entity;

/** 권한. 관리자 지정은 db/manual SQL 로 한다 (UPDATE users SET role='ADMIN' WHERE email=…) */
public enum UserRole {
    USER,
    ADMIN
}
